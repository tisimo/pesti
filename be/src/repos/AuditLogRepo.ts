import { DeleteCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Service } from "typedi";
import AuditLog from "../domain/AuditLog";
import { docClient } from "../loaders/dynamo";
import AuditLogMapper from "../mappers/AuditLogMapper";
import IAuditLogRepo, { QueryLogsInput, QueryLogsResult } from "./IRepos/IAuditLogRepo";

@Service()
export default class AuditLogRepo implements IAuditLogRepo {
  private readonly tableName = "BO_Logs";
  private readonly maxScannedLogs = 50000;

  private buildFilters(input: QueryLogsInput) {
    const attrNames: Record<string, string> = {};
    const attrValues: Record<string, unknown> = {};
    const filterParts: string[] = [];

    if (input.actionIn?.length) {
      attrNames["#action"] = "action";
      const actionVars = input.actionIn.map((action, index) => {
        const key = `:action${index}`;
        attrValues[key] = action;
        return key;
      });
      filterParts.push(`#action IN (${actionVars.join(", ")})`);
    } else if (input.action) {
      attrNames["#action"] = "action";
      attrValues[":action"] = input.action;
      filterParts.push("#action = :action");
    }

    if (input.adminEmail) {
      attrNames["#adminEmail"] = "adminEmail";
      attrValues[":adminEmail"] = input.adminEmail;
      filterParts.push("contains(#adminEmail, :adminEmail)");
    }

    if (input.app) {
      const rawApp = String(input.app).trim();
      const lowerApp = rawApp.toLowerCase();
      const appSet = new Set([rawApp]);
      if (lowerApp === "only_just_causes" || lowerApp === "ojc" || lowerApp === "just_causes") {
        appSet.add("only_just_causes");
        appSet.add("ojc");
        appSet.add("just_causes");
      }

      const appVars = Array.from(appSet).map((appValue, index) => {
        const key = `:app${index}`;
        attrValues[key] = appValue;
        return key;
      });

      attrNames["#targetLabel"] = "targetLabel";
      attrNames["#details"] = "details";
      attrNames["#app"] = "app";
      filterParts.push(`(#targetLabel IN (${appVars.join(", ")}) OR #details.#app IN (${appVars.join(", ")}))`);
    }

    return { attrNames, attrValues, filterParts };
  }

  public async create(log: AuditLog): Promise<AuditLog> {
    const item = AuditLogMapper.toPersistence(log);
    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );
    return log;
  }

  public async query(input: QueryLogsInput): Promise<QueryLogsResult> {
    const limit = input.limit ?? 25;
    const page = input.page && input.page > 0 ? input.page : 1;
    const sortDir = input.sortDir === "asc" ? "asc" : "desc";

    // Query by specific admin user (main table, PK = adminUserId)
    if (input.adminUserId) {
      const { attrNames, attrValues, filterParts } = this.buildFilters(input);
      attrNames["#pk"] = "adminUserId";
      attrValues[":pk"] = input.adminUserId;

      let keyCondition = "#pk = :pk";

      if (input.fromDate || input.toDate) {
        attrNames["#sk"] = "timestamp#logId";
        if (input.fromDate && input.toDate) {
          keyCondition += " AND #sk BETWEEN :from AND :to";
          attrValues[":from"] = `${input.fromDate}T00:00:00.000Z#`;
          attrValues[":to"] = `${input.toDate}T23:59:59.999Z#\uFFFF`;
        } else if (input.fromDate) {
          keyCondition += " AND #sk >= :from";
          attrValues[":from"] = `${input.fromDate}T00:00:00.000Z#`;
        } else if (input.toDate) {
          keyCondition += " AND #sk <= :to";
          attrValues[":to"] = `${input.toDate}T23:59:59.999Z#\uFFFF`;
        }
      }

      const result = await docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: keyCondition,
          ExpressionAttributeNames: attrNames,
          ExpressionAttributeValues: attrValues,
          FilterExpression: filterParts.length ? filterParts.join(" AND ") : undefined,
          ScanIndexForward: sortDir === "asc",
          Limit: limit,
          ExclusiveStartKey: input.lastKey,
        }),
      );

      return {
        items: (result.Items || []).map(i => AuditLogMapper.toDomain(i as Record<string, unknown>)),
        lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
      };
    }

    // Full scan with in-memory sort + page slicing (backoffice-sized dataset)
    const fromTs = input.fromDate ? `${input.fromDate}T00:00:00.000Z` : undefined;
    const toTs = input.toDate ? `${input.toDate}T23:59:59.999Z` : undefined;

    const { attrNames, attrValues, filterParts } = this.buildFilters(input);

    if (fromTs) {
      attrNames["#ts"] = "timestamp";
      attrValues[":from"] = fromTs;
      filterParts.push("#ts >= :from");
    }
    if (toTs) {
      attrNames["#ts"] = "timestamp";
      attrValues[":to"] = toTs;
      filterParts.push("#ts <= :to");
    }

    const allItems: AuditLog[] = [];
    let cursor: Record<string, unknown> | undefined = undefined;

    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: filterParts.length ? filterParts.join(" AND ") : undefined,
          ExpressionAttributeNames: Object.keys(attrNames).length ? attrNames : undefined,
          ExpressionAttributeValues: Object.keys(attrValues).length ? attrValues : undefined,
          ExclusiveStartKey: cursor,
        }),
      );

      for (const item of result.Items ?? []) {
        allItems.push(AuditLogMapper.toDomain(item as Record<string, unknown>));
      }

      if (allItems.length > this.maxScannedLogs) {
        throw new Error("AUDIT_SCAN_LIMIT_EXCEEDED");
      }

      cursor = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (cursor);

    allItems.sort((a, b) =>
      sortDir === "asc"
        ? a.timestamp.localeCompare(b.timestamp)
        : b.timestamp.localeCompare(a.timestamp),
    );

    const totalItems = allItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const end = start + limit;

    return {
      items: allItems.slice(start, end),
      totalItems,
      totalPages,
      currentPage: safePage,
    };
  }

  public async attachIpToLoginSuccess(adminUserId: string, ipAddress: string): Promise<boolean> {
    const fromIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    let cursor: Record<string, unknown> | undefined;

    do {
      const result = await docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "#pk = :pk AND #sk >= :from",
          FilterExpression: "#action = :loginSuccess",
          ExpressionAttributeNames: {
            "#pk": "adminUserId",
            "#sk": "timestamp#logId",
            "#action": "action",
          },
          ExpressionAttributeValues: {
            ":pk": adminUserId,
            ":from": `${fromIso}#`,
            ":loginSuccess": "LOGIN_SUCCESS",
          },
          ScanIndexForward: false,
          Limit: 20,
          ExclusiveStartKey: cursor,
        }),
      );

      const latest = result.Items?.[0] as Record<string, unknown> | undefined;

      if (latest?.adminUserId && latest["timestamp#logId"]) {
        try {
          await docClient.send(
            new UpdateCommand({
              TableName: this.tableName,
              Key: {
                adminUserId: latest.adminUserId,
                "timestamp#logId": latest["timestamp#logId"],
              },
              UpdateExpression: "SET ipAddress = :ip",
              ConditionExpression:
                "attribute_not_exists(ipAddress) OR ipAddress = :unknown OR ipAddress = :empty",
              ExpressionAttributeValues: {
                ":ip": ipAddress,
                ":unknown": "unknown",
                ":empty": "",
              },
            }),
          );
        } catch (error) {
          if ((error as { name?: string }).name !== "ConditionalCheckFailedException") {
            throw error;
          }
        }

        return true;
      }

      cursor = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (cursor);

    return false;
  }

  public async purgeOlderThan(beforeDate: string): Promise<number> {
    const cutoff = `${beforeDate}T00:00:00.000Z`;
    const attrNames = { "#ts": "timestamp", "#pk": "adminUserId", "#sk": "timestamp#logId" };
    const attrValues = { ":cutoff": cutoff };

    let deletedCount = 0;
    let cursor: Record<string, unknown> | undefined = undefined;

    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: "#ts < :cutoff",
          ProjectionExpression: "#pk, #sk",
          ExpressionAttributeNames: attrNames,
          ExpressionAttributeValues: attrValues,
          ExclusiveStartKey: cursor,
        }),
      );

      const itemsToDelete = (result.Items ?? []) as Array<Record<string, unknown>>;

      if (itemsToDelete.length) {
        await Promise.all(
          itemsToDelete.map(item =>
            docClient.send(
              new DeleteCommand({
                TableName: this.tableName,
                Key: {
                  adminUserId: item.adminUserId,
                  "timestamp#logId": item["timestamp#logId"],
                },
              }),
            ),
          ),
        );

        deletedCount += itemsToDelete.length;
      }

      cursor = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (cursor);

    return deletedCount;
  }
}
