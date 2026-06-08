import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { apiBackoffice } from "@/shared/lib/axios";
import "./logsPage.css";

interface AuditLog {
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

interface LogsResponse {
  items: AuditLog[];
  lastKey: Record<string, any> | null;
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
}

const ACTION_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  CREATE_USER: { bg: "#f0fdf4", color: "#15803d", label: "Create User" },
  UPDATE_USER: { bg: "#eff4ff", color: "#0047AB", label: "Update User" },
  UPDATE_USER_ROLE: { bg: "#eff4ff", color: "#0047AB", label: "Update User Role" },
  DEACTIVATE_USER: { bg: "#fef3c7", color: "#92400e", label: "Deactivate User" },
  REACTIVATE_USER: { bg: "#f0fdf4", color: "#15803d", label: "Reactivate User" },
  DELETE_USER: { bg: "#fef2f2", color: "#b91c1c", label: "Delete User" },
  PURGE_INACTIVE_USERS: { bg: "#fef2f2", color: "#b91c1c", label: "Purge Inactive Users" },
  CREATE_ROLE: { bg: "#f0fdf4", color: "#15803d", label: "Create Role" },
  UPDATE_ROLE: { bg: "#eff4ff", color: "#0047AB", label: "Update Role" },
  DELETE_ROLE: { bg: "#fef2f2", color: "#b91c1c", label: "Delete Role" },
  DEACTIVATE_ROLE: { bg: "#fef3c7", color: "#92400e", label: "Deactivate Role" },
  REACTIVATE_ROLE: { bg: "#f0fdf4", color: "#15803d", label: "Reactivate Role" },
  UPDATE_PERMISSIONS: { bg: "#fdf4ff", color: "#7e22ce", label: "Update Permissions" },
  CREATE_PERMISSION: { bg: "#f0fdf4", color: "#15803d", label: "Create Permission" },
  UPDATE_PERMISSION: { bg: "#eff4ff", color: "#0047AB", label: "Update Permission" },
  DEACTIVATE_PERMISSION: { bg: "#fef3c7", color: "#92400e", label: "Deactivate Permission" },
  REACTIVATE_PERMISSION: { bg: "#f0fdf4", color: "#15803d", label: "Reactivate Permission" },
  DELETE_PERMISSION: { bg: "#fef2f2", color: "#b91c1c", label: "Delete Permission" },
  PURGE_INACTIVE_PERMISSIONS: { bg: "#fef2f2", color: "#b91c1c", label: "Purge Inactive Permissions" },
  CREATE_ADMIN_ACCOUNT: { bg: "#f0fdf4", color: "#15803d", label: "Create Admin Account" },
  RESET_USER_PASSWORD: { bg: "#fef3c7", color: "#92400e", label: "Reset Password" },
  PAGE_GATE_UPDATED: { bg: "#eff6ff", color: "#0047AB", label: "Page Access Updated" },
  CAMPAIGN_STATUS_CHANGED: { bg: "#eff4ff", color: "#0047AB", label: "Campaign Status Changed" },
  REPORT_STATUS_CHANGED: { bg: "#fef3c7", color: "#92400e", label: "Report Status Changed" },
  REPORT_SUMMARY_UPDATED: { bg: "#eef2ff", color: "#4338ca", label: "Report Summary Updated" },
  REPORT_ACTION_TAKEN: { bg: "#fff7ed", color: "#c2410c", label: "Report Action Taken" },
  REPORT_NOTE_ADDED: { bg: "#f8fafc", color: "#475569", label: "Report Note Added" },
  CATEGORY_CREATED: { bg: "#f0fdf4", color: "#15803d", label: "Category Created" },
  CATEGORY_UPDATED: { bg: "#eff4ff", color: "#0047AB", label: "Category Updated" },
  CATEGORY_DELETED: { bg: "#fef2f2", color: "#b91c1c", label: "Category Deleted" },
  OJC_USER_STATUS_CHANGED: { bg: "#eff6ff", color: "#0047AB", label: "User Status Changed" },
  OJC_USER_STRIKES_UPDATED: { bg: "#fff7ed", color: "#c2410c", label: "User Strikes Updated" },
  KYC_MISMATCH_WARNING_SENT: { bg: "#eff6ff", color: "#1d4ed8", label: "KYC Warning Sent" },
  KYC_ACCOUNT_DEACTIVATED: { bg: "#fef2f2", color: "#b91c1c", label: "KYC Account Deactivated" },
  KYC_ACCOUNT_ACTIVATED: { bg: "#f0fdf4", color: "#15803d", label: "KYC Account Activated" },
  KYC_VERIFICATION_RESET: { bg: "#fff7ed", color: "#c2410c", label: "KYC Verification Reset" },
  WITHDRAWAL_APPROVED: { bg: "#ecfdf5", color: "#047857", label: "Withdrawal Approved" },
  WITHDRAWAL_REJECTED: { bg: "#fff7ed", color: "#c2410c", label: "Withdrawal Rejected" },
  CAMPAIGN_REVISION_APPROVED: { bg: "#ecfdf5", color: "#047857", label: "Campaign Revision Approved" },
  CAMPAIGN_REVISION_CHANGES_REQUESTED: { bg: "#fff7ed", color: "#c2410c", label: "Campaign Revision Changes Requested" },
  CAMPAIGN_REVISION_REJECTED: { bg: "#fef2f2", color: "#b91c1c", label: "Campaign Revision Rejected" },
  KYB_APPROVED: { bg: "#ecfdf5", color: "#047857", label: "KYB Approved" },
  KYB_REJECTED: { bg: "#fef2f2", color: "#b91c1c", label: "KYB Rejected" },
  ORG_ACCOUNT_ACTIVATED: { bg: "#f0fdf4", color: "#15803d", label: "Org Account Activated" },
  ORG_ACCOUNT_DEACTIVATED: { bg: "#fef3c7", color: "#92400e", label: "Org Account Deactivated" },
};

export const BACKOFFICE_ACTIONS = [
  "CREATE_USER",
  "UPDATE_USER",
  "UPDATE_USER_ROLE",
  "DEACTIVATE_USER",
  "REACTIVATE_USER",
  "DELETE_USER",
  "PURGE_INACTIVE_USERS",
  "CREATE_ROLE",
  "UPDATE_ROLE",
  "DELETE_ROLE",
  "DEACTIVATE_ROLE",
  "REACTIVATE_ROLE",
  "UPDATE_PERMISSIONS",
  "CREATE_PERMISSION",
  "UPDATE_PERMISSION",
  "DEACTIVATE_PERMISSION",
  "REACTIVATE_PERMISSION",
  "DELETE_PERMISSION",
  "PURGE_INACTIVE_PERMISSIONS",
  "CREATE_ADMIN_ACCOUNT",
  "RESET_USER_PASSWORD",
  "PAGE_GATE_UPDATED",
];

export const OJC_ACTIONS = [
  "CAMPAIGN_STATUS_CHANGED",
  "REPORT_STATUS_CHANGED",
  "REPORT_SUMMARY_UPDATED",
  "REPORT_ACTION_TAKEN",
  "REPORT_NOTE_ADDED",
  "CATEGORY_CREATED",
  "CATEGORY_UPDATED",
  "CATEGORY_DELETED",
  "OJC_USER_STATUS_CHANGED",
  "OJC_USER_STRIKES_UPDATED",
  "KYC_MISMATCH_WARNING_SENT",
  "KYC_ACCOUNT_DEACTIVATED",
  "KYC_ACCOUNT_ACTIVATED",
  "KYC_VERIFICATION_RESET",
  "WITHDRAWAL_APPROVED",
  "WITHDRAWAL_REJECTED",
  "CAMPAIGN_REVISION_APPROVED",
  "CAMPAIGN_REVISION_CHANGES_REQUESTED",
  "CAMPAIGN_REVISION_REJECTED",
  "KYB_APPROVED",
  "KYB_REJECTED",
  "ORG_ACCOUNT_ACTIVATED",
  "ORG_ACCOUNT_DEACTIVATED",
];

const PAGE_SIZE = 25;

interface LogsPageProps {
  allowedActions: string[];
  showAppFilter?: boolean;
  defaultApp?: string;
}

const APP_LOG_OPTIONS = [
  { value: "", label: "All apps", actions: [] as string[] },
  { value: "backoffice", label: "Backoffice", actions: BACKOFFICE_ACTIONS },
  { value: "only_just_causes", label: "Only Just Causes", actions: OJC_ACTIONS },
];

function formatModerationAction(value?: string) {
  if (value === "REJECT_REPORT") return "Dismiss report";
  if (value === "ACCEPT_REPORT") return "Remove cause";
  if (value === "WARN_CREATOR") return "Warn creator";
  if (value === "REQUEST_CHANGE") return "Request changes";
  if (value === "STATUS_CHANGED") return "Status changed";
  return value ?? "Unknown action";
}

function formatReportActionDetails(details: Record<string, any> = {}): string {
  const parts: string[] = [];

  const moderationAction = details.moderationAction ?? details.action;
  if (moderationAction) parts.push(`Action -> ${formatModerationAction(moderationAction)}`);
  if (details.campaignStatus) parts.push(`Campaign -> ${details.campaignStatus}`);
  const reportStatus = details.reportStatus ?? (details.resolved ? "RESOLVED" : undefined);
  if (reportStatus) parts.push(`Report -> ${reportStatus}`);

  const strikeApplied =
    typeof details.strikeApplied === "boolean"
      ? details.strikeApplied
      : typeof details.applyStrike === "boolean"
        ? details.applyStrike
        : undefined;
  if (typeof strikeApplied === "boolean") {
    parts.push(strikeApplied ? "Strike applied" : "No strike applied");
  }

  const message = typeof details.message === "string" ? details.message : undefined;
  if (message) parts.push(`Message: ${message}`);

  return parts.join(" | ");
}

function formatList(values: unknown): string {
  if (!Array.isArray(values) || values.length === 0) return "none";
  return values.join(", ");
}

function formatTransition(previousValue?: string | null, nextValue?: string | null): string {
  if (previousValue && nextValue) return `${previousValue} -> ${nextValue}`;
  if (nextValue) return `-> ${nextValue}`;
  if (previousValue) return `${previousValue} ->`;
  return "";
}

function humanizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function renderDetailValue(value: unknown, depth = 0): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span style={{ color: "#94a3b8" }}>-</span>;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return value.toLocaleString("en-GB");
  }

  if (typeof value === "string") {
    return (
      <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#0f172a" }}>
        {value}
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span style={{ color: "#94a3b8" }}>None</span>;
    }

    const isSimpleArray = value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item));
    if (isSimpleArray) {
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {value.map((item, index) => (
            <span
              key={`${String(item)}-${index}`}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "#eef4ff",
                border: "1px solid #dbe7ff",
                color: "#1e3a8a",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {String(item)}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gap: 10 }}>
        {value.map((item, index) => (
          <div
            key={index}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: depth > 0 ? "#ffffff" : "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            {renderDetailValue(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, nestedValue]) => nestedValue !== undefined);

    if (entries.length === 0) {
      return <span style={{ color: "#94a3b8" }}>Empty object</span>;
    }

    return (
      <div style={{ display: "grid", gap: 10 }}>
        {entries.map(([key, nestedValue]) => (
          <div
            key={key}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: depth > 0 ? "#ffffff" : "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 8,
              }}
            >
              {humanizeKey(key)}
            </div>
            <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
              {renderDetailValue(nestedValue, depth + 1)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return String(value);
}

function getActionMeta(log: AuditLog) {
  if (log.action === "REPORT_STATUS_CHANGED" && log.details?.action && !log.details?.status) {
    return ACTION_STYLE.REPORT_ACTION_TAKEN;
  }

  return ACTION_STYLE[log.action] ?? {
    bg: "#f8fafc",
    color: "#64748b",
    label: log.action,
  };
}

function stringifyDetails(details?: Record<string, any>) {
  if (!details) return "";

  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

function formatDetails(action: string, details: Record<string, any> = {}): string {
  switch (action) {
    case "UPDATE_PERMISSIONS": {
      const parts: string[] = [];
      if (details.operation === "CREATE_PERMISSION") return `Created permission (${details.category ?? "uncategorised"})`;
      if (details.operation === "UPDATE_PERMISSION") {
        return `Updated permission${details.name ? ` -> "${details.name}"` : ""}${details.category ? `, category -> ${details.category}` : ""}`;
      }
      if (details.operation === "DELETE_PERMISSION") {
        return details.permanent ? "Permanently deleted permission" : "Deleted permission";
      }
      if (details.operation === "DELETE_ALL_PERMISSIONS") {
        return `Permanently deleted all permissions${details.count != null ? ` (${details.count})` : ""}`;
      }
      if (details.operation === "REACTIVATE_PERMISSION") return "Restored permission";
      if (details.addedPermissionId && (!Array.isArray(details.added) || details.added.length === 0)) {
        parts.push(`Added permission ID: ${details.addedPermissionId}`);
      }
      if (Array.isArray(details.added) && details.added.length) parts.push(`Granted: ${details.added.join(", ")}`);
      if (Array.isArray(details.removed) && details.removed.length) parts.push(`Revoked: ${details.removed.join(", ")}`);
      return parts.length ? parts.join(" | ") : "Permissions unchanged";
    }
    case "CREATE_PERMISSION":
      return [
        details.category ? `Category: ${details.category}` : "",
        details.status ? `Status: ${details.status}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    case "UPDATE_PERMISSION": {
      const parts: string[] = [];
      const nameChange = formatTransition(details.previousName, details.nextName);
      const categoryChange = formatTransition(details.previousCategory, details.nextCategory);
      if (nameChange && details.previousName !== details.nextName) parts.push(`Name: ${nameChange}`);
      if (categoryChange && details.previousCategory !== details.nextCategory) parts.push(`Category: ${categoryChange}`);
      return parts.length ? parts.join(" | ") : "Permission updated";
    }
    case "DEACTIVATE_PERMISSION":
    case "REACTIVATE_PERMISSION":
      return [
        formatTransition(details.previousStatus, details.nextStatus)
          ? `Status: ${formatTransition(details.previousStatus, details.nextStatus)}`
          : "",
        details.category ? `Category: ${details.category}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    case "DELETE_PERMISSION":
      return [
        details.permanent ? "Permanently deleted" : "Deleted",
        details.category ? `Category: ${details.category}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    case "PURGE_INACTIVE_PERMISSIONS":
      return typeof details.deletedCount === "number"
        ? `${details.deletedCount} inactive permission(s) removed`
        : "Inactive permissions purged";
    case "CREATE_ROLE": {
      const app = details.application === "backoffice" ? "Backoffice" : "Just Causes";
      return `Application: ${app}`;
    }
    case "UPDATE_ROLE":
      return details.name ? `Renamed to "${details.name}"` : "Role updated";
    case "UPDATE_USER_ROLE":
      if (details.operation === "PROMOTED_TO_SUPER_ADMIN") return "Promoted to Super Admin";
      if (details.operation === "DEMOTED_FROM_SUPER_ADMIN") return "Demoted from Super Admin";
      if (details.from && details.to) return `${details.from} -> ${details.to}`;
      if (details.role) return `Role set to "${details.role}"`;
      return "Role updated";
    case "UPDATE_USER": {
      const parts: string[] = [];
      if (details.role?.from || details.role?.to) {
        parts.push(`Role: ${formatTransition(details.role?.from, details.role?.to)}`);
      }
      if (details.email?.from || details.email?.to) {
        parts.push(`Email: ${formatTransition(details.email?.from, details.email?.to)}`);
      }
      if (details.firstName?.from || details.firstName?.to) {
        parts.push(`First name: ${formatTransition(details.firstName?.from, details.firstName?.to)}`);
      }
      if (details.lastName?.from || details.lastName?.to) {
        parts.push(`Last name: ${formatTransition(details.lastName?.from, details.lastName?.to)}`);
      }
      if (details.status?.from || details.status?.to) {
        parts.push(`Status: ${formatTransition(details.status?.from, details.status?.to)}`);
      }
      return parts.length ? parts.join(" | ") : "User updated";
    }
    case "CREATE_USER": {
      const name = [details.firstName, details.lastName].filter(Boolean).join(" ");
      return name ? `Name: ${name}` : "";
    }
    case "PURGE_INACTIVE_USERS":
      return typeof details.deletedCount === "number" ? `${details.deletedCount} user(s) removed` : "Inactive users purged";
    case "CREATE_ADMIN_ACCOUNT":
      return [
        details.email ? `Email: ${details.email}` : "",
        [details.firstName, details.lastName].filter(Boolean).length
          ? `Name: ${[details.firstName, details.lastName].filter(Boolean).join(" ")}`
          : "",
        details.status ? `Status: ${details.status}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    case "PAGE_GATE_UPDATED": {
      const previousPermissions = Array.isArray(details.previousRequiredPermissions)
        ? details.previousRequiredPermissions
        : [];
      const nextPermissions = Array.isArray(details.nextRequiredPermissions)
        ? details.nextRequiredPermissions
        : [];
      const previousLabel = previousPermissions.length ? previousPermissions.join(", ") : "Open";
      const nextLabel = nextPermissions.length ? nextPermissions.join(", ") : "Open";
      return [
        details.application ? `Application: ${details.application}` : "",
        details.pageKey ? `Page: ${details.pageKey}` : "",
        `Access: ${previousLabel} -> ${nextLabel}`,
        Array.isArray(details.addedPermissions) && details.addedPermissions.length
          ? `Added: ${formatList(details.addedPermissions)}`
          : "",
        Array.isArray(details.removedPermissions) && details.removedPermissions.length
          ? `Removed: ${formatList(details.removedPermissions)}`
          : "",
      ]
        .filter(Boolean)
        .join(" | ");
    }
    case "DEACTIVATE_USER":
    case "REACTIVATE_USER":
    case "DELETE_USER":
    case "RESET_USER_PASSWORD":
      return "";
    case "CAMPAIGN_STATUS_CHANGED":
      return [
        formatTransition(details.previousStatus, details.nextStatus)
          ? `Status: ${formatTransition(details.previousStatus, details.nextStatus)}`
          : details.status
            ? `Status -> ${details.status}`
            : "",
        details.nextReviewMessage ? `Note: ${details.nextReviewMessage}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    case "REPORT_STATUS_CHANGED":
      if ((details.action || details.moderationAction) && !details.status) {
        return formatReportActionDetails(details);
      }
      return [
        formatTransition(details.previousStatus, details.nextStatus)
          ? `Status: ${formatTransition(details.previousStatus, details.nextStatus)}`
          : details.status
            ? `Status -> ${details.status}`
            : "",
        details.resolutionNote ? `Note: ${details.resolutionNote}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    case "REPORT_SUMMARY_UPDATED":
      return [
        "Internal summary updated",
        typeof details.previousSummaryLength === "number" && typeof details.nextSummaryLength === "number"
          ? `Length: ${details.previousSummaryLength} -> ${details.nextSummaryLength}`
          : "",
        details.nextSummaryPreview ? `Summary: ${details.nextSummaryPreview}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    case "REPORT_ACTION_TAKEN":
      return formatReportActionDetails(details);
    case "REPORT_NOTE_ADDED":
      return [
        details.notePreview ? `Note: ${details.notePreview}` : "Internal note added",
        typeof details.noteLength === "number" ? `Length: ${details.noteLength}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    case "CATEGORY_CREATED":
      return [
        details.slug ? `Slug: ${details.slug}` : "",
        details.iconName ? `Icon: ${details.iconName}` : "",
        details.description ? `Description: ${details.description}` : "",
        details.isActive === false ? "Inactive" : "Active",
      ]
        .filter(Boolean)
        .join(" | ");
    case "CATEGORY_UPDATED": {
      if (details.previous && details.next) {
        const previous = details.previous;
        const next = details.next;
        const parts: string[] = [];
        if (previous.name !== next.name) parts.push(`Name: ${formatTransition(previous.name, next.name)}`);
        if (previous.slug !== next.slug) parts.push(`Slug: ${formatTransition(previous.slug, next.slug)}`);
        if (previous.iconName !== next.iconName) {
          parts.push(`Icon: ${formatTransition(previous.iconName ?? "none", next.iconName ?? "none")}`);
        }
        if (previous.description !== next.description) {
          parts.push(`Description: ${formatTransition(previous.description ?? "none", next.description ?? "none")}`);
        }
        if (previous.isActive !== next.isActive) {
          parts.push(`Status: ${previous.isActive ? "Active" : "Inactive"} -> ${next.isActive ? "Active" : "Inactive"}`);
        }
        return parts.length ? parts.join(" | ") : "No visible field changes";
      }

      const parts: string[] = [];
      if (details.name !== undefined) parts.push(`Name -> "${details.name}"`);
      if (details.iconName !== undefined) parts.push(`Icon -> ${details.iconName ?? "none"}`);
      if (details.description !== undefined) {
        parts.push(`Description -> ${details.description ? `"${details.description}"` : "none"}`);
      }
      if (details.isActive !== undefined) parts.push(details.isActive ? "Activated" : "Deactivated");
      return parts.join(" | ");
    }
    case "CATEGORY_DELETED":
      return details.name ? `Deleted "${details.name}"` : "";
    case "OJC_USER_STATUS_CHANGED":
      return [
        formatTransition(details.previousStatus, details.nextStatus)
          ? `Status: ${formatTransition(details.previousStatus, details.nextStatus)}`
          : "",
        typeof details.previousStrikeCount === "number" && typeof details.nextStrikeCount === "number"
          ? `Strikes: ${details.previousStrikeCount} -> ${details.nextStrikeCount}`
          : "",
        details.clearedStrikes ? "Strikes cleared on activation" : "",
      ]
        .filter(Boolean)
        .join(" | ");
    case "OJC_USER_STRIKES_UPDATED":
      return [
        details.operation === "ADD_ONE"
          ? "Added 1 strike"
          : details.operation === "REMOVE_ONE"
            ? "Removed 1 strike"
            : details.operation === "CLEAR_ALL"
              ? "Cleared all strikes"
              : "",
        typeof details.previousStrikeCount === "number" && typeof details.nextStrikeCount === "number"
          ? `Strikes: ${details.previousStrikeCount} -> ${details.nextStrikeCount}`
          : "",
        formatTransition(details.previousStatus, details.nextStatus)
          ? `Status: ${formatTransition(details.previousStatus, details.nextStatus)}`
          : "",
        typeof details.reasonPreview === "string" && details.reasonPreview
          ? `Reason: ${details.reasonPreview}`
          : "",
      ]
        .filter(Boolean)
        .join(" | ");
    case "WITHDRAWAL_APPROVED":
    case "WITHDRAWAL_REJECTED":
      return [
        formatTransition(details.previousStatus, details.nextStatus)
          ? `Status: ${formatTransition(details.previousStatus, details.nextStatus)}`
          : "",
        details.note ? `Note: ${details.note}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    case "CAMPAIGN_REVISION_APPROVED":
    case "CAMPAIGN_REVISION_CHANGES_REQUESTED":
    case "CAMPAIGN_REVISION_REJECTED":
      return [
        details.threadType
          ? `Thread: ${details.threadType === "live_update" ? "Live update" : "Initial approval"}`
          : "",
        details.submissionNumber != null ? `Submission #${details.submissionNumber}` : "",
        formatTransition(details.previousThreadStatus, details.nextThreadStatus)
          ? `Status: ${formatTransition(details.previousThreadStatus, details.nextThreadStatus)}`
          : "",
        details.moderationMessage ? `Message: ${details.moderationMessage}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    default:
      return Object.entries(details)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
        .join(", ");
  }
}

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function LogsPage({ allowedActions, showAppFilter = false, defaultApp = "" }: LogsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAction = "";
  const initialApp = showAppFilter ? (searchParams.get("app") ?? defaultApp) : defaultApp;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    searchParams.get("sortDir") === "asc" ? "asc" : "desc",
  );

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [action, setAction] = useState(initialAction);
  const [appFilter, setAppFilter] = useState(initialApp);
  const [adminEmail, setAdminEmail] = useState(searchParams.get("email") || "");

  const visibleAppOptions = APP_LOG_OPTIONS.filter((option) => {
    if (!option.value) return true;
    return option.actions.some((optionAction) => allowedActions.includes(optionAction));
  });

  const scopedActions = (() => {
    const appOption = APP_LOG_OPTIONS.find((option) => option.value === appFilter);
    if (!appOption?.value) return allowedActions;
    return allowedActions.filter((allowedAction) => appOption.actions.includes(allowedAction));
  })();

  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1));
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showRawDetails, setShowRawDetails] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (action) params.set("action", action);
    if (showAppFilter && appFilter) params.set("app", appFilter);
    if (adminEmail.trim()) params.set("email", adminEmail.trim());
    if (sortDir !== "desc") params.set("sortDir", sortDir);
    if (page > 1) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [fromDate, toDate, action, appFilter, adminEmail, sortDir, page, setSearchParams, showAppFilter]);

  useEffect(() => {
    if (action && !scopedActions.includes(action)) {
      setAction("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appFilter, allowedActions.join(",")]);

  const abortRef = useRef<AbortController | null>(null);

  async function fetchLogs(pageToLoad = 1, sortToLoad: "asc" | "desc" = sortDir) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        page: String(pageToLoad),
        sortDir: sortToLoad,
      };

      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (action) {
        params.action = action;
      } else {
        params.actionIn = scopedActions.join(",");
      }

      const normalizedAdminEmail = adminEmail.trim();
      if (normalizedAdminEmail) params.adminEmail = normalizedAdminEmail;

      const res = await apiBackoffice.get<LogsResponse>("/logs", {
        params,
        signal: controller.signal,
      });

      setLogs(res.data.items ?? []);
      setSelectedLog(null);
      setPage(res.data.currentPage ?? pageToLoad);
      setTotalPages(Math.max(1, res.data.totalPages ?? 1));
      setTotalItems(res.data.totalItems ?? res.data.items.length ?? 0);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED") {
        const msg = e?.response?.data?.message || e?.message || "Unknown error";
        setError(`Failed to load logs: ${msg} (status ${e?.response?.status ?? "N/A"})`);
        setLogs([]);
        setPage(1);
        setTotalPages(1);
        setTotalItems(0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchLogs(1, "desc");

    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setShowRawDetails(false);
  }, [selectedLog?.logId]);

  const thStyle: CSSProperties = {
    padding: "10px 16px",
    fontWeight: 600,
    color: "#64748b",
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  return (
    <>
      <div className="admin-page-header">
        <h1>Audit Logs</h1>
        <p>A record of all actions performed within this backoffice.</p>
      </div>

      <div
        className="logs-page__panel"
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          className="logs-page__filters"
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div className="logs-page__filter" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>FROM</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                padding: "6px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          <div className="logs-page__filter" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>TO</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                padding: "6px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          {showAppFilter && (
            <div className="logs-page__filter" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>APP</label>
              <select
                value={appFilter}
                onChange={(e) => {
                  setAppFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  fontSize: 13,
                  outline: "none",
                  background: "#fff",
                  minWidth: 170,
                }}
              >
                {visibleAppOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="logs-page__filter" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>ACTION</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              style={{
                padding: "6px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                fontSize: 13,
                outline: "none",
                background: "#fff",
                minWidth: 170,
              }}
            >
              <option value="">All actions</option>
              {scopedActions.map((allowedAction) => (
                <option key={allowedAction} value={allowedAction}>
                  {ACTION_STYLE[allowedAction]?.label ?? allowedAction}
                </option>
              ))}
            </select>
          </div>

          <div className="logs-page__filter" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              ADMIN EMAIL
            </label>
            <input
              type="text"
              placeholder="Filter by email..."
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              style={{
                padding: "6px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                fontSize: 13,
                outline: "none",
                minWidth: 200,
              }}
            />
          </div>

          <button
            className="logs-page__apply"
            onClick={() => void fetchLogs(1, sortDir)}
            style={{
              padding: "6px 16px",
              background: "#0047AB",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            Apply
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 20px",
              background: "#fef2f2",
              borderBottom: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
            <div
              className="spinner-border"
              role="status"
              style={{ width: "1.8rem", height: "1.8rem", color: "#0047AB" }}
            />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8", fontSize: 14 }}>
            No audit logs found for the selected filters.
          </div>
        ) : (
          <div className="logs-page__table">
            <table className="logs-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <th
                    style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                    onClick={() => {
                      const nextSortDir = sortDir === "asc" ? "desc" : "asc";
                      setSortDir(nextSortDir);
                      void fetchLogs(1, nextSortDir);
                    }}
                  >
                    Timestamp{" "}
                    <span style={{ fontSize: 11, color: "#0047AB" }}>
                      {sortDir === "asc" ? "▲" : "▼"}
                    </span>
                  </th>
                  {["Admin", "Action", "Target", "Details"].map((heading) => (
                    <th key={heading} style={thStyle}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const style = getActionMeta(log);
                  const detailsPreview = log.details ? formatDetails(log.action, log.details) : "";

                  return (
                    <tr key={log.logId} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td className="logs-table__timestamp" style={{ padding: "11px 16px", color: "#475569", fontSize: 12 }}>
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="logs-table__admin" style={{ padding: "11px 16px", maxWidth: 240 }}>
                        <div
                          style={{
                            fontWeight: 500,
                            color: "#0f172a",
                            fontSize: 12,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {log.adminEmail}
                        </div>
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: 11,
                            marginTop: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {log.adminUserId}
                        </div>
                      </td>
                      <td className="logs-table__action" style={{ padding: "11px 16px" }}>
                        <span
                          className="logs-table__action-badge"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "3px 9px",
                            borderRadius: 20,
                            background: style.bg,
                            color: style.color,
                          }}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td className="logs-table__target" style={{ padding: "11px 16px", maxWidth: 200 }}>
                        {log.targetLabel && (
                          <div
                            style={{
                              fontWeight: 500,
                              color: "#0f172a",
                              fontSize: 12,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {log.targetLabel}
                          </div>
                        )}
                        {log.targetId && (
                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: 11,
                              marginTop: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {log.targetId}
                          </div>
                        )}
                      </td>
                      <td className="logs-table__details" style={{ padding: "11px 16px", maxWidth: 320 }}>
                        {log.details ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                            <div
                              style={{
                                color: "#475569",
                                fontSize: 12,
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitBoxOrient: "vertical",
                                WebkitLineClamp: 2,
                              }}
                            >
                              {detailsPreview || "View details"}
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedLog(log)}
                              style={{
                                padding: 0,
                                border: "none",
                                background: "transparent",
                                color: "#0047AB",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              View full details
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#cbd5e1" }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div
              className="logs-page__pagination"
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 13, color: "#64748b" }}>{totalItems} records</span>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <button
                  onClick={() => void fetchLogs(page - 1)}
                  disabled={page === 1}
                  style={{
                    padding: "6px 14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    background: "#fff",
                    fontSize: 13,
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    color: page === 1 ? "#cbd5e1" : "#374151",
                    fontWeight: 500,
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: 13, color: "#64748b", minWidth: 90, textAlign: "center" }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => void fetchLogs(page + 1)}
                  disabled={page === totalPages}
                  style={{
                    padding: "6px 14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    background: "#fff",
                    fontSize: 13,
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    color: page === totalPages ? "#cbd5e1" : "#374151",
                    fontWeight: 500,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedLog && (
        <div
          role="presentation"
          onClick={() => setSelectedLog(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 1000,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-log-details-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(760px, 100%)",
              maxHeight: "85vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 30px 60px rgba(15, 23, 42, 0.18)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <h2
                  id="audit-log-details-title"
                  style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}
                >
                  Audit log details
                </h2>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
                  {getActionMeta(selectedLog).label} on {formatTimestamp(selectedLog.timestamp)}
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {selectedLog.details && (
                  <button
                    type="button"
                    onClick={() => setShowRawDetails((current) => !current)}
                    style={{
                      border: "1px solid #cbd5e1",
                      background: showRawDetails ? "#eff6ff" : "#fff",
                      color: showRawDetails ? "#0047AB" : "#334155",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {showRawDetails ? "Hide raw JSON" : "View raw JSON"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#334155",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div style={{ padding: 24, display: "grid", gap: 18 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Admin
                  </div>
                  <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: "#0f172a", wordBreak: "break-word" }}>
                    {selectedLog.adminEmail}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", wordBreak: "break-word" }}>
                    {selectedLog.adminUserId}
                  </div>
                </div>

                <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Target
                  </div>
                  <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: "#0f172a", wordBreak: "break-word" }}>
                    {selectedLog.targetLabel || selectedLog.targetId || "-"}
                  </div>
                  {selectedLog.targetId && selectedLog.targetLabel && (
                    <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", wordBreak: "break-word" }}>
                      {selectedLog.targetId}
                    </div>
                  )}
                </div>

                <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Event
                  </div>
                  <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: "#0f172a", wordBreak: "break-word" }}>
                    {getActionMeta(selectedLog).label}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", wordBreak: "break-word" }}>
                    {selectedLog.targetType}
                    {selectedLog.ipAddress ? ` | IP ${selectedLog.ipAddress}` : ""}
                  </div>
                </div>
              </div>

              <div style={{ padding: 16, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Summary
                </div>
                <div style={{ marginTop: 8, color: "#334155", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {selectedLog.details ? formatDetails(selectedLog.action, selectedLog.details) : "No details available."}
                </div>
              </div>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div style={{ padding: 16, borderRadius: 12, background: "#ffffff", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Structured details
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {Object.entries(selectedLog.details)
                      .filter(([, value]) => value !== undefined)
                      .map(([key, value]) => (
                        <div
                          key={key}
                          style={{
                            padding: "14px 16px",
                            borderRadius: 12,
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#64748b",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              marginBottom: 8,
                            }}
                          >
                            {humanizeKey(key)}
                          </div>
                          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
                            {renderDetailValue(value)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {showRawDetails && (
                <div style={{ padding: 16, borderRadius: 12, background: "#0f172a", color: "#e2e8f0" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Raw JSON
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(stringifyDetails(selectedLog.details));
                      }}
                      style={{
                        border: "1px solid rgba(226,232,240,0.22)",
                        background: "rgba(255,255,255,0.06)",
                        color: "#e2e8f0",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre
                    style={{
                      margin: "10px 0 0",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontSize: 12,
                      lineHeight: 1.6,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
                    }}
                  >
                    {stringifyDetails(selectedLog.details)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
