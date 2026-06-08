import AuditLog from "../../domain/AuditLog";

export interface QueryLogsInput {
  adminUserId?: string;
  adminEmail?: string;
  fromDate?: string; // ISO date string (YYYY-MM-DD)
  toDate?: string; // ISO date string (YYYY-MM-DD)
  action?: string;
  actionIn?: string[];
  app?: string;
  limit?: number;
  page?: number;
  sortDir?: "asc" | "desc";
  lastKey?: Record<string, unknown>;
}

export interface QueryLogsResult {
  items: AuditLog[];
  lastKey?: Record<string, unknown>;
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
}

export default interface IAuditLogRepo {
  create(log: AuditLog): Promise<AuditLog>;
  query(input: QueryLogsInput): Promise<QueryLogsResult>;
  purgeOlderThan(beforeDate: string): Promise<number>;
  attachIpToLoginSuccess(adminUserId: string, ipAddress: string): Promise<boolean>;
}
