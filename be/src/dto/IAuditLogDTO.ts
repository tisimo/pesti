export default interface IAuditLogDTO {
  logId: string;
  adminUserId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetLabel?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
  logDate: string;
}
