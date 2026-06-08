export type RoleApplication = "backoffice" | "just_causes";

export const APPLICATION_LABELS: Record<RoleApplication, string> = {
  backoffice:  "Backoffice",
  just_causes: "Just Causes",
};

export interface RoleDTO {
  roleId: string;
  name: string;
  description?: string;
  permissions: string[]; // permission names
  application: RoleApplication;
  isDefault: boolean;
  status?: "ACTIVE" | "INACTIVE";
}

export interface PermissionDTO {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  category: PermissionCategory;
  application: RoleApplication;
}

export type PermissionCategory = "view" | "action" | "admin";

export interface PermissionDef {
  name: string;    // matches backend permission name
  label: string;   // human-readable display label
  category: PermissionCategory;
}

// Predefined permission definitions — must match seeded permission names in DB
export const PERMISSION_DEFS: PermissionDef[] = [
  // View
  { name: "view_users",      label: "View Users",       category: "view" },
  { name: "view_campaigns",  label: "View Campaigns",   category: "view" },
  { name: "view_donations",  label: "View Donations",   category: "view" },
  { name: "view_deposits",   label: "View Deposits",    category: "view" },
  { name: "view_reports",    label: "View Reports",     category: "view" },
  { name: "view_email",      label: "View Email",       category: "view" },
  { name: "view_audit_logs", label: "View Audit Logs",  category: "view" },
  { name: "view_withdrawals", label: "View Withdrawals", category: "view" },
  { name: "view_organizations", label: "View Organizations", category: "view" },
  { name: "view_kyc",        label: "View KYC",         category: "view" },
  { name: "view_kyb",        label: "View KYB",         category: "view" },
  { name: "view_categories", label: "View Categories",  category: "view" },
  // Action
  { name: "approve_reject",  label: "Approve / Reject", category: "action" },
  { name: "block_suspend",   label: "Block / Suspend",  category: "action" },
  { name: "flag_escalate",   label: "Flag / Escalate",  category: "action" },
  { name: "respond",         label: "Respond to Reports", category: "action" },
  { name: "export",          label: "Export Data",      category: "action" },
  { name: "process_withdrawals", label: "Process Withdrawals", category: "action" },
  { name: "edit_categories", label: "Edit Categories",  category: "action" },
  // Admin
  { name: "manage_admins",       label: "Manage Admin Users",  category: "admin" },
  { name: "view_admin_logs",     label: "View Admin Logs",     category: "admin" },
  { name: "configure_roles",     label: "Configure Roles",     category: "admin" },
  { name: "change_settings",     label: "Change Settings",     category: "admin" },
  { name: "view_admin_email",    label: "View Admin Email",    category: "admin" },
];

export const CATEGORY_LABELS: Record<PermissionCategory, string> = {
  view:   "View",
  action: "Action",
  admin:  "Admin",
};

// Predefined role metadata (descriptions + sort order for hierarchy display)
export const ROLE_METADATA: Record<string, { description: string; order: number }> = {
  // Backoffice roles
  "Super Admin":        { description: "Unrestricted access to all platform features and settings", order: 1 },
  "Backoffice Admin":   { description: "Configurable access to backoffice management: users, roles, logs, and settings", order: 2 },
  "Backoffice Auditor": { description: "Read-only access to admin logs for compliance and auditing purposes", order: 3 },
  // Just Causes roles
  "Senior Admin":       { description: "High-level oversight, escalations, and compliance review",  order: 4 },
  "Tech Lead":          { description: "Technical configuration, system logs, and infrastructure management", order: 5 },
  "Compliance Officer": { description: "KYC review, fraud investigation, and regulatory compliance", order: 6 },
  "Moderator":          { description: "Content moderation, cause approvals, and report management", order: 7 },
  "Support Staff":      { description: "User support, basic queries, and ticket handling",           order: 8 },
};

// Returns a human-readable label for a permission name, falling back to title-casing the name
export function getPermissionLabel(name: string): string {
  return (
    PERMISSION_DEFS.find((p) => p.name === name)?.label ??
    name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// ─── Page Gates ───────────────────────────────────────────────────────────────

export interface PageGateDTO {
  gateId: string;
  pageKey: string;
  label: string;
  description: string;
  application: RoleApplication;
  requiredPermissions: string[];  // OR logic; empty = open to all with app access
}
