import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useRoles } from "@/features/roles/model/useRoles";
import { useRoleUpdate } from "@/features/roles/model/useRoleUpdate";
import { RolesService, type AdminUserSummary } from "@/features/roles/api/RolesService";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  CATEGORY_LABELS,
  ROLE_METADATA,
  APPLICATION_LABELS,
  getPermissionLabel,
  type RoleDTO,
  type PermissionDTO,
  type PermissionCategory,
  type RoleApplication,
} from "@/features/roles/model/types";
import "./roles-permissions.css";

const APPLICATIONS: RoleApplication[] = ["backoffice", "just_causes"];

const SUPER_ADMIN_NAME = "Super Admin";
const BACKOFFICE_ADMIN_NAME = "Backoffice Admin";
const SEEDED_ROLE_IDS = new Set([
  "r0000000-0000-4000-8000-000000000001",
  "r0000001-0000-4000-8000-000000000001",
  "r0000002-0000-4000-8000-000000000001",
  "r0000003-0000-4000-8000-000000000001",
  "r0000004-0000-4000-8000-000000000001",
  "r0000005-0000-4000-8000-000000000001",
  "r0000006-0000-4000-8000-000000000001",
  "r0000007-0000-4000-8000-000000000001",
  "r0000008-0000-4000-8000-000000000001",
]);

// ─── New Role Modal ───────────────────────────────────────────
interface NewRoleModalProps {
  applications: RoleApplication[];
  onCreated: () => void;
  onClose: () => void;
}

function NewRoleModal({ applications, onCreated, onClose }: NewRoleModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [application, setApplication] = useState<RoleApplication>(
    applications.includes("just_causes") ? "just_causes" : applications[0],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      nameRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await RolesService.createRole(trimmed, description.trim() || undefined, application);
      onCreated();
    } catch (err: unknown) {
      let msg: string | null = null;
      if (err && typeof err === "object" && "response" in err) {
        const m = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
        if (typeof m === "string") msg = m;
      }
      setError(msg ?? "Failed to create role. It may already exist.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="perm-modal-backdrop" onClick={onClose}>
      <div className="perm-modal" data-testid="new-role-modal" onClick={(e) => e.stopPropagation()}>
        <div className="perm-modal__header">
          <div className="perm-modal__title">
            <i className="bi bi-person-badge me-2" />
            New Role
          </div>
          <button className="perm-modal__close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="perm-modal__body">
            <div className="mb-3">
              <label className="form-label perm-modal__label" htmlFor="role-name">
                Role name
              </label>
              <input
                ref={nameRef}
                id="role-name"
                data-testid="new-role-name"
                className="form-control form-control-sm"
                placeholder="e.g. Content Reviewer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                autoComplete="off"
              />
              <div className="form-text">Must be unique.</div>
            </div>

            <div className="mb-3">
              <label className="form-label perm-modal__label" htmlFor="role-application">
                Application
              </label>
              <select
                id="role-application"
                data-testid="new-role-application"
                className="form-select form-select-sm"
                value={application}
                onChange={(e) => setApplication(e.target.value as RoleApplication)}
              >
                {applications.map((app) => (
                  <option key={app} value={app}>{APPLICATION_LABELS[app]}</option>
                ))}
              </select>
            </div>

            <div className="mb-1">
              <label className="form-label perm-modal__label" htmlFor="role-description">
                Description
                <span className="text-muted fw-normal ms-1">(optional)</span>
              </label>
              <textarea
                id="role-description"
                data-testid="new-role-description"
                className="form-control form-control-sm"
                placeholder="e.g. Reviews content and moderates reports"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {error && (
              <div className="perm-modal__error">
                <i className="bi bi-exclamation-circle-fill me-1" />
                {error}
              </div>
            )}
          </div>

          <div className="perm-modal__footer">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" data-testid="new-role-submit" className="btn btn-sm btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  Creating…
                </>
              ) : (
                "Create Role"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Permission group column ─────────────────────────────────
interface PermissionGroupProps {
  category: PermissionCategory;
  permissions: PermissionDTO[];
  enabledPerms: string[];
  onToggle: (permName: string) => void;
  disabled?: boolean;
}

function PermissionGroup({ category, permissions, enabledPerms, onToggle, disabled = false }: PermissionGroupProps) {
  const perms = permissions.filter((p) => p.category === category);

  return (
    <div>
      <div className="permission-group__label">{CATEGORY_LABELS[category]}</div>
      {perms.length === 0 ? (
        <div className="permission-group__empty">No permissions in this category</div>
      ) : (
        perms.map((perm) => (
          <div key={perm.name} className="permission-toggle">
            <label className="permission-toggle__label" htmlFor={`perm-${perm.name}`}>
              {getPermissionLabel(perm.name)}
            </label>
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id={`perm-${perm.name}`}
                checked={enabledPerms.includes(perm.name)}
                onChange={() => onToggle(perm.name)}
                disabled={disabled}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Role card ───────────────────────────────────────────────
interface RoleCardProps {
  role: RoleDTO;
  permissions: PermissionDTO[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  onSaved: () => Promise<void>;
  savePermissions: (role: RoleDTO, draftPermNames: string[]) => Promise<void>;
  resolveInitialPerms: (role: RoleDTO) => string[];
  readOnly?: boolean;
}

function RoleCard({
  role,
  permissions,
  isExpanded,
  onToggleExpand,
  onDelete,
  isDeleting,
  onSaved,
  savePermissions,
  resolveInitialPerms,
  readOnly = false,
}: RoleCardProps) {
  const isLocked = role.name === SUPER_ADMIN_NAME;
  const isSeeded = SEEDED_ROLE_IDS.has(role.roleId);
  const isPredefined = isSeeded || role.name in ROLE_METADATA;
  const description = role.description ?? ROLE_METADATA[role.name]?.description ?? "Custom role";
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftName, setDraftName] = useState(role.name);

  const initial = resolveInitialPerms(role);
  const initialKey = [...initial].sort().join(",");

  const [draftPerms, setDraftPerms] = useState<string[]>(initial);
  const [trackedKey, setTrackedKey] = useState(initialKey);

  // Sync draft when role permissions change after save + reload
  if (initialKey !== trackedKey) {
    setDraftPerms(initial);
    setTrackedKey(initialKey);
  }

  useEffect(() => {
    if (!isSavingName) setDraftName(role.name);
  }, [role.name, isSavingName]);

  const isDirty = [...draftPerms].sort().join(",") !== initialKey;
  const isNameDirty = draftName.trim() !== role.name;

  const visibleCategories: PermissionCategory[] =
    role.application === "backoffice" ? ["admin"] : ["view", "action"];
  const rolePermissions = permissions.filter((permission) => permission.application === role.application);

  function handleToggle(permName: string) {
    if (readOnly) return;
    setDraftPerms((prev) =>
      prev.includes(permName) ? prev.filter((p) => p !== permName) : [...prev, permName],
    );
  }

  function handleDiscard() {
    setDraftPerms(initial);
    setSaveError(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await savePermissions(role, draftPerms);
      await onSaved();
    } catch {
      setSaveError(`Failed to save permissions for "${role.name}". Please try again.`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveName() {
    const nextName = draftName.trim();
    if (!nextName || nextName === role.name) return;

    setIsSavingName(true);
    setSaveError(null);
    try {
      await RolesService.updateRole(role.roleId, { name: nextName });
      await onSaved();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setSaveError(message ?? `Failed to rename "${role.name}". Please try again.`);
    } finally {
      setIsSavingName(false);
    }
  }

  return (
    <div className={`role-card${isLocked || readOnly ? " role-card--locked" : ""}`} data-testid="role-card">
      <div className="role-card__header" data-testid="role-card-header" onClick={isLocked || readOnly ? undefined : onToggleExpand}>
        <div className="role-card__icon">
          <i className={`bi ${isLocked ? "bi-star-fill" : "bi-person-badge"}`} />
        </div>

        <div className="role-card__meta">
          <div className="role-card__name">{role.name}</div>
          <div className="role-card__description">{description}</div>
        </div>

        <div className="role-card__badges">
          {isLocked ? (
            <span className="role-badge role-badge--unrestricted">Unrestricted</span>
          ) : (
            <>
              {isDirty && !isExpanded && (
                <span className="role-badge" style={{ background: "#fefce8", color: "#92400e", border: "1px solid #fde68a" }}>
                  Unsaved
                </span>
              )}
              {!readOnly && !isPredefined && (
                isDeleting ? (
                  <span
                    className="spinner-border spinner-border-sm text-danger"
                    role="status"
                    style={{ width: "1rem", height: "1rem" }}
                  />
                ) : confirmingDelete ? (
                  <div
                    className="role-card__confirm-delete"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="role-card__confirm-text">
                      Delete &ldquo;{role.name}&rdquo;?
                    </span>
                    <button
                      className="role-card__confirm-yes"
                      onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false); onDelete(); }}
                    >
                      Yes
                    </button>
                    <button
                      className="role-card__confirm-no"
                      onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false); }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    className="role-card__delete-btn"
                    onClick={(e) => { e.stopPropagation(); setConfirmingDelete(true); }}
                    aria-label={`Deactivate ${role.name}`}
                    title="Deactivate role"
                  >
                    <i className="bi bi-trash3" />
                  </button>
                )
              )}
              {!readOnly && (
                <i className={`bi bi-chevron-down role-card__chevron${isExpanded ? " open" : ""}`} />
              )}
            </>
          )}
        </div>
      </div>

      {isExpanded && !isLocked && (
        <div className="role-card__body">
          {!isSeeded && !readOnly && (
            <div className="role-card__name-editor">
              <label htmlFor={`role-name-${role.roleId}`}>Role name</label>
              <div className="role-card__name-editor-row">
                <input
                  id={`role-name-${role.roleId}`}
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  disabled={isSavingName}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setDraftName(role.name)}
                  disabled={!isNameDirty || isSavingName}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleSaveName}
                  disabled={!isNameDirty || !draftName.trim() || isSavingName}
                >
                  {isSavingName ? "Saving..." : "Save name"}
                </button>
              </div>
            </div>
          )}

          <div className="permissions-grid">
            {visibleCategories.map((cat) => (
              <PermissionGroup
                key={cat}
                category={cat}
                permissions={rolePermissions}
                enabledPerms={draftPerms}
                onToggle={handleToggle}
                disabled={readOnly}
              />
            ))}
          </div>

          {saveError && (
            <div className="perm-modal__error" style={{ marginTop: 16 }}>
              <i className="bi bi-exclamation-circle-fill me-1" />
              {saveError}
            </div>
          )}

          <div className="role-card__footer">
            <button
              className="btn btn-sm btn-outline-secondary"
              data-testid="role-card-discard-btn"
              onClick={handleDiscard}
              disabled={readOnly || !isDirty || isSaving}
            >
              Discard
            </button>
            <button
              className="btn btn-sm btn-primary"
              data-testid="role-card-save-btn"
              onClick={handleSave}
              disabled={readOnly || !isDirty || isSaving}
            >
              {isSaving ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Role Assignments Section ─────────────────────────────────
function RoleAssignmentsSection({
  roles,
  activeApp,
}: {
  roles: RoleDTO[];
  activeApp: RoleApplication;
}) {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRoleId, setFilterRoleId] = useState("");

  useEffect(() => {
    setLoading(true);
    setFilterRoleId("");
    RolesService.getAdminUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [activeApp]);

  const roleMap = Object.fromEntries(roles.map((r) => [r.roleId, r]));
  const appRoles = roles.filter((r) => !r.isDefault && r.application === activeApp);

  const appUsers = users.filter((u) => {
    const assignedRoleIds = u.roleIds ?? (u.roleId ? [u.roleId] : []);
    return assignedRoleIds.some((roleId) => {
      const r = roleMap[roleId];
      return r && !r.isDefault && r.application === activeApp;
    });
  });

  const filtered = filterRoleId
    ? appUsers.filter((u) => (u.roleIds ?? (u.roleId ? [u.roleId] : [])).includes(filterRoleId))
    : appUsers;

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 32, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>Role Assignments</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
            Admin users and their assigned roles
          </div>
        </div>
        <select
          value={filterRoleId}
          onChange={(e) => setFilterRoleId(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff", color: "#374151" }}
        >
          <option value="">All roles</option>
          {appRoles.map((r) => (
            <option key={r.roleId} value={r.roleId}>{r.name}</option>
          ))}
        </select>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", minWidth: "max-content" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
            <div className="spinner-border spinner-border-sm" role="status" style={{ color: "#6B21E8" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>
            {filterRoleId ? "No users with this role." : "No users found for this application."}
          </div>
        ) : (
          <div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["User", "Email", "Role", "Status"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const assignedRoleIds = u.roleIds ?? (u.roleId ? [u.roleId] : []);
                const role = assignedRoleIds
                  .map((roleId) => roleMap[roleId])
                  .find((r) => r?.application === activeApp);
                const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
                const initials = u.firstName && u.lastName
                  ? (u.firstName[0] + u.lastName[0]).toUpperCase()
                  : u.email.slice(0, 2).toUpperCase();
                return (
                  <tr key={u.userId} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f3ebff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#6B21E8", flexShrink: 0 }}>
                          {initials}
                        </div>
                        <span style={{ fontWeight: 500, color: "#0f172a" }}>{name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", maxWidth: 220, width: 220 }}>
                      <div style={{ color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {role ? (
                        <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: "#f3ebff", color: "#6B21E8" }}>
                          {role.name}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: u.status === "ACTIVE" ? "#f0fdf4" : "#f8fafc", color: u.status === "ACTIVE" ? "#15803d" : "#64748b" }}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────
export default function RolesPermissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser } = useAuth();
  const { roles, permissions, loading, error, reload } = useRoles();
  const { resolveInitialPerms, savePermissions } = useRoleUpdate(permissions);
  const currentRoleName = authUser?.role?.toLowerCase() ?? "";
  const currentUserIsSuperAdmin = currentRoleName === SUPER_ADMIN_NAME.toLowerCase();
  const currentUserIsBackofficeAdmin = currentRoleName === BACKOFFICE_ADMIN_NAME.toLowerCase();
  const canViewRoleAssignments =
    currentUserIsSuperAdmin || (authUser?.permissions ?? []).includes("manage_admins");
  const canUseBackofficeRoleScope = currentUserIsSuperAdmin || currentUserIsBackofficeAdmin;
  const availableApplications = useMemo(
    () => APPLICATIONS.filter((app) => app !== "backoffice" || canUseBackofficeRoleScope),
    [canUseBackofficeRoleScope],
  );

  const [activeApp, setActiveApp] = useState<RoleApplication>(
    (searchParams.get("app") as RoleApplication) === "backoffice" && canUseBackofficeRoleScope ? "backoffice" : "just_causes",
  );
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  useEffect(() => {
    if (!availableApplications.includes(activeApp)) {
      setActiveApp(availableApplications[0] ?? "just_causes");
      return;
    }

    const params = new URLSearchParams();
    if (activeApp !== "just_causes") params.set("app", activeApp);
    setSearchParams(params, { replace: true });
  }, [activeApp, availableApplications, setSearchParams]);

  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  const visibleRoles = roles.filter(
    (r) => !r.isDefault && (r.application ?? "just_causes") === activeApp,
  );

  function handleToggleExpand(roleId: string) {
    setExpandedRole((prev) => (prev === roleId ? null : roleId));
  }

  async function handleRoleCreated() {
    setShowNewRoleModal(false);
    await reload();
  }

  async function handleDeleteRole(roleId: string) {
    setDeletingRoleId(roleId);
    try {
      await RolesService.deactivateRole(roleId);
      if (expandedRole === roleId) setExpandedRole(null);
      await reload();
    } catch {
      // error silently — role stays visible
    } finally {
      setDeletingRoleId(null);
    }
  }

  if (loading) {
    return (
      <div className="roles-loading">
        <div className="spinner-border" role="status" />
        <div style={{ marginTop: 16 }}>Loading roles…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="roles-error">
        <i
          className="bi bi-exclamation-triangle"
          style={{ fontSize: 36, display: "block", marginBottom: 12 }}
        />
        <div style={{ fontWeight: 500 }}>{error}</div>
        <button className="btn btn-sm btn-outline-primary mt-3" onClick={reload}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="admin-page-header admin-page-header--row">
        <div>
          <div className="roles-title-row">
            <h1>Roles &amp; Permissions</h1>
            <button
              className="btn btn-sm btn-outline-primary perm-new-btn"
              data-testid="new-role-btn"
              onClick={() => setShowNewRoleModal(true)}
            >
              <i className="bi bi-plus-lg me-1" />
              New Role
            </button>
          </div>
          <p>
            Manage feature access for each admin role. Super Admin access cannot be modified.
          </p>
        </div>
      </div>

      {/* Application tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0", marginBottom: 24 }}>
        {availableApplications.map((app) => {
          const count = roles.filter((r) => !r.isDefault && (r.application ?? "just_causes") === app).length;
          const isActive = activeApp === app;
          return (
            <button
              key={app}
              data-testid={`tab-${app}`}
              onClick={() => { setActiveApp(app); setExpandedRole(null); }}

              style={{
                padding: "10px 20px",
                background: "none",
                border: "none",
                borderBottom: isActive ? "2px solid #6B21E8" : "2px solid transparent",
                marginBottom: -2,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#6B21E8" : "#64748b",
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {APPLICATION_LABELS[app]}
              <span style={{
                fontSize: 11,
                background: isActive ? "#f3ebff" : "#f1f5f9",
                color: isActive ? "#6B21E8" : "#94a3b8",
                borderRadius: 10,
                padding: "1px 7px",
                fontWeight: 600,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visibleRoles.length === 0 ? (
        <div className="roles-empty">
          <i
            className="bi bi-shield-x"
            style={{ fontSize: 40, display: "block", marginBottom: 12 }}
          />
          <div style={{ fontWeight: 500 }}>No roles found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {roles.length === 0
              ? "Seed the predefined roles in DynamoDB to get started."
              : `No ${APPLICATION_LABELS[activeApp]} roles yet. Create one with the button above.`}
          </div>
        </div>
      ) : (
        visibleRoles.map((role) => (
          <RoleCard
            key={role.roleId}
            role={role}
            permissions={permissions}
            isExpanded={expandedRole === role.roleId}
            onToggleExpand={() => handleToggleExpand(role.roleId)}
            onDelete={() => void handleDeleteRole(role.roleId)}
            isDeleting={deletingRoleId === role.roleId}
            onSaved={reload}
            savePermissions={savePermissions}
            resolveInitialPerms={resolveInitialPerms}
            readOnly={!currentUserIsSuperAdmin && role.name === BACKOFFICE_ADMIN_NAME}
          />
        ))
      )}

      {canViewRoleAssignments && (
        <RoleAssignmentsSection roles={roles} activeApp={activeApp} />
      )}

      {showNewRoleModal && (
        <NewRoleModal
          applications={availableApplications}
          onCreated={handleRoleCreated}
          onClose={() => setShowNewRoleModal(false)}
        />
      )}

    </>
  );
}
