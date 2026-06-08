import { v4 as uuidv4 } from "uuid";

export type AuditLogAction =
  | "CREATE_USER"
  | "UPDATE_USER"
  | "UPDATE_USER_ROLE"
  | "DEACTIVATE_USER"
  | "REACTIVATE_USER"
  | "DELETE_USER"
  | "PURGE_INACTIVE_USERS"
  | "CREATE_ROLE"
  | "UPDATE_ROLE"
  | "DELETE_ROLE"
  | "DEACTIVATE_ROLE"
  | "REACTIVATE_ROLE"
  | "UPDATE_PERMISSIONS"
  | "CREATE_PERMISSION"
  | "UPDATE_PERMISSION"
  | "DEACTIVATE_PERMISSION"
  | "REACTIVATE_PERMISSION"
  | "DELETE_PERMISSION"
  | "PURGE_INACTIVE_PERMISSIONS"
  | "CREATE_ADMIN_ACCOUNT"
  | "RESET_USER_PASSWORD"
  | "PAGE_GATE_UPDATED"
  | "CAMPAIGN_STATUS_CHANGED"
  | "CAMPAIGN_REVISION_APPROVED"
  | "CAMPAIGN_REVISION_CHANGES_REQUESTED"
  | "CAMPAIGN_REVISION_REJECTED"
  | "REPORT_STATUS_CHANGED"
  | "REPORT_SUMMARY_UPDATED"
  | "REPORT_ACTION_TAKEN"
  | "REPORT_NOTE_ADDED"
  | "CATEGORY_CREATED"
  | "CATEGORY_UPDATED"
  | "CATEGORY_DELETED"
  | "OJC_USER_STATUS_CHANGED"
  | "OJC_USER_STRIKES_UPDATED"
  | "KYC_MISMATCH_WARNING_SENT"
  | "KYC_ACCOUNT_DEACTIVATED"
  | "KYC_ACCOUNT_ACTIVATED"
  | "KYC_VERIFICATION_RESET"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "APP_ACCESS_SUCCESS"
  | "APP_ACCESS_FAILED"
  | "WITHDRAWAL_APPROVED"
  | "WITHDRAWAL_REJECTED"
  | "KYB_APPROVED"
  | "KYB_REJECTED"
  | "ORG_ACCOUNT_ACTIVATED"
  | "ORG_ACCOUNT_DEACTIVATED";

export type AuditLogTargetType =
  | "user"
  | "role"
  | "permission"
  | "page_gate"
  | "campaign"
  | "report"
  | "category"
  | "app"
  | "auth"
  | "system"
  | "withdrawal"
  | "organization"
  | "kyc";

export interface AuditLogProps {
  logId: string;
  adminUserId: string;
  adminEmail: string;
  action: AuditLogAction;
  targetType: AuditLogTargetType;
  targetId?: string;
  targetLabel?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
  logDate: string;
  timestampLogId: string;
}

export interface CreateAuditLogProps {
  adminUserId: string;
  adminEmail: string;
  action: AuditLogAction;
  targetType: AuditLogTargetType;
  targetId?: string;
  targetLabel?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export default class AuditLog {
  constructor(private readonly props: AuditLogProps) {}

  get logId() {
    return this.props.logId;
  }
  get adminUserId() {
    return this.props.adminUserId;
  }
  get adminEmail() {
    return this.props.adminEmail;
  }
  get action() {
    return this.props.action;
  }
  get targetType() {
    return this.props.targetType;
  }
  get targetId() {
    return this.props.targetId;
  }
  get targetLabel() {
    return this.props.targetLabel;
  }
  get details() {
    return this.props.details;
  }
  get ipAddress() {
    return this.props.ipAddress;
  }
  get timestamp() {
    return this.props.timestamp;
  }
  get logDate() {
    return this.props.logDate;
  }
  get timestampLogId() {
    return this.props.timestampLogId;
  }

  static create(props: CreateAuditLogProps): AuditLog {
    const logId = uuidv4();
    const timestamp = new Date().toISOString();
    const logDate = timestamp.slice(0, 10);
    const timestampLogId = `${timestamp}#${logId}`;

    return new AuditLog({
      ...props,
      logId,
      timestamp,
      logDate,
      timestampLogId,
    });
  }
}
