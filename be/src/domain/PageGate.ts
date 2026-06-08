export type PageGateApplication = "backoffice" | "just_causes";

export interface PageGate {
  gateId: string;
  pageKey: string;                    // e.g. "panel_users"
  label: string;                      // e.g. "Users"
  description: string;                // e.g. "View and manage registered users"
  application: PageGateApplication;   // which app this page belongs to
  requiredPermissions: string[];       // permission names (OR logic); empty = open to all with app access
}
