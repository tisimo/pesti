import { Inject, Service } from "typedi";
import AuditLog from "../domain/AuditLog";
import IAuditLogRepo, { QueryLogsInput, QueryLogsResult } from "../repos/IRepos/IAuditLogRepo";
import IAuditLogService, { CreateLogInput } from "./IServices/IAuditLogService";
import Logger from "../loaders/logger";

@Service()
export default class AuditLogService implements IAuditLogService {
  constructor(@Inject("auditLogRepo") private readonly auditLogRepo: IAuditLogRepo) {}

  public async log(input: CreateLogInput): Promise<void> {
    const log = AuditLog.create(input);
    try {
      await this.auditLogRepo.create(log);
    } catch (error) {
      Logger.error(
        {
          err: error,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId,
          adminEmail: input.adminEmail,
        },
        "Failed to persist audit log entry",
      );
      throw error;
    }
  }

  public async getAll(input: QueryLogsInput): Promise<QueryLogsResult> {
    return this.auditLogRepo.query(input);
  }

  public async purgeOlderThan(beforeDate: string): Promise<number> {
    return this.auditLogRepo.purgeOlderThan(beforeDate);
  }

  public async attachIpToLoginSuccess(adminUserId: string, ipAddress: string): Promise<boolean> {
    return this.auditLogRepo.attachIpToLoginSuccess(adminUserId, ipAddress);
  }
}
