import { AuditLogAction, AuditLogTargetType } from "../../domain/AuditLog";
import { QueryLogsInput, QueryLogsResult } from "../../repos/IRepos/IAuditLogRepo";

export interface CreateLogInput {
  adminUserId: string;
  adminEmail: string;
  action: AuditLogAction;
  targetType: AuditLogTargetType;
  targetId?: string;
  targetLabel?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export default interface IAuditLogService {
  log(input: CreateLogInput): Promise<void>;
  getAll(input: QueryLogsInput): Promise<QueryLogsResult>;
  purgeOlderThan(beforeDate: string): Promise<number>;
  attachIpToLoginSuccess(adminUserId: string, ipAddress: string): Promise<boolean>;
}
