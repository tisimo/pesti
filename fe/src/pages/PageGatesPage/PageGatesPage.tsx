import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { RolesService } from "@/features/roles/api/RolesService";
import { useRoles } from "@/features/roles/model/useRoles";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  CATEGORY_LABELS,
  APPLICATION_LABELS,
  getPermissionLabel,
  type PageGateDTO,
  type PermissionDTO,
  type PermissionCategory,
  type RoleApplication,
} from "@/features/roles/model/types";
import "../RolesPermissionsPage/roles-permissions.css";

const APPLICATIONS: RoleApplication[] = ["just_causes", "backoffice"];
const SUPER_ADMIN_NAME = "Super Admin";

const PAGE_SECTIONS: Record<RoleApplication, { label: string; pageKeys: string[] }[]> = {
  just_causes: [
    { label: "Dashboard",  pageKeys: ["panel_overview", "panel_analytics"] },
    { label: "Content",    pageKeys: ["panel_campaigns", "panel_campaign_revisions", "panel_reports", "panel_categories"] },
    { label: "Users",      pageKeys: ["panel_users", "panel_organizations", "panel_kyc"] },
    { label: "Finance",    pageKeys: ["panel_donations", "panel_deposits", "panel_transactions", "panel_withdrawals"] },
    { label: "Audit",      pageKeys: ["panel_logs"] },
  ],
  backoffice: [
    { label: "Management", pageKeys: ["admin_roles", "admin_users", "admin_email", "admin_page_gates"] },
    { label: "Audit",      pageKeys: ["admin_logs", "admin_audit_trail"] },
  ],
};

// ─── Page card ───────────────────────────────────────────────
interface PageCardProps {
  gate: PageGateDTO;
  permissions: PermissionDTO[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSaved: (updated: PageGateDTO) => void;
  activeApp: RoleApplication;
}

function PageCard({ gate, permissions, isExpanded, onToggleExpand, onSaved, activeApp }: PageCardProps) {
  const relevantCategories: PermissionCategory[] =
    activeApp === "backoffice" ? ["admin"] : ["view", "action"];
  const appPermissions = permissions.filter((permission) => permission.application === activeApp);

  const initialKey = [...gate.requiredPermissions].sort().join(",");

  const [draftPerms, setDraftPerms] = useState<string[]>(gate.requiredPermissions);
  const [trackedKey, setTrackedKey] = useState(initialKey);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync draft when gate.requiredPermissions changes after save
  if (initialKey !== trackedKey) {
    setDraftPerms(gate.requiredPermissions);
    setTrackedKey(initialKey);
  }

  const isDirty = [...draftPerms].sort().join(",") !== initialKey;
  const requiredCount = gate.requiredPermissions.length;

  function handleToggle(permName: string) {
    setDraftPerms((prev) =>
      prev.includes(permName) ? prev.filter((p) => p !== permName) : [...prev, permName],
    );
  }

  function handleDiscard() {
    setDraftPerms(gate.requiredPermissions);
    setSaveError(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await RolesService.updatePageGate(gate.gateId, draftPerms);
      onSaved(updated);
    } catch {
      setSaveError(`Failed to save "${gate.label}". Please try again.`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="role-card" data-testid="page-card">
      <div className="role-card__header" data-testid="page-card-header" onClick={onToggleExpand}>
        <div className="role-card__icon">
          <i className="bi bi-file-text" />
        </div>

        <div className="role-card__meta">
          <div className="role-card__name">{gate.label}</div>
          <div className="role-card__description">{gate.description}</div>
        </div>

        <div className="role-card__badges">
          {isDirty && !isExpanded && (
            <span className="role-badge" style={{ background: "#fefce8", color: "#92400e", border: "1px solid #fde68a" }}>
              Unsaved
            </span>
          )}
          {requiredCount === 0 ? (
            <span className="role-badge" style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
              Open
            </span>
          ) : (
            <span className="role-badge" style={{ background: "#f3ebff", color: "#6B21E8", border: "1px solid #c7d7f8" }}>
              {requiredCount} perm{requiredCount !== 1 ? "s" : ""}
            </span>
          )}
          <i className={`bi bi-chevron-down role-card__chevron${isExpanded ? " open" : ""}`} />
        </div>
      </div>

      {isExpanded && (
        <div className="role-card__body">
          <div className="permissions-grid">
            {relevantCategories.map((cat) => {
              const perms = appPermissions.filter((p) => p.category === cat);
              return (
                <div key={cat}>
                  <div className="permission-group__label">{CATEGORY_LABELS[cat]}</div>
                  {perms.length === 0 ? (
                    <div className="permission-group__empty">No permissions in this category</div>
                  ) : (
                    perms.map((perm) => (
                      <div key={perm.name} className="permission-toggle">
                        <label
                          className="permission-toggle__label"
                          htmlFor={`${gate.gateId}-${perm.name}`}
                        >
                          {getPermissionLabel(perm.name)}
                        </label>
                        <div className="form-check form-switch mb-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id={`${gate.gateId}-${perm.name}`}
                            checked={draftPerms.includes(perm.name)}
                            onChange={() => handleToggle(perm.name)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
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
              data-testid="page-card-discard-btn"
              onClick={handleDiscard}
              disabled={!isDirty || isSaving}
            >
              Discard
            </button>
            <button
              className="btn btn-sm btn-primary"
              data-testid="page-card-save-btn"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
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

// ─── Page ────────────────────────────────────────────────────
export default function PageGatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser } = useAuth();
  const { permissions, loading: permsLoading } = useRoles();
  const currentUserIsSuperAdmin = authUser?.role?.toLowerCase() === SUPER_ADMIN_NAME.toLowerCase();
  const availableApplications = useMemo(
    () => APPLICATIONS.filter((app) => app !== "backoffice" || currentUserIsSuperAdmin),
    [currentUserIsSuperAdmin],
  );
  const [gates, setGates] = useState<PageGateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState<RoleApplication>(
    (searchParams.get("app") as RoleApplication) === "backoffice" && currentUserIsSuperAdmin ? "backoffice" : "just_causes",
  );
  const [expandedGate, setExpandedGate] = useState<string | null>(null);

  useEffect(() => {
    if (!availableApplications.includes(activeApp)) {
      setActiveApp(availableApplications[0] ?? "just_causes");
      return;
    }

    const params = new URLSearchParams();
    if (activeApp !== "just_causes") params.set("app", activeApp);
    setSearchParams(params, { replace: true });
  }, [activeApp, availableApplications, setSearchParams]);

  useEffect(() => {
    RolesService.getPageGates()
      .then(setGates)
      .catch(() => setError("Failed to load page gates."))
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(updated: PageGateDTO) {
    setGates((prev) => prev.map((g) => (g.gateId === updated.gateId ? updated : g)));
  }

  const visibleGates = gates.filter((g) => g.application === activeApp);

  if (loading || permsLoading) {
    return (
      <div className="roles-loading">
        <div className="spinner-border" role="status" />
        <div style={{ marginTop: 16 }}>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="roles-error">
        <i className="bi bi-exclamation-triangle" style={{ fontSize: 36, display: "block", marginBottom: 12 }} />
        <div style={{ fontWeight: 500 }}>{error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-page-header admin-page-header--row">
        <div>
          <h1>Page Access Config</h1>
          <p>
            Configure which permissions are required to view each page.
            <strong>When multiple permissions are listed, users only need one of them (OR logic)</strong>.
            Super Admin always bypasses all gates.
          </p>
        </div>
      </div>

      {/* Application tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0", marginBottom: 24 }}>
        {availableApplications.map((app) => {
          const count = gates.filter((g) => g.application === app).length;
          const isActive = activeApp === app;
          return (
            <button
              key={app}
              data-testid={`tab-${app}`}
              onClick={() => { setActiveApp(app); setExpandedGate(null); }}
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

      {visibleGates.length === 0 ? (
        <div className="roles-empty">
          <i className="bi bi-file-x" style={{ fontSize: 40, display: "block", marginBottom: 12 }} />
          <div style={{ fontWeight: 500 }}>No pages configured for this app.</div>
        </div>
      ) : (
        PAGE_SECTIONS[activeApp].map((section) => {
          const sectionGates = section.pageKeys
            .map((key) => visibleGates.find((g) => g.pageKey === key))
            .filter((g): g is PageGateDTO => g !== undefined);
          if (sectionGates.length === 0) return null;
          return (
            <div key={section.label} style={{ marginBottom: 32 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#94a3b8",
                marginBottom: 10,
                paddingBottom: 6,
                borderBottom: "1px solid #f1f5f9",
              }}>
                {section.label}
              </div>
              {sectionGates.map((gate) => (
                <PageCard
                  key={gate.gateId}
                  gate={gate}
                  permissions={permissions}
                  isExpanded={expandedGate === gate.gateId}
                  onToggleExpand={() => setExpandedGate((prev) => (prev === gate.gateId ? null : gate.gateId))}
                  onSaved={handleSaved}
                  activeApp={activeApp}
                />
              ))}
            </div>
          );
        })
      )}
    </>
  );
}
