import AuditLog, {
  AuditLogAction,
  AuditLogProps,
  AuditLogTargetType,
} from "../domain/AuditLog";
import IAuditLogDTO from "../dto/IAuditLogDTO";

const SK_ATTR = "timestamp#logId";

type PersistenceLog = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;

  if (value && typeof value === "object" && "S" in value) {
    const stringValue = (value as { S?: unknown }).S;
    return typeof stringValue === "string" ? stringValue : undefined;
  }

  return undefined;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function omitUndefinedDeep(value: unknown): unknown {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map(item => omitUndefinedDeep(item))
      .filter(item => typeof item !== "undefined");
  }

  if (value && typeof value === "object") {
    const cleanedEntries = Object.entries(value as Record<string, unknown>)
      .map(([key, nestedValue]) => [key, omitUndefinedDeep(nestedValue)] as const)
      .filter(([, nestedValue]) => typeof nestedValue !== "undefined");

    if (!cleanedEntries.length) {
      return undefined;
    }

    return Object.fromEntries(cleanedEntries);
  }

  return value;
}

export default class AuditLogMapper {
  static toDomain(raw: PersistenceLog): AuditLog {
    const details = asObject(raw.details);
    const timestamp = asString(raw.timestamp) ?? asString(raw.createdAt) ?? new Date().toISOString();
    const logId =
      asString(raw.logId) ??
      asString(raw.id) ??
      `${
        asString(raw.adminUserId) ??
        asString(raw.userId) ??
        asString(raw.cognitoSub) ??
        "unknown"
      }-${timestamp}`;

    const action = asString(raw.action) ?? "APP_ACCESS_FAILED";
    const targetType =
      (asString(raw.targetType) ??
        (action.startsWith("LOGIN") ? "auth" : "app")) as AuditLogTargetType;

    const props: AuditLogProps = {
      logId,
      adminUserId:
        asString(raw.adminUserId) ??
        asString(raw.userId) ??
        asString(raw.cognitoSub) ??
        asString(details?.userId) ??
        asString(details?.cognitoSub) ??
        "unknown",
      adminEmail:
        asString(raw.adminEmail) ?? asString(raw.email) ?? asString(details?.email) ?? "unknown",
      action: action as AuditLogAction,
      targetType,
      targetId: asString(raw.targetId),
      targetLabel: asString(raw.targetLabel),
      details,
      ipAddress: asString(raw.ipAddress) ?? asString(details?.ipAddress),
      timestamp,
      logDate: asString(raw.logDate) ?? timestamp.slice(0, 10),
      timestampLogId: asString(raw[SK_ATTR]) ?? `${timestamp}#${logId}`,
    };

    return new AuditLog(props);
  }

  static toPersistence(log: AuditLog): Record<string, unknown> {
    return omitUndefinedDeep({
      logId: log.logId,
      adminUserId: log.adminUserId,
      adminEmail: log.adminEmail,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      targetLabel: log.targetLabel,
      details: log.details,
      ipAddress: log.ipAddress,
      timestamp: log.timestamp,
      logDate: log.logDate,
      [SK_ATTR]: log.timestampLogId,
    }) as Record<string, unknown>;
  }

  static toDTO(log: AuditLog): IAuditLogDTO {
    return {
      logId: log.logId,
      adminUserId: log.adminUserId,
      adminEmail: log.adminEmail,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      targetLabel: log.targetLabel,
      details: log.details,
      ipAddress: log.ipAddress,
      timestamp: log.timestamp,
      logDate: log.logDate,
    };
  }
}
