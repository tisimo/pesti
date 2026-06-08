/**
 * Seed script — inserts predefined roles, permissions, and page gates into DynamoDB.
 * Safe to run multiple times: uses fixed IDs so records are simply overwritten.
 *
 * Role applications:
 *   - backoffice  → Super Admin, Backoffice Admin, Backoffice Auditor, Default
 *   - just_causes → Support Staff, Moderator, Compliance Officer, Tech Lead, Senior Admin
 *
 * Permission categories:
 *   - admin        → backoffice roles only
 *   - view / action → just_causes roles only
 *
 * Usage (from /be directory):
 *   npx ts-node --transpile-only src/scripts/seed.ts
 */

import dotenv from "dotenv";
dotenv.config();

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const rawClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "eu-west-1",
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          ...(process.env.AWS_SESSION_TOKEN
            ? { sessionToken: process.env.AWS_SESSION_TOKEN }
            : {}),
        },
      }
    : {}),
});

const db = DynamoDBDocumentClient.from(rawClient);

const PERM_TABLE = "BO_Permissions";
const ROLE_TABLE = "BO_Roles";
const GATE_TABLE = "BO_PageGates";

// ─── Permissions ──────────────────────────────────────────────────────────────

const PERMISSIONS = [
  // View (just_causes)
  { permissionId: "a1000001-0000-4000-8000-000000000001", name: "view_users",      category: "view", application: "just_causes" },
  { permissionId: "a1000002-0000-4000-8000-000000000001", name: "view_campaigns",  category: "view", application: "just_causes" },
  { permissionId: "a1000003-0000-4000-8000-000000000001", name: "view_donations",  category: "view", application: "just_causes" },
  { permissionId: "a1000004-0000-4000-8000-000000000001", name: "view_reports",    category: "view", application: "just_causes" },
  { permissionId: "a1000005-0000-4000-8000-000000000001", name: "view_email",      category: "view", application: "just_causes" },
  { permissionId: "a1000006-0000-4000-8000-000000000001", name: "view_audit_logs", category: "view", application: "just_causes" },
  { permissionId: "a1000007-0000-4000-8000-000000000001", name: "view_withdrawals",category: "view", application: "just_causes" },
  { permissionId: "a1000008-0000-4000-8000-000000000001", name: "view_organizations", category: "view", application: "just_causes" },
  { permissionId: "a1000009-0000-4000-8000-000000000001", name: "view_kyb", category: "view", application: "just_causes" },
  { permissionId: "a1000010-0000-4000-8000-000000000001", name: "view_categories", category: "view", application: "just_causes" },
  { permissionId: "a1000011-0000-4000-8000-000000000001", name: "view_deposits", category: "view", application: "just_causes" },
  { permissionId: "a2000005-0000-4000-8000-000000000001", name: "view_kyc", category: "view", application: "just_causes" },
  // Action (just_causes)
  { permissionId: "a2000001-0000-4000-8000-000000000001", name: "approve_reject",  category: "action", application: "just_causes" },
  { permissionId: "a2000002-0000-4000-8000-000000000001", name: "block_suspend",   category: "action", application: "just_causes" },
  { permissionId: "a2000003-0000-4000-8000-000000000001", name: "flag_escalate",   category: "action", application: "just_causes" },
  { permissionId: "a2000004-0000-4000-8000-000000000001", name: "respond",         category: "action", application: "just_causes" },
  { permissionId: "a2000006-0000-4000-8000-000000000001", name: "export",              category: "action", application: "just_causes" },
  { permissionId: "a2000007-0000-4000-8000-000000000001", name: "process_withdrawals", category: "action", application: "just_causes" },
  { permissionId: "a2000008-0000-4000-8000-000000000001", name: "edit_categories", category: "action", application: "just_causes" },
  // Admin (backoffice)
  { permissionId: "a3000001-0000-4000-8000-000000000001", name: "manage_admins",   category: "admin", application: "backoffice" },
  { permissionId: "a3000002-0000-4000-8000-000000000001", name: "view_admin_logs", category: "admin", application: "backoffice" },
  { permissionId: "a3000003-0000-4000-8000-000000000001", name: "configure_roles", category: "admin", application: "backoffice" },
  { permissionId: "a3000004-0000-4000-8000-000000000001", name: "change_settings", category: "admin", application: "backoffice" },
  { permissionId: "a3000005-0000-4000-8000-000000000001", name: "view_admin_email", category: "admin", application: "backoffice" },
] as const;

const ALL_PERM_NAMES = PERMISSIONS.map((p) => p.name);
const JUST_CAUSES_PERMS = PERMISSIONS.filter((p) => p.application === "just_causes").map((p) => p.name);

// ─── Roles ────────────────────────────────────────────────────────────────────

const ROLES = [
  // Backoffice roles. Non-admin application permissions are granted effectively by the backend.
  {
    roleId: "r0000006-0000-4000-8000-000000000001",
    name: "Super Admin",
    description: "Unrestricted access to all platform features and settings",
    permissions: ALL_PERM_NAMES,
    status: "ACTIVE",
    application: "backoffice",
    isDefault: false,
  },
  {
    roleId: "r0000007-0000-4000-8000-000000000001",
    name: "Backoffice Admin",
    description: "Configurable access to backoffice management: users, roles, logs, settings and all other apps features except Super Admin-only functions",
    permissions: ALL_PERM_NAMES,
    status: "ACTIVE",
    application: "backoffice",
    isDefault: false,
  },
  {
    roleId: "r0000008-0000-4000-8000-000000000001",
    name: "Backoffice Auditor",
    description: "Read-only access to admin logs for compliance and auditing purposes",
    permissions: ["view_admin_logs"],
    status: "ACTIVE",
    application: "backoffice",
    isDefault: false,
  },
  {
    roleId: "r0000000-0000-4000-8000-000000000001",
    name: "Default",
    description: "Fallback role assigned automatically; has no permissions",
    permissions: [],
    status: "ACTIVE",
    application: "backoffice",
    isDefault: true,
  },
  // Just Causes roles (view/action-category permissions only)
  {
    roleId: "r0000001-0000-4000-8000-000000000001",
    name: "Support Staff",
    description: "User support, basic queries, and ticket handling",
    permissions: ["view_users", "view_email", "flag_escalate", "respond"],
    status: "ACTIVE",
    application: "just_causes",
    isDefault: false,
  },
  {
    roleId: "r0000002-0000-4000-8000-000000000001",
    name: "Moderator",
    description: "Content moderation, cause approvals, and report management",
    permissions: ["view_campaigns", "view_categories", "view_reports", "approve_reject", "block_suspend"],
    status: "ACTIVE",
    application: "just_causes",
    isDefault: false,
  },
  {
    roleId: "r0000003-0000-4000-8000-000000000001",
    name: "Compliance Officer",
    description: "KYC review, fraud investigation, and regulatory compliance",
    permissions: ["view_users", "view_organizations", "view_audit_logs", "view_kyc", "view_kyb", "flag_escalate", "block_suspend", "export", "view_deposits", "view_withdrawals"],
    status: "ACTIVE",
    application: "just_causes",
    isDefault: false,
  },
  {
    roleId: "r0000004-0000-4000-8000-000000000001",
    name: "Tech Lead",
    description: "Technical configuration, system logs, and infrastructure management",
    permissions: ["view_reports", "view_audit_logs", "view_categories", "edit_categories", "flag_escalate", "export"],
    status: "ACTIVE",
    application: "just_causes",
    isDefault: false,
  },
  {
    roleId: "r0000005-0000-4000-8000-000000000001",
    name: "Senior Admin",
    description: "High-level oversight, escalations, and compliance review",
    permissions: JUST_CAUSES_PERMS,
    status: "ACTIVE",
    application: "just_causes",
    isDefault: false,
  },
];

// ─── Page Gates ───────────────────────────────────────────────────────────────
// requiredPermissions: [] = open to all authenticated users with the correct app role.
// OR logic: user needs at least one of the listed permissions.
// Super Admin always bypasses all gates regardless.

const PAGE_GATES = [
  // Just Causes panel pages
  { gateId: "g1000001-0000-4000-8000-000000000001", pageKey: "panel_overview",     label: "Overview",              description: "High-level summary of platform activity, key metrics, and recent events.",                                        application: "just_causes", requiredPermissions: [] },
  { gateId: "g1000002-0000-4000-8000-000000000001", pageKey: "panel_users",        label: "Users",                 description: "Browse, search, and manage registered platform users including status and profile details.",                       application: "just_causes", requiredPermissions: ["view_users", "flag_escalate", "block_suspend"] },
  { gateId: "g1000012-0000-4000-8000-000000000001", pageKey: "panel_organizations", label: "Organizations",         description: "Review organization profiles, public identity details, and campaign footprint for NGO and association accounts.", application: "just_causes", requiredPermissions: ["view_organizations", "view_kyb"] },
  { gateId: "g1000003-0000-4000-8000-000000000001", pageKey: "panel_campaigns",    label: "Campaigns",             description: "Review, approve, reject, and moderate fundraising campaigns created by users.",                                    application: "just_causes", requiredPermissions: ["view_campaigns", "approve_reject", "view_reports", "respond"] },
  { gateId: "g1000011-0000-4000-8000-000000000001", pageKey: "panel_campaign_revisions", label: "Campaign Revisions", description: "Review immutable campaign revision threads for initial approvals and proposed live updates before they affect the public cause.", application: "just_causes", requiredPermissions: ["approve_reject", "respond", "flag_escalate", "block_suspend"] },
  { gateId: "g1000004-0000-4000-8000-000000000001", pageKey: "panel_reports",      label: "Reports",               description: "Inspect user-submitted reports of campaigns or content flagged for review or policy violations.",                   application: "just_causes", requiredPermissions: ["view_reports", "respond", "flag_escalate", "block_suspend"] },
  { gateId: "g1000013-0000-4000-8000-000000000001", pageKey: "panel_donations",    label: "Donations",             description: "Review donation records, donor activity, and donation outcome statuses for OnlyJustCauses campaigns.",              application: "just_causes", requiredPermissions: ["view_donations"] },
  { gateId: "g1000014-0000-4000-8000-000000000001", pageKey: "panel_deposits",     label: "Deposits",              description: "Review account funding deposits, provider details, source wallets, and processing outcomes.",                      application: "just_causes", requiredPermissions: ["view_deposits"] },
  { gateId: "g1000005-0000-4000-8000-000000000001", pageKey: "panel_transactions", label: "Transactions",          description: "Inspect the shared payment ledger, including on-chain transfers, tips, and financial settlement activity.",         application: "just_causes", requiredPermissions: ["view_donations"] },
  { gateId: "g1000006-0000-4000-8000-000000000001", pageKey: "panel_analytics",    label: "Analytics",             description: "Access platform-wide analytics, export data reports, and track campaign performance over time.",                     application: "just_causes", requiredPermissions: ["export", "view_campaigns", "view_users"] },
  { gateId: "g1000007-0000-4000-8000-000000000001", pageKey: "panel_categories",   label: "Categories",            description: "Manage campaign categories: create, rename, reorder, or deactivate the taxonomy used to classify campaigns.",        application: "just_causes", requiredPermissions: ["view_categories", "edit_categories"] },
  { gateId: "g1000008-0000-4000-8000-000000000001", pageKey: "panel_kyc",          label: "KYC Queue",            description: "Review identity verification records and moderation-sensitive compliance checks submitted by users.",                 application: "just_causes", requiredPermissions: ["view_kyc"] },
  { gateId: "g1000009-0000-4000-8000-000000000001", pageKey: "panel_logs",         label: "Audit Logs",            description: "View a chronological log of all admin actions taken within the Just Causes panel for accountability.",              application: "just_causes", requiredPermissions: ["view_audit_logs", "export"] },
  { gateId: "g1000010-0000-4000-8000-000000000001", pageKey: "panel_withdrawals",  label: "Withdrawals",           description: "Review and process withdrawal requests submitted by campaign creators.",                                            application: "just_causes", requiredPermissions: ["view_withdrawals", "process_withdrawals"] },
  // Backoffice admin pages
  { gateId: "g2000001-0000-4000-8000-000000000001", pageKey: "admin_roles",        label: "Roles & Permissions",   description: "Define roles, assign permission sets, and control what each backoffice or panel role is allowed to do.",             application: "backoffice",  requiredPermissions: ["configure_roles"] },
  { gateId: "g2000002-0000-4000-8000-000000000001", pageKey: "admin_users",        label: "Backoffice Users",      description: "Manage backoffice administrator accounts, assign roles, activate or deactivate access.",                            application: "backoffice",  requiredPermissions: ["manage_admins"] },
  { gateId: "g2000003-0000-4000-8000-000000000001", pageKey: "admin_logs",         label: "Audit Logs",            description: "Review a full audit trail of all actions performed by backoffice administrators across the management system.",      application: "backoffice",  requiredPermissions: ["view_admin_logs"] },
  { gateId: "g2000006-0000-4000-8000-000000000001", pageKey: "admin_email",       label: "Email Inbox",           description: "Centralized inbox for support emails and admin responses.",                                                         application: "backoffice",  requiredPermissions: ["view_admin_email"] },
  { gateId: "g2000004-0000-4000-8000-000000000001", pageKey: "admin_page_gates",   label: "Page Access Config",    description: "Configure which permissions are required to access each page in the backoffice and Just Causes panel.",              application: "backoffice",  requiredPermissions: ["configure_roles"] },
  { gateId: "g2000005-0000-4000-8000-000000000001", pageKey: "admin_audit_trail", label: "Audit Trail",           description: "View login and app access events for all backoffice administrators including success and failed attempts.",         application: "backoffice",  requiredPermissions: ["manage_admins"] },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding permissions...");
  for (const perm of PERMISSIONS) {
    await db.send(new PutCommand({ TableName: PERM_TABLE, Item: { ...perm, status: "ACTIVE" } }));
    console.log(`  [PERMISSION] ${perm.name} (${perm.category})`);
  }

  console.log("\nSeeding roles...");
  for (const role of ROLES) {
    await db.send(new PutCommand({ TableName: ROLE_TABLE, Item: role }));
    console.log(`  [ROLE] ${role.name} (${role.application}, ${role.permissions.length} permissions)`);
  }

  console.log("\nSeeding page gates...");
  for (const gate of PAGE_GATES) {
    await db.send(new PutCommand({ TableName: GATE_TABLE, Item: gate }));
    const perm = gate.requiredPermissions.length > 0 ? gate.requiredPermissions.join(", ") : "open";
    console.log(`  [GATE] ${gate.pageKey} -> ${perm}`);
  }

  console.log("\nDone.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
