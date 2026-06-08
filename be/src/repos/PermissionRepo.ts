import { Service } from "typedi";
import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../loaders/dynamo";
import { Permission } from "../domain/Permission";
import PermissionMapper, { PermissionPersistence } from "../mappers/PermissionMapper";
import IPermissionRepo from "./IRepos/IPermissionRepo";
import Logger from "../loaders/logger";

@Service()
export default class PermissionRepo implements IPermissionRepo {
  private readonly table = "BO_Permissions";

  public async findAll(): Promise<Permission[]> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: this.table,
        FilterExpression: "#s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "ACTIVE" },
      }),
    );

    return this.mapValidPermissions(result.Items || []);
  }

  public async findAllInactive(): Promise<Permission[]> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: this.table,
        FilterExpression: "#s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "INACTIVE" },
      }),
    );

    return this.mapValidPermissions(result.Items || []);
  }

  public async findById(id: string): Promise<Permission | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: this.table,
        Key: { permissionId: id },
      }),
    );

    if (!result.Item) return null;

    return this.mapValidPermission(result.Item) ?? null;
  }

  public async findByName(name: string): Promise<Permission | null> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: this.table,
        FilterExpression: "#n = :name",
        ExpressionAttributeNames: { "#n": "name" },
        ExpressionAttributeValues: { ":name": name },
      }),
    );

    if (!result.Items || result.Items.length === 0) return null;

    return this.mapValidPermission(result.Items[0]) ?? null;
  }

  public async create(permission: Permission): Promise<Permission> {
    const item = PermissionMapper.toPersistence(permission);

    await docClient.send(
      new PutCommand({
        TableName: this.table,
        Item: { ...item },
      }),
    );

    return permission;
  }

  public async update(permission: Permission): Promise<Permission> {
    const item = PermissionMapper.toPersistence(permission);

    await docClient.send(
      new PutCommand({
        TableName: this.table,
        Item: { ...item },
      }),
    );

    return permission;
  }

  public async delete(id: string): Promise<Permission> {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { permissionId: id },
        UpdateExpression: "SET #s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "INACTIVE" },
        ReturnValues: "ALL_NEW",
      }),
    );

    const permission = this.mapValidPermission(result.Attributes);
    if (!permission) {
      throw new Error("Permission update returned an invalid record.");
    }
    return permission;
  }

  public async hardDelete(id: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: this.table,
        Key: { permissionId: id },
      }),
    );
  }

  public async reactivate(id: string): Promise<Permission> {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { permissionId: id },
        UpdateExpression: "SET #s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "ACTIVE" },
        ReturnValues: "ALL_NEW",
      }),
    );

    const permission = this.mapValidPermission(result.Attributes);
    if (!permission) {
      throw new Error("Permission reactivation returned an invalid record.");
    }
    return permission;
  }

  private mapValidPermissions(items: Record<string, unknown>[]): Permission[] {
    return items
      .map((item) => this.mapValidPermission(item))
      .filter((permission): permission is Permission => Boolean(permission));
  }

  private mapValidPermission(item: Record<string, unknown> | undefined): Permission | null {
    if (!item) return null;

    try {
      return PermissionMapper.toDomain(item as unknown as PermissionPersistence);
    } catch (error) {
      Logger.warn(
        {
          err: error,
          permissionId: item.permissionId,
          keys: Object.keys(item),
        },
        "[PermissionRepo] Ignoring invalid permission record",
      );
      return null;
    }
  }
}
