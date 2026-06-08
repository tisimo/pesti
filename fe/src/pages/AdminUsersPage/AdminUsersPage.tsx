import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiBackoffice } from "@/shared/lib/axios";
import { useAuth } from "@/app/providers/AuthProvider";
import { APPLICATION_LABELS, type RoleApplication } from "@/features/roles/model/types";
import { usePermission } from "@/shared/hooks/usePermission";
import { BACKOFFICE_ACTIONS, OJC_ACTIONS } from "../LogsPage/LogsPage";
import "../RolesPermissionsPage/roles-permissions.css";
import "./adminUsersPage.css";

interface AdminUser {
  userId: string;
  cognitoSub?: string;
  email: string;
  roleId?: string;
  roleIds?: string[];
  status: "ACTIVE" | "INACTIVE";
  cognitoStatus?: string;
  firstName?: string;
  lastName?: string;
  roleName?: string;
  roleApplication?: RoleApplication;
  roles?: Array<{ roleId: string; name: string; application: RoleApplication; isDefault: boolean }>;
}

interface AuditLogEntry {
  logId: string;
  action: string;
  targetType: string;
  adminEmail?: string;
  adminUserId?: string;
  targetId?: string;
  targetLabel?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
  source?: "log" | "audit-trail";
}

interface ActivityLogsResponse {
  items: AuditLogEntry[];
  lastKey?: Record<string, unknown> | null;
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
}

type ActivitySource = "all" | "log" | "audit-trail";
type ActivityResultFilter = "" | "success" | "failed";

interface Role {
  roleId: string;
  name: string;
  application: RoleApplication;
  isDefault: boolean;
}

const ROLE_APP_ORDER: RoleApplication[] = ["backoffice", "just_causes"];
const ACTIVITY_PAGE_SIZE = 10;
const ADMIN_ACTIVITY_ACTIONS = [...BACKOFFICE_ACTIONS, ...OJC_ACTIONS];
const AUDIT_TRAIL_ACTIONS = ["LOGIN_SUCCESS", "LOGIN_FAILED", "APP_ACCESS_SUCCESS", "APP_ACCESS_FAILED"];
const ACTIVITY_APP_OPTIONS = [
  { value: "", label: "All apps", actions: ADMIN_ACTIVITY_ACTIONS },
  { value: "backoffice", label: "Backoffice", actions: BACKOFFICE_ACTIONS },
  { value: "only_just_causes", label: "Only Just Causes", actions: OJC_ACTIONS },
];
const SUPER_ADMIN_NAME = "Super Admin";
const BACKOFFICE_ADMIN_NAME = "Backoffice Admin";

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  ACTIVE:   { bg: "#f0fdf4", color: "#15803d" },
  INACTIVE: { bg: "#f8fafc", color: "#64748b" },
  PENDING:  { bg: "#fff7ed", color: "#c2410c" },
};

const ROLE_BADGE_STYLE: Record<RoleApplication, { bg: string; color: string }> = {
  backoffice: { bg: "#f3ebff", color: "#6B21E8" },
  just_causes: { bg: "#eff6ff", color: "var(--ojc-primary)" },
};

function getRoleBadgeLabel(role: Role) {
  return role.application === "backoffice"
    ? `Admin · ${role.name}`
    : `${APPLICATION_LABELS[role.application]} · ${role.name}`;
}

function initials(u: AdminUser) {
  if (u.firstName && u.lastName) return (u.firstName[0] + u.lastName[0]).toUpperCase();
  return u.email.slice(0, 2).toUpperCase();
}

function displayName(u: AdminUser) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
}

function sortActivityLogs(logs: AuditLogEntry[]) {
  return [...logs].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

function getActivityLogKey(log: AuditLogEntry) {
  return [
    log.logId,
    log.timestamp,
    log.action,
    log.adminUserId ?? "",
    log.adminEmail ?? "",
    log.targetType,
    log.targetId ?? "",
    log.targetLabel ?? "",
  ].join("|");
}

function dedupeActivityLogs(logs: AuditLogEntry[]) {
  const seen = new Set<string>();
  const unique: AuditLogEntry[] = [];

  for (const log of logs) {
    const key = getActivityLogKey(log);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(log);
  }

  return unique;
}

function getActivitySourceLabel(source?: ActivitySource) {
  if (source === "audit-trail") return "Audit trail";
  if (source === "log") return "Audit logs";
  return "All activity";
}

function getActivityResult(action: string): ActivityResultFilter {
  if (action === "LOGIN_FAILED" || action === "APP_ACCESS_FAILED") return "failed";
  if (action === "LOGIN_SUCCESS" || action === "APP_ACCESS_SUCCESS") return "success";
  return "";
}

function getActivityApp(log: AuditLogEntry): string {
  const detailsApp = typeof log.details?.app === "string" ? log.details.app : "";
  const target = log.targetType === "app" ? (log.targetLabel ?? log.targetId ?? "") : "";
  return detailsApp || target;
}

function getActivitySummary(log: AuditLogEntry): string {
  if (!log.details || Object.keys(log.details).length === 0) {
    return log.targetLabel ? `${log.targetType}: ${log.targetLabel}` : log.targetType;
  }

  if (log.action === "UPDATE_USER_ROLE" && log.details.from && log.details.to) {
    return `${log.details.from} -> ${log.details.to}`;
  }

  if ((log.action === "APP_ACCESS_SUCCESS" || log.action === "APP_ACCESS_FAILED") && log.details.app) {
    return `App: ${log.details.app}${log.details.reason ? ` - ${log.details.reason}` : ""}`;
  }

  if ((log.action === "LOGIN_SUCCESS" || log.action === "LOGIN_FAILED") && log.details.reason) {
    return String(log.details.reason);
  }

  return JSON.stringify(log.details);
}

async function fetchAllActivityPages(
  path: string,
  params: Record<string, string>,
  pageLimit: number,
): Promise<AuditLogEntry[]> {
  const first = await apiBackoffice.get<ActivityLogsResponse>(path, {
    params: {
      ...params,
      page: "1",
      limit: String(pageLimit),
    },
  });

  const firstItems = first.data.items ?? [];
  if (first.data.lastKey) {
    const items = [...firstItems];
    let lastKey: Record<string, unknown> | null = first.data.lastKey;
    let safetyPage = 1;

    while (lastKey && safetyPage < 100) {
      const response: { data: ActivityLogsResponse } = await apiBackoffice.get<ActivityLogsResponse>(path, {
        params: {
          ...params,
          lastKey: JSON.stringify(lastKey),
          limit: String(pageLimit),
        },
      });
      items.push(...(response.data.items ?? []));
      lastKey = response.data.lastKey ?? null;
      safetyPage += 1;
    }

    return items;
  }

  const totalPages = Math.max(1, first.data.totalPages ?? 1);
  if (totalPages <= 1) return firstItems;

  const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
  const remaining = await Promise.all(
    remainingPages.map((page) =>
      apiBackoffice.get<ActivityLogsResponse>(path, {
        params: {
          ...params,
          page: String(page),
          limit: String(pageLimit),
        },
      }),
    ),
  );

  return [
    ...firstItems,
    ...remaining.flatMap((response) => response.data.items ?? []),
  ];
}

export default function AdminUsersPage() {
  const { user: authUser, logout, refreshUser } = useAuth();
  const canManageAdmins = usePermission("manage_admins");
  const canViewAdminLogs = usePermission("view_admin_logs");
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [roles, setRoles]   = useState<Role[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState(searchParams.get("search") || "");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    setSearchParams(params, { replace: true });
  }, [search, setSearchParams]);
  const [actingId, setActingId] = useState<string | null>(null);

  const [showCreate, setShowCreate]   = useState(false);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "" });

  const [accessTarget, setAccessTarget] = useState<AdminUser | null>(null);
  const [accessDraftRoleIds, setAccessDraftRoleIds] = useState<string[]>([]);
  const [savingAccess, setSavingAccess] = useState(false);
  const [accessError, setAccessError] = useState("");

  // Transfer Super Admin modal
  const [transferTarget, setTransferTarget] = useState<AdminUser | null>(null);
  const [transferStep, setTransferStep]     = useState(1);
  const [confirmEmail, setConfirmEmail]     = useState("");
  const [transferring, setTransferring]     = useState(false);
  const [transferError, setTransferError]   = useState("");

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState("");

  // Activity log modal
  const [activityUser, setActivityUser]     = useState<AdminUser | null>(null);
  const [allActivityLogs, setAllActivityLogs] = useState<AuditLogEntry[]>([]);
  const [activityLogs, setActivityLogs]     = useState<AuditLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityTotalItems, setActivityTotalItems] = useState(0);
  const [activitySource, setActivitySource] = useState<ActivitySource>("all");
  const [activityAction, setActivityAction] = useState("");
  const [activityResult, setActivityResult] = useState<ActivityResultFilter>("");
  const [activityApp, setActivityApp] = useState("");
  const [activityFromDate, setActivityFromDate] = useState("");
  const [activityToDate, setActivityToDate] = useState("");
  const [selectedActivityLog, setSelectedActivityLog] = useState<AuditLogEntry | null>(null);

  // Super Admin display-name edit modal
  const [nameEditTarget, setNameEditTarget] = useState<AdminUser | null>(null);
  const [nameEditForm, setNameEditForm] = useState({ firstName: "", lastName: "" });
  const [savingNameEdit, setSavingNameEdit] = useState(false);
  const [nameEditError, setNameEditError] = useState("");

  function fetchUsers() {
    setLoading(true);
    apiBackoffice
      .get<AdminUser[]>("/users")
      .then((r) => setUsers(r.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchUsers();
    apiBackoffice.get<Role[]>("/roles").then((r) => setRoles(r.data)).catch(() => {});
  }, []);

  const superAdminRole  = roles.find((r) => r.name.toLowerCase() === SUPER_ADMIN_NAME.toLowerCase());
  const backofficeAdminRole = roles.find((r) => r.name.toLowerCase() === BACKOFFICE_ADMIN_NAME.toLowerCase());
  const superAdminRoleId = superAdminRole?.roleId;
  const backofficeAdminRoleId = backofficeAdminRole?.roleId;

  const currentUserIsSuperAdmin = authUser?.role?.toLowerCase() === SUPER_ADMIN_NAME.toLowerCase();
  const currentUserIsBackofficeAdmin = authUser?.role?.toLowerCase() === BACKOFFICE_ADMIN_NAME.toLowerCase();
  const currentUserCanManageBackofficeScope = currentUserIsSuperAdmin || currentUserIsBackofficeAdmin;

  const roleById = new Map(roles.map((role) => [role.roleId, role]));

  function getUserRoleIds(user: AdminUser): string[] {
    return user.roleIds ?? (user.roleId ? [user.roleId] : []);
  }

  function getUserRoles(user: AdminUser) {
    const explicitRoles = user.roles ?? [];
    const explicitById = new Map(explicitRoles.map((role) => [role.roleId, role]));
    return getUserRoleIds(user)
      .map((roleId) => explicitById.get(roleId) ?? roleById.get(roleId))
      .filter((role): role is Role => Boolean(role))
      .filter((role) => !role.isDefault);
  }

  function getPrimaryRole(user: AdminUser) {
    const assignedRoles = getUserRoles(user);
    return assignedRoles.find((role) => role.application === "backoffice") ?? assignedRoles[0] ?? null;
  }

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.firstName ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (u.lastName ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  const activitySourceCounts = useMemo(() => ({
    all: allActivityLogs.length,
    log: allActivityLogs.filter((log) => log.source === "log").length,
    "audit-trail": allActivityLogs.filter((log) => log.source === "audit-trail").length,
  }), [allActivityLogs]);
  const sourceScopedActivityLogs = useMemo(
    () => allActivityLogs.filter((log) => activitySource === "all" || log.source === activitySource),
    [activitySource, allActivityLogs],
  );
  const activityAppOptions = useMemo(
    () => activitySource === "audit-trail"
      ? Array.from(new Set(sourceScopedActivityLogs.map(getActivityApp).filter(Boolean)))
          .sort()
          .map((app) => ({ value: app, label: app, actions: [] as string[] }))
      : ACTIVITY_APP_OPTIONS,
    [activitySource, sourceScopedActivityLogs],
  );
  const activityActionScope = useMemo(() => {
    if (activitySource === "audit-trail") return AUDIT_TRAIL_ACTIONS;
    if (activityApp) {
      return ACTIVITY_APP_OPTIONS.find((option) => option.value === activityApp)?.actions ?? ADMIN_ACTIVITY_ACTIONS;
    }
    return ADMIN_ACTIVITY_ACTIONS;
  }, [activityApp, activitySource]);
  const activityActionOptions = useMemo(
    () => Array.from(new Set(sourceScopedActivityLogs
      .filter((log) => log.source !== "log" || activityActionScope.includes(log.action))
      .map((log) => log.action))).sort(),
    [activityActionScope, sourceScopedActivityLogs],
  );
  const filteredActivityLogs = useMemo(() => allActivityLogs.filter((log) => {
    if (activitySource !== "all" && log.source !== activitySource) return false;
    if (log.source === "log" && activitySource !== "audit-trail" && !activityActionScope.includes(log.action)) return false;
    if (activityAction && log.action !== activityAction) return false;
    if (activityResult && getActivityResult(log.action) !== activityResult) return false;
    if (activityApp && log.source === "audit-trail" && getActivityApp(log) !== activityApp) return false;
    if (activityFromDate && log.timestamp < `${activityFromDate}T00:00:00.000Z`) return false;
    if (activityToDate && log.timestamp > `${activityToDate}T23:59:59.999Z`) return false;
    return true;
  }), [activityAction, activityActionScope, activityApp, activityFromDate, activityResult, activitySource, activityToDate, allActivityLogs]);
  const showActivityResultFilter = activitySource === "all" || activitySource === "audit-trail";
  const showActivityAppFilter = true;

  async function handleToggleStatus(user: AdminUser) {
    setActingId(user.userId);
    try {
      const path = user.status === "ACTIVE"
        ? `/users/${user.userId}/deactivate`
        : `/users/${user.userId}/reactivate`;
      await apiBackoffice.patch(path);
      fetchUsers();
    } finally {
      setActingId(null);
    }
  }

  async function handleCreate() {
    setCreateError("");
    if (!form.email.trim()) { setCreateError("Email is required."); return; }
    setCreating(true);
    try {
      // Single atomic call: creates Cognito user + BO_Users record
      await apiBackoffice.post("/cognito", {
        email: form.email.trim(),
        ...(form.firstName.trim() ? { firstName: form.firstName.trim() } : {}),
        ...(form.lastName.trim() ? { lastName: form.lastName.trim() } : {}),
      });
      setShowCreate(false);
      setForm({ email: "", firstName: "", lastName: "" });
      fetchUsers();
    } catch (e: any) {
      setCreateError(e?.response?.data?.message ?? "Failed to create user.");
    } finally {
      setCreating(false);
    }
  }

  function cancelCreate() {
    setShowCreate(false);
    setCreateError("");
    setForm({ email: "", firstName: "", lastName: "" });
  }

  function openAccessModal(user: AdminUser) {
    setAccessTarget(user);
    setAccessDraftRoleIds(getUserRoleIds(user).filter(Boolean));
    setAccessError("");
  }

  function closeAccessModal() {
    if (savingAccess) return;
    setAccessTarget(null);
    setAccessDraftRoleIds([]);
    setAccessError("");
  }

  function setBackofficeRole(roleId: string) {
    setAccessDraftRoleIds(roleId ? [roleId] : []);
  }

  function setApplicationRole(application: RoleApplication, roleId: string) {
    setAccessDraftRoleIds((prev) => {
      const withoutBackoffice = prev.filter((id) => roleById.get(id)?.application !== "backoffice");
      const withoutApp = withoutBackoffice.filter((id) => roleById.get(id)?.application !== application);
      return roleId ? [...withoutApp, roleId] : withoutApp;
    });
  }

  async function handleSaveAccess() {
    if (!accessTarget) return;
    setSavingAccess(true);
    setAccessError("");
    try {
      await apiBackoffice.put(`/users/${accessTarget.userId}/roles`, { roleIds: accessDraftRoleIds });
      fetchUsers();
      if (authUser?.boUserId === accessTarget.userId) {
        await refreshUser();
      }
      setAccessTarget(null);
      setAccessDraftRoleIds([]);
    } catch (e: any) {
      setAccessError(e?.response?.data?.message ?? "Failed to update access.");
    } finally {
      setSavingAccess(false);
    }
  }

  async function handleTransferConfirm() {
    if (!transferTarget) return;
    setTransferError("");
    setTransferring(true);
    try {
      await apiBackoffice.post(`/users/${transferTarget.userId}/transfer-super-admin`);
      // Log out immediately: current user no longer has Super Admin
      await logout();
    } catch (e: any) {
      setTransferError(e?.response?.data?.message ?? "Transfer failed. Please try again.");
      setTransferring(false);
    }
  }

  function openTransferModal(u: AdminUser) {
    setTransferTarget(u);
    setTransferStep(1);
    setConfirmEmail("");
    setTransferError("");
  }

  function closeTransferModal() {
    setTransferTarget(null);
    setTransferStep(1);
    setConfirmEmail("");
    setTransferError("");
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteError("");
    setDeleting(true);
    try {
      await apiBackoffice.delete(`/users/${deleteTarget.userId}`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (e: any) {
      setDeleteError(e?.response?.data?.message ?? "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  }

  function openActivityLog(user: AdminUser) {
    setActivityUser(user);
    setAllActivityLogs([]);
    setActivityLogs([]);
    setActivityPage(1);
    setActivityTotalPages(1);
    setActivityTotalItems(0);
    setActivitySource("all");
    setActivityAction("");
    setActivityResult("");
    setActivityApp("");
    setActivityFromDate("");
    setActivityToDate("");
    setSelectedActivityLog(null);
    setActivityLoading(true);
  }

  function closeActivityLog() {
    setActivityUser(null);
    setAllActivityLogs([]);
    setActivityLogs([]);
    setActivityPage(1);
    setActivityTotalPages(1);
    setActivityTotalItems(0);
    setActivitySource("all");
    setActivityAction("");
    setActivityResult("");
    setActivityApp("");
    setActivityFromDate("");
    setActivityToDate("");
    setSelectedActivityLog(null);
  }

  useEffect(() => {
    if (!activityUser) return;

    let active = true;
    const selectedActivityUser = activityUser;
    setActivityLoading(true);

    async function loadCompleteActivity() {
      const normalizedEmail = selectedActivityUser.email.trim();
      // The full Audit Logs/Audit Trail pages filter by adminEmail. Use the same
      // identity key here so this modal matches those page totals, including
      // older records that may not have the current BO user id persisted.
      const userFilter: Record<string, string> = { adminEmail: normalizedEmail };
      const dateFilter: Record<string, string> = {};
      if (activityFromDate) dateFilter.fromDate = activityFromDate;
      if (activityToDate) dateFilter.toDate = activityToDate;
      const [adminLogResult, auditTrailResult] = await Promise.allSettled([
        fetchAllActivityPages("/logs", {
          ...userFilter,
          ...dateFilter,
          actionIn: ADMIN_ACTIVITY_ACTIONS.join(","),
          sortDir: "desc",
        }, 200),
        fetchAllActivityPages("/logs/audit-trail", {
          ...userFilter,
          ...dateFilter,
          actionIn: AUDIT_TRAIL_ACTIONS.join(","),
          sortDir: "desc",
        }, 500),
      ]);
      const adminLogItems = adminLogResult.status === "fulfilled" ? adminLogResult.value : [];
      const auditTrailItems = auditTrailResult.status === "fulfilled" ? auditTrailResult.value : [];

      const adminLogs = adminLogItems.map((log) => ({ ...log, source: "log" as const }));
      const auditTrailLogs = auditTrailItems.map((log) => ({
        ...log,
        source: "audit-trail" as const,
      }));

      return sortActivityLogs(dedupeActivityLogs([...adminLogs, ...auditTrailLogs]));
    }

    loadCompleteActivity()
      .then((logs) => {
        if (!active) return;
        setAllActivityLogs(logs);
        setActivityTotalItems(logs.length);
        setActivityTotalPages(Math.max(1, Math.ceil(logs.length / ACTIVITY_PAGE_SIZE)));
        setActivityPage(1);
      })
      .catch(() => {
        if (!active) return;
        setAllActivityLogs([]);
        setActivityLogs([]);
        setActivityTotalItems(0);
        setActivityTotalPages(1);
      })
      .finally(() => {
        if (active) setActivityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activityFromDate, activityToDate, activityUser]);

  useEffect(() => {
    setActivityPage(1);
    setSelectedActivityLog(null);
  }, [activitySource, activityAction, activityResult, activityApp, activityFromDate, activityToDate]);

  useEffect(() => {
    const safeTotalPages = Math.max(1, Math.ceil(filteredActivityLogs.length / ACTIVITY_PAGE_SIZE));
    const safePage = Math.min(activityPage, safeTotalPages);
    const start = (safePage - 1) * ACTIVITY_PAGE_SIZE;
    const nextPageLogs = filteredActivityLogs.slice(start, start + ACTIVITY_PAGE_SIZE);
    setActivityLogs(nextPageLogs);
    setActivityTotalItems(filteredActivityLogs.length);
    setActivityTotalPages(safeTotalPages);
    if (safePage !== activityPage) setActivityPage(safePage);
  }, [activityPage, filteredActivityLogs]);

  function openNameEdit(user: AdminUser) {
    setNameEditTarget(user);
    setNameEditForm({ firstName: user.firstName ?? "", lastName: user.lastName ?? "" });
    setNameEditError("");
  }

  async function handleSaveNameEdit() {
    if (!nameEditTarget) return;
    setSavingNameEdit(true);
    setNameEditError("");
    try {
      await apiBackoffice.put(`/users/${nameEditTarget.userId}`, {
        firstName: nameEditForm.firstName.trim(),
        lastName: nameEditForm.lastName.trim(),
      });
      setNameEditTarget(null);
      fetchUsers();
      if (authUser?.boUserId === nameEditTarget.userId) {
        await refreshUser();
      }
    } catch (e: any) {
      setNameEditError(e?.response?.data?.message ?? "Failed to update this user's name.");
    } finally {
      setSavingNameEdit(false);
    }
  }

  function formatAction(action: string) {
    return action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const assignableBackofficeRoles = currentUserIsSuperAdmin
    ? roles.filter((role) =>
        !role.isDefault &&
        role.application === "backoffice" &&
        role.roleId !== superAdminRoleId)
    : [];
  const applicationRoleApps = ROLE_APP_ORDER.filter((app) => app !== "backoffice");
  const draftBackofficeRoleId =
    accessDraftRoleIds.find((roleId) => roleById.get(roleId)?.application === "backoffice") ?? "";
  const hasDraftBackofficeRole = Boolean(draftBackofficeRoleId);

  return (
    <>
      <div className="admin-page-header">
        <h1>Backoffice Users</h1>
        <p>
          {currentUserCanManageBackofficeScope
            ? "Manage the admin accounts that have access to this backoffice."
            : "Review all admin accounts. Actions are available only for application-specific users within your permissions."}
        </p>
      </div>

      {/* Transfer Super Admin Modal: 3-step confirmation */}
      {transferTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 500, width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>

            {/* Step indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
              {[1, 2, 3].map((s) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: s < transferStep ? "#b91c1c" : s === transferStep ? "#b91c1c" : "#f1f5f9",
                    color: s <= transferStep ? "#fff" : "#94a3b8",
                  }}>
                    {s < transferStep ? <i className="bi bi-check" /> : s}
                  </div>
                  {s < 3 && <div style={{ width: 32, height: 2, background: s < transferStep ? "#b91c1c" : "#f1f5f9" }} />}
                </div>
              ))}
              <span style={{ marginLeft: 8, fontSize: 12, color: "#94a3b8" }}>Step {transferStep} of 3</span>
            </div>

            {/* Step 1 */}
            {transferStep === 1 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="bi bi-shield-exclamation" style={{ fontSize: 20, color: "#b91c1c" }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>Transfer Super Admin</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Read carefully before continuing</div>
                  </div>
                </div>

                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: "#991b1b", lineHeight: 1.7 }}>
                  You are about to transfer Super Admin to <strong>{transferTarget.email}</strong>.<br />
                  Your account will be <strong>immediately downgraded to the default role</strong> - no permissions, no access.<br />
                  You will be <strong>logged out automatically</strong> the moment the transfer completes.<br />
                  The new Super Admin will need to manually assign you a role.
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={closeTransferModal} style={{ padding: "8px 18px", background: "#fff", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={() => setTransferStep(2)} style={{ padding: "8px 18px", background: "#b91c1c", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    I understand - continue
                  </button>
                </div>
              </>
            )}

            {/* Step 2 */}
            {transferStep === 2 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 20, color: "#b91c1c" }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#b91c1c" }}>Are you absolutely certain?</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>This is your second warning</div>
                  </div>
                </div>

                <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: "#92400e", lineHeight: 1.7 }}>
                  <strong>This action is permanent and cannot be reversed by anyone except the new Super Admin.</strong><br /><br />
                  Once transferred:<br />
                  - Only <strong>{transferTarget.email}</strong> will hold Super Admin privileges<br />
                  - You will lose the ability to manage roles, users, and settings<br />
                  - If this person is unavailable or uncooperative, <strong>you have no recourse</strong><br />
                  - Your session will be terminated immediately
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={closeTransferModal} style={{ padding: "8px 18px", background: "#fff", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={() => setTransferStep(3)} style={{ padding: "8px 18px", background: "#b91c1c", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    I still want to proceed
                  </button>
                </div>
              </>
            )}

            {/* Step 3 */}
            {transferStep === 3 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="bi bi-keyboard" style={{ fontSize: 20, color: "#b91c1c" }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#b91c1c" }}>Final confirmation</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Type the email address to confirm</div>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: "#475569", marginBottom: 10, lineHeight: 1.6 }}>
                    Type <strong>{transferTarget.email}</strong> exactly to enable the transfer button.
                  </div>
                  <input
                    autoFocus
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => { setConfirmEmail(e.target.value); setTransferError(""); }}
                    placeholder={transferTarget.email}
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${confirmEmail === transferTarget.email ? "#b91c1c" : "#e2e8f0"}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                {transferError && (
                  <div style={{ marginBottom: 16, fontSize: 13, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px" }}>
                    {transferError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={closeTransferModal} disabled={transferring} style={{ padding: "8px 18px", background: "#fff", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleTransferConfirm}
                    disabled={transferring || confirmEmail !== transferTarget.email}
                    style={{ padding: "8px 18px", background: "#b91c1c", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: (transferring || confirmEmail !== transferTarget.email) ? "default" : "pointer", opacity: (transferring || confirmEmail !== transferTarget.email) ? 0.4 : 1 }}
                  >
                    {transferring ? (
                      <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Transferring...</>
                    ) : (
                      "Transfer Super Admin permanently"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {nameEditTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 6 }}>Edit backoffice user name</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>
              This changes the display name used inside the backoffice. Email and role stay unchanged.
            </div>

            <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#475569" }}>
                First name
                <input
                  value={nameEditForm.firstName}
                  onChange={(event) => setNameEditForm((current) => ({ ...current, firstName: event.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#475569" }}>
                Last name
                <input
                  value={nameEditForm.lastName}
                  onChange={(event) => setNameEditForm((current) => ({ ...current, lastName: event.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </label>
            </div>

            {nameEditError && (
              <div style={{ marginBottom: 16, fontSize: 13, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px" }}>
                {nameEditError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setNameEditTarget(null); setNameEditError(""); }}
                disabled={savingNameEdit}
                style={{ padding: "8px 18px", background: "#fff", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNameEdit}
                disabled={savingNameEdit}
                style={{ padding: "8px 18px", background: "#6B21E8", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: savingNameEdit ? "default" : "pointer", opacity: savingNameEdit ? 0.7 : 1 }}
              >
                {savingNameEdit ? "Saving..." : "Save name"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }}>
          <div data-testid="delete-user-modal" style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 8 }}>Delete User</div>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 20, lineHeight: 1.6 }}>
              Are you sure you want to permanently delete <strong>{deleteTarget.email}</strong>? This action cannot be undone.
            </div>

            {deleteError && (
              <div style={{ marginBottom: 16, fontSize: 13, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px" }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(""); }}
                disabled={deleting}
                style={{ padding: "8px 18px", background: "#fff", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                data-testid="delete-confirm-btn"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{ padding: "8px 18px", background: "#b91c1c", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      {activityUser && (
        <div onClick={closeActivityLog} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }}>
          <div data-testid="activity-log-modal" onClick={(event) => event.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 0, maxWidth: "min(1560px, calc(100vw - 96px))", width: "96vw", maxHeight: "86vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 72px rgba(15,23,42,0.28)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>User activity</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{displayName(activityUser)} - {activityUser.email}</div>
              </div>
              <button
                onClick={closeActivityLog}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8", lineHeight: 1 }}
              >
                x
              </button>
            </div>

            <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid #f1f5f9", display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                {([
                  { key: "all" as const, label: "All activity", count: activitySourceCounts.all },
                  { key: "log" as const, label: "Audit logs", count: activitySourceCounts.log },
                  { key: "audit-trail" as const, label: "Audit trail", count: activitySourceCounts["audit-trail"] },
                ]).map((tab) => {
                  const active = activitySource === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setActivitySource(tab.key);
                        setActivityAction("");
                        if (tab.key === "log") {
                          setActivityResult("");
                        }
                      }}
                      style={{
                        border: `1px solid ${active ? "#6B21E8" : "#e2e8f0"}`,
                        background: active ? "#f5f3ff" : "#fff",
                        borderRadius: 12,
                        padding: "12px 14px",
                        textAlign: "left",
                        cursor: "pointer",
                        boxShadow: active ? "0 10px 24px rgba(107,33,232,0.12)" : "none",
                      }}
                    >
                      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: active ? "#6B21E8" : "#94a3b8", fontWeight: 800 }}>{tab.label}</div>
                      <div style={{ marginTop: 4, fontSize: 22, color: "#0f172a", fontWeight: 800 }}>{tab.count}</div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end" }}>
                <label style={{ display: "grid", gap: 5, fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", minWidth: 150, flex: "1 1 150px" }}>
                  From
                  <input
                    type="date"
                    value={activityFromDate}
                    max={activityToDate || undefined}
                    onChange={(event) => {
                      const next = event.target.value;
                      setActivityFromDate(next);
                      if (activityToDate && next && activityToDate < next) setActivityToDate(next);
                    }}
                    style={{ minWidth: 0, border: "1px solid #dbe4f0", borderRadius: 9, padding: "8px 10px", color: "#0f172a", fontSize: 13, background: "#fff" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 5, fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", minWidth: 150, flex: "1 1 150px" }}>
                  To
                  <input
                    type="date"
                    value={activityToDate}
                    min={activityFromDate || undefined}
                    onChange={(event) => setActivityToDate(event.target.value)}
                    style={{ minWidth: 0, border: "1px solid #dbe4f0", borderRadius: 9, padding: "8px 10px", color: "#0f172a", fontSize: 13, background: "#fff" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 5, fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", minWidth: 190, flex: "1 1 190px" }}>
                  {activitySource === "audit-trail" ? "Event" : "Action"}
                  <select value={activityAction} onChange={(event) => setActivityAction(event.target.value)} style={{ minWidth: 0, border: "1px solid #dbe4f0", borderRadius: 9, padding: "8px 10px", color: "#0f172a", fontSize: 13, background: "#fff" }}>
                    <option value="">All actions</option>
                    {activityActionOptions.map((action) => (
                      <option key={action} value={action}>{formatAction(action)}</option>
                    ))}
                  </select>
                </label>

                {showActivityResultFilter && (
                  <label style={{ display: "grid", gap: 5, fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", minWidth: 150, flex: "1 1 150px" }}>
                    Result
                    <select value={activityResult} onChange={(event) => setActivityResult(event.target.value as ActivityResultFilter)} style={{ minWidth: 0, border: "1px solid #dbe4f0", borderRadius: 9, padding: "8px 10px", color: "#0f172a", fontSize: 13, background: "#fff" }}>
                      <option value="">All results</option>
                      <option value="success">Success</option>
                      <option value="failed">Failed</option>
                    </select>
                  </label>
                )}

                {showActivityAppFilter && (
                  <label style={{ display: "grid", gap: 5, fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", minWidth: 170, flex: "1 1 170px" }}>
                    App
                    <select value={activityApp} onChange={(event) => setActivityApp(event.target.value)} style={{ minWidth: 0, border: "1px solid #dbe4f0", borderRadius: 9, padding: "8px 10px", color: "#0f172a", fontSize: 13, background: "#fff" }}>
                      <option value="">All apps</option>
                      {activityAppOptions.filter((option) => option.value).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                <div style={{ minWidth: 140, flex: "0 0 140px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActivitySource("all");
                      setActivityAction("");
                      setActivityResult("");
                      setActivityApp("");
                      setActivityFromDate("");
                      setActivityToDate("");
                    }}
                    style={{ width: "100%", border: "1px solid #dbe4f0", borderRadius: 9, padding: "8px 10px", background: "#f8fafc", color: "#475569", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ overflowX: "auto", overflowY: "auto", flex: 1, padding: "8px 0" }}>
              {selectedActivityLog && (
                <div style={{ margin: "8px 24px 14px", border: "1px solid #dbe4f0", borderRadius: 14, overflow: "hidden", background: "#f8fafc" }}>
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Selected activity</div>
                      <div style={{ marginTop: 3, color: "#0f172a", fontWeight: 800 }}>{formatAction(selectedActivityLog.action)}</div>
                    </div>
                    <button type="button" onClick={() => setSelectedActivityLog(null)} style={{ border: "1px solid #dbe4f0", borderRadius: 8, background: "#fff", color: "#64748b", padding: "5px 9px", cursor: "pointer" }}>
                      Close details
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, padding: "12px 14px" }}>
                    {[
                      ["Source", getActivitySourceLabel(selectedActivityLog.source)],
                      ["Time", new Date(selectedActivityLog.timestamp).toLocaleString("en-GB")],
                      ["Target", selectedActivityLog.targetLabel ?? selectedActivityLog.targetId ?? "-"],
                      ["IP address", selectedActivityLog.ipAddress ?? "-"],
                    ].map(([label, value]) => (
                      <div key={label} style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
                        <div style={{ marginTop: 3, color: "#0f172a", overflowWrap: "anywhere" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <pre style={{ margin: "0 14px 14px", maxHeight: 180, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#fff", color: "#334155", fontSize: 12, whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(selectedActivityLog.details ?? {}, null, 2)}
                  </pre>
                </div>
              )}

              {activityLoading ? (
                <div style={{ textAlign: "center", padding: "40px 24px" }}>
                  <div className="spinner-border" role="status" style={{ width: "1.5rem", height: "1.5rem", color: "#6B21E8" }} />
                </div>
              ) : activityLogs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 24px", color: "#94a3b8", fontSize: 13 }}>No activity found for the selected filters.</div>
              ) : (
                <table style={{ width: "100%", minWidth: 1120, borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["Time", "Source", "Action", "Target", "Details", "IP", ""].map((heading) => (
                        <th key={heading} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map((log) => {
                      const result = getActivityResult(log.action);
                      return (
                        <tr key={`${log.source}-${log.logId}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 14px", color: "#475569", whiteSpace: "nowrap" }}>{new Date(log.timestamp).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ borderRadius: 999, padding: "3px 8px", background: log.source === "audit-trail" ? "#eef2ff" : "#f5f3ff", color: log.source === "audit-trail" ? "#3730a3" : "#6B21E8", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{getActivitySourceLabel(log.source)}</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>{formatAction(log.action)}</div>
                            {result && <span style={{ display: "inline-block", marginTop: 4, borderRadius: 999, padding: "2px 7px", background: result === "success" ? "#f0fdf4" : "#fef2f2", color: result === "success" ? "#15803d" : "#b91c1c", fontSize: 10, fontWeight: 800 }}>{result}</span>}
                          </td>
                          <td style={{ padding: "12px 14px", color: "#475569", maxWidth: 210 }}>
                            <div style={{ fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.targetLabel ?? log.targetId ?? "No target"}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{log.targetType}</div>
                          </td>
                          <td style={{ padding: "12px 14px", color: "#64748b", maxWidth: 320 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getActivitySummary(log)}</div>
                          </td>
                          <td style={{ padding: "12px 14px", color: "#64748b", whiteSpace: "nowrap" }}>{log.ipAddress ?? "-"}</td>
                          <td style={{ padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              onClick={() => setSelectedActivityLog(log)}
                              style={{ border: "1px solid #dbe4f0", borderRadius: 8, background: selectedActivityLog?.logId === log.logId ? "#f5f3ff" : "#fff", color: "#6B21E8", padding: "5px 9px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Showing {activityTotalItems === 0 ? 0 : (activityPage - 1) * ACTIVITY_PAGE_SIZE + 1}-{Math.min(activityPage * ACTIVITY_PAGE_SIZE, activityTotalItems)} of {activityTotalItems} activities
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  disabled={activityLoading || activityPage <= 1}
                  onClick={() => setActivityPage((current) => Math.max(1, current - 1))}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: activityLoading || activityPage <= 1 ? "default" : "pointer", opacity: activityLoading || activityPage <= 1 ? 0.5 : 1 }}
                >
                  Prev
                </button>
                <span style={{ fontSize: 12, color: "#64748b", minWidth: 92, textAlign: "center" }}>
                  Page {activityPage} / {activityTotalPages}
                </span>
                <button
                  type="button"
                  disabled={activityLoading || activityPage >= activityTotalPages}
                  onClick={() => setActivityPage((current) => Math.min(activityTotalPages, current + 1))}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: activityLoading || activityPage >= activityTotalPages ? "default" : "pointer", opacity: activityLoading || activityPage >= activityTotalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Access Modal */}
      {accessTarget && (
        <div className="perm-modal-backdrop" onClick={closeAccessModal}>
          <div className="perm-modal" data-testid="manage-access-modal" onClick={(e) => e.stopPropagation()}>
            <div className="perm-modal__header">
              <div className="perm-modal__title">
                <i className="bi bi-shield-lock me-2" />
                Manage Access
              </div>
              <button className="perm-modal__close" onClick={closeAccessModal} aria-label="Close">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="perm-modal__body">
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{displayName(accessTarget)}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{accessTarget.email}</div>
              </div>

              {currentUserIsSuperAdmin && (
                <div style={{ marginBottom: 18 }}>
                  <label className="form-label perm-modal__label" htmlFor="access-backoffice-role">
                    Global backoffice role
                  </label>
                  <select
                    id="access-backoffice-role"
                    className="form-select form-select-sm"
                    value={draftBackofficeRoleId}
                    onChange={(event) => setBackofficeRole(event.target.value)}
                  >
                    <option value="">No global backoffice role</option>
                    {assignableBackofficeRoles.map((role) => (
                      <option key={role.roleId} value={role.roleId}>{role.name}</option>
                    ))}
                  </select>
                  {hasDraftBackofficeRole && (
                    <div className="form-text">
                      Backoffice roles are global and replace all application-specific roles.
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "grid", gap: 14 }}>
                {applicationRoleApps.map((app) => {
                  const appRoles = roles.filter((role) => !role.isDefault && role.application === app);
                  const selectedRoleId =
                    accessDraftRoleIds.find((roleId) => roleById.get(roleId)?.application === app) ?? "";

                  return (
                    <div key={app}>
                      <label className="form-label perm-modal__label" htmlFor={`access-role-${app}`}>
                        {APPLICATION_LABELS[app]}
                      </label>
                      <select
                        id={`access-role-${app}`}
                        className="form-select form-select-sm"
                        value={selectedRoleId}
                        disabled={hasDraftBackofficeRole}
                        onChange={(event) => setApplicationRole(app, event.target.value)}
                      >
                        <option value="">No role</option>
                        {appRoles.map((role) => (
                          <option key={role.roleId} value={role.roleId}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {accessError && (
                <div className="perm-modal__error">
                  <i className="bi bi-exclamation-circle-fill me-1" />
                  {accessError}
                </div>
              )}
            </div>

            <div className="perm-modal__footer">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={closeAccessModal}
                disabled={savingAccess}
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="save-access-btn"
                className="btn btn-sm btn-primary"
                onClick={() => void handleSaveAccess()}
                disabled={savingAccess}
              >
                {savingAccess ? "Saving..." : "Save access"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showCreate && (
        <div className="perm-modal-backdrop" onClick={cancelCreate}>
          <div className="perm-modal" data-testid="create-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="perm-modal__header">
              <div className="perm-modal__title">
                <i className="bi bi-person-plus me-2" />
                Add Admin
              </div>
              <button className="perm-modal__close" onClick={cancelCreate} aria-label="Close">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); void handleCreate(); }}>
              <div className="perm-modal__body">
                <div className="mb-3">
                  <label className="form-label perm-modal__label" htmlFor="admin-email">
                    Email address
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    data-testid="create-admin-email"
                    className="form-control form-control-sm"
                    placeholder="admin@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    autoFocus
                    autoComplete="off"
                  />
                  <div className="form-text">A temporary password will be sent to this email.</div>
                </div>

                <div className="mb-3">
                  <label className="form-label perm-modal__label" htmlFor="admin-first-name">
                    First name
                    <span className="text-muted fw-normal ms-1">(optional)</span>
                  </label>
                  <input
                    id="admin-first-name"
                    type="text"
                    data-testid="create-admin-first-name"
                    className="form-control form-control-sm"
                    placeholder="e.g. Joao"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    autoComplete="off"
                  />
                </div>

                <div className="mb-1">
                  <label className="form-label perm-modal__label" htmlFor="admin-last-name">
                    Last name
                    <span className="text-muted fw-normal ms-1">(optional)</span>
                  </label>
                  <input
                    id="admin-last-name"
                    type="text"
                    data-testid="create-admin-last-name"
                    className="form-control form-control-sm"
                    placeholder="e.g. Silva"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    autoComplete="off"
                  />
                </div>

                {createError && (
                  <div className="perm-modal__error">
                    <i className="bi bi-exclamation-circle-fill me-1" />
                    {createError}
                  </div>
                )}
              </div>

              <div className="perm-modal__footer">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={cancelCreate}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button type="submit" data-testid="create-admin-submit" className="btn btn-sm btn-primary" disabled={creating}>
                  {creating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Creating...
                    </>
                  ) : (
                    "Create Admin"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div
        className="admin-users__panel"
        data-testid="users-panel"
        style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", width: "100%" }}
      >
        {/* Toolbar */}
        <div
          className="admin-users__toolbar"
          style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
        >
          <div className="admin-users__search" style={{ position: "relative", flex: 1, maxWidth: 320, minWidth: 200 }}>
            <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14 }} />
            <input
              type="text"
              data-testid="users-search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none" }}
            />
          </div>
          <span className="admin-users__count" data-testid="users-count" style={{ fontSize: 13, color: "#64748b", marginLeft: "auto" }}>
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </span>
          {canManageAdmins && currentUserIsSuperAdmin && (
            <button
              data-testid="add-admin-btn"
              onClick={() => setShowCreate(true)}
              style={{ padding: "7px 16px", background: "#6B21E8", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <i className="bi bi-plus-lg" />
              Add Admin
            </button>
          )}
        </div>


        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
            <div className="spinner-border" role="status" style={{ width: "1.8rem", height: "1.8rem", color: "#6B21E8" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8", fontSize: 14 }}>
            No backoffice users found.
          </div>
        ) : (
          <div className="admin-users__table">
            <table className="admin-users-table" data-testid="users-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  {["User", "Email", "Role", "Status", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const statusCfg     = STATUS_BADGE[u.status] ?? STATUS_BADGE.ACTIVE;
                  const isActing      = actingId === u.userId;
                  const userRoles = getUserRoles(u);
                  const primaryRole = getPrimaryRole(u);
                  const assignedRoleIds = getUserRoleIds(u);
                  const rowRoleName = (primaryRole?.name ?? u.roleName ?? "").toLowerCase();
                  const isSuperAdmin =
                    (superAdminRoleId !== undefined && assignedRoleIds.includes(superAdminRoleId)) ||
                    rowRoleName === SUPER_ADMIN_NAME.toLowerCase();
                  const isBackofficeAdmin =
                    (backofficeAdminRoleId !== undefined && assignedRoleIds.includes(backofficeAdminRoleId)) ||
                    rowRoleName === BACKOFFICE_ADMIN_NAME.toLowerCase();
                  const targetRoleApplication = primaryRole?.application ?? u.roleApplication;
                  const targetIsBackofficeRole = targetRoleApplication === "backoffice";
                  const isSelf        = u.userId === authUser?.boUserId;
                  const canManageTargetUser =
                    canManageAdmins &&
                    !isSelf &&
                    (currentUserIsSuperAdmin || !targetIsBackofficeRole);
                  const canChangeTargetRole = canManageTargetUser;
                  const canViewActivityAction = canViewAdminLogs;
                  const canEditNameAction = currentUserIsSuperAdmin;
                  const canToggleStatusAction = canManageTargetUser && u.cognitoStatus !== "FORCE_CHANGE_PASSWORD";
                  const canTransferSuperAdminAction = currentUserIsSuperAdmin && !isSelf && !isSuperAdmin;
                  const canDeleteAction = canManageTargetUser;
                  const hasAvailableActions =
                    canViewActivityAction ||
                    canEditNameAction ||
                    canToggleStatusAction ||
                    canTransferSuperAdminAction ||
                    canDeleteAction;

                  return (
                    <tr key={u.userId} data-testid="user-row" style={{ borderBottom: "1px solid #f8fafc" }}>
                      {/* User */}
                      <td data-label="User" style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: isSuperAdmin ? "#fdf4ff" : "#f3ebff",
                            color: isSuperAdmin ? "#7e22ce" : "#6B21E8",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, fontSize: 13, flexShrink: 0,
                          }}>
                            {initials(u)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: "#0f172a" }}>{displayName(u)}</div>
                            {isSuperAdmin && (
                              <div style={{ fontSize: 10, color: "#7e22ce", fontWeight: 600, marginTop: 1 }}>
                                <i className="bi bi-shield-fill-check" style={{ marginRight: 3 }} />SUPER ADMIN
                              </div>
                            )}
                            {!isSuperAdmin && isBackofficeAdmin && (
                              <div style={{ fontSize: 10, color: "#0f766e", fontWeight: 600, marginTop: 1 }}>
                                <i className="bi bi-shield-lock" style={{ marginRight: 3 }} />BACKOFFICE ADMIN
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td data-label="Email" style={{ padding: "12px 16px", maxWidth: 220, width: 220 }}>
                        <div style={{ color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                      </td>

                      {/* Role */}
                      <td data-label="Role" style={{ padding: "12px 16px" }}>
                        {isSuperAdmin ? (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: "#fdf4ff", color: "#7e22ce" }}>
                            Super Admin
                          </span>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            {userRoles.length === 0 ? (
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: "#f8fafc", color: "#64748b" }}>
                                No access
                              </span>
                            ) : (
                              userRoles.map((role) => {
                                const badgeStyle = ROLE_BADGE_STYLE[role.application];

                                return (
                                  <span
                                    key={role.roleId}
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      padding: "3px 9px",
                                      borderRadius: 20,
                                      background: badgeStyle.bg,
                                      color: badgeStyle.color,
                                    }}
                                  >
                                    {getRoleBadgeLabel(role)}
                                  </span>
                                );
                              })
                            )}
                            {canChangeTargetRole && (
                              <button
                                type="button"
                                onClick={() => openAccessModal(u)}
                                style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer" }}
                              >
                                Manage access
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td data-label="Status" style={{ padding: "12px 16px" }}>
                        {u.cognitoStatus === "FORCE_CHANGE_PASSWORD" ? (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: STATUS_BADGE.PENDING.bg, color: STATUS_BADGE.PENDING.color }}>
                            Pending Setup
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: statusCfg.bg, color: statusCfg.color }}>
                            {u.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td data-label="Actions" style={{ padding: "12px 16px" }}>
                        {isActing ? (
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: "1rem", height: "1rem", color: "#6B21E8" }} />
                        ) : (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {/* Activity log */}
                            {canViewActivityAction && (
                              <button
                                data-testid="user-activity-btn"
                                onClick={() => openActivityLog(u)}
                                title="View activity log"
                                style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", cursor: "pointer" }}
                              >
                                <i className="bi bi-clock-history" style={{ marginRight: 4 }} />
                                Activity
                              </button>
                            )}

                            {canEditNameAction && (
                              <button
                                onClick={() => openNameEdit(u)}
                                title="Edit backoffice display name"
                                style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #ddd6fe", background: "#f5f3ff", color: "#6B21E8", cursor: "pointer" }}
                              >
                                <i className="bi bi-pencil" style={{ marginRight: 4 }} />
                                Edit name
                              </button>
                            )}


                            {/* Activate / Deactivate: not for Super Admin, not while pending setup, not for self */}
                            {canToggleStatusAction && (
                              u.status === "ACTIVE" ? (
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #fde68a", background: "#fef3c7", color: "#92400e", cursor: "pointer" }}
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#15803d", cursor: "pointer" }}
                                >
                                  Reactivate
                                </button>
                              )
                            )}

                            {/* Transfer Super Admin: only SA can see this, only on non-SA rows, not self */}
                            {canTransferSuperAdminAction && (
                              <button
                                onClick={() => openTransferModal(u)}
                                title="Transfer Super Admin to this user"
                                style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #e9d5ff", background: "#fdf4ff", color: "#7e22ce", cursor: "pointer" }}
                              >
                                <i className="bi bi-shield-fill-up" style={{ marginRight: 4 }} />
                                Transfer SA
                              </button>
                            )}

                            {/* Delete: not for Super Admin, not for self */}
                            {canDeleteAction && (
                              <button
                                onClick={() => { setDeleteTarget(u); setDeleteError(""); }}
                                style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", cursor: "pointer" }}
                              >
                                <i className="bi bi-trash3" style={{ marginRight: 4 }} />
                                Delete
                              </button>
                            )}

                            {!hasAvailableActions && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>
                                No actions available
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
