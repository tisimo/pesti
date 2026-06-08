import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { RolesService } from "@/features/roles/api/RolesService";
import type { PageGateDTO } from "@/features/roles/model/types";
import "./admin.css";

interface NavItem {
  path: string;
  pageKey: string;
  label: string;
  icon: string;
  badge?: string;
  disabled?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const ALL_NAV_SECTIONS: NavSection[] = [
  {
    label: "Dashboard",
    items: [
      { path: "/ojc/overview",  pageKey: "panel_overview",  label: "Overview",  icon: "bi-speedometer2" },
      { path: "/ojc/analytics", pageKey: "panel_analytics", label: "Analytics", icon: "bi-bar-chart-line" },
    ],
  },
  {
    label: "Content",
    items: [
      { path: "/ojc/campaigns",  pageKey: "panel_campaigns",  label: "Campaigns",  icon: "bi-megaphone" },
      { path: "/ojc/campaign-revisions", pageKey: "panel_campaign_revisions", label: "Campaign Revisions", icon: "bi-arrow-repeat" },
      { path: "/ojc/reports",    pageKey: "panel_reports",    label: "Reports",    icon: "bi-flag" },
      { path: "/ojc/categories", pageKey: "panel_categories", label: "Categories", icon: "bi-tags" },
    ],
  },
  {
    label: "Users",
    items: [
      { path: "/ojc/users", pageKey: "panel_users", label: "Users",     icon: "bi-people" },
      { path: "/ojc/organizations", pageKey: "panel_organizations", label: "Organizations", icon: "bi-buildings" },
      { path: "/ojc/kyc",   pageKey: "panel_kyc",   label: "KYC Queue", icon: "bi-person-check" },
    ],
  },
  {
    label: "Finance",
    items: [
      { path: "/ojc/donations", pageKey: "panel_donations", label: "Donations", icon: "bi-cash-coin" },
      { path: "/ojc/deposits", pageKey: "panel_deposits", label: "Deposits", icon: "bi-arrow-down-circle" },
      { path: "/ojc/transactions", pageKey: "panel_transactions", label: "Transactions", icon: "bi-credit-card" },
      { path: "/ojc/withdrawals", pageKey: "panel_withdrawals", label: "Withdrawals", icon: "bi-arrow-up-circle" },
    ],
  },
  {
    label: "Audit",
    items: [
      { path: "/ojc/logs", pageKey: "panel_logs", label: "Audit Logs", icon: "bi-clock-history" },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/ojc/overview":      "Overview",
  "/ojc/analytics":     "Analytics",
  "/ojc/campaigns":     "Campaigns",
  "/ojc/campaign-revisions": "Campaign Revisions",
  "/ojc/reports":       "Reports",
  "/ojc/categories":    "Categories",
  "/ojc/users":         "Users",
  "/ojc/organizations": "Organizations",
  "/ojc/donations":     "Donations",
  "/ojc/deposits":      "Deposits",
  "/ojc/transactions":  "Transactions",
  "/ojc/withdrawals":   "Withdrawals",
  "/ojc/kyc":           "KYC Queue",
  "/ojc/logs":          "Audit Logs",
};

function normalizeOjcPath(path: string) {
  return path.startsWith("/panel") ? path.replace(/^\/panel(?=\/|$)/, "/ojc") : path;
}

function resolvePageTitle(pathname: string): string {
  const normalizedPath = normalizeOjcPath(pathname);
  const match = ALL_NAV_SECTIONS.flatMap((section) => section.items).find(
    (item) => normalizedPath === item.path || normalizedPath.startsWith(`${item.path}/`),
  );
  return match?.label ?? "OnlyJustCauses";
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [gates, setGates] = useState<PageGateDTO[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    RolesService.getPageGates("just_causes").then(setGates).catch(() => {});
  }, []);

  const uid = user?.userId ?? "";

  useEffect(() => {
    if (!uid) return;
    const normalizedPath = normalizeOjcPath(location.pathname);
    const fullUrl = normalizedPath + location.search;
    try {
      localStorage.setItem(`bo_${uid}_last_url_ojc`, fullUrl);
      const allItems = ALL_NAV_SECTIONS.flatMap((s) => s.items);
      const match = allItems.find(
        (item) => normalizedPath === item.path || normalizedPath.startsWith(item.path + "/"),
      );
      if (match) localStorage.setItem(`bo_${uid}_nav_last_${match.path}`, fullUrl);
    } catch { /* ignore */ }
  }, [location.pathname, location.search, uid]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  function navDestination(itemPath: string): string {
    try {
      const legacyItemPath = itemPath.replace(/^\/ojc(?=\/|$)/, "/panel");
      const saved =
        localStorage.getItem(`bo_${uid}_nav_last_${itemPath}`) ??
        localStorage.getItem(`bo_${uid}_nav_last_${legacyItemPath}`);
      const normalizedSaved = saved ? normalizeOjcPath(saved) : null;
      if (normalizedSaved) {
        const savedPathname = normalizedSaved.split("?")[0];
        if (savedPathname === itemPath || savedPathname.startsWith(itemPath + "/")) return normalizedSaved;
      }
    } catch { /* ignore */ }
    return itemPath;
  }

  const isSuperAdmin = user?.role === "Super Admin";
  const isBackofficeRole =
    user?.appsAccessible?.includes("backoffice") ||
    (!user?.roleIsDefault && user?.roleApplication === "backoffice");
  const userPerms = user?.permissions ?? [];

  function canAccessPage(pageKey: string): boolean {
    if (isSuperAdmin || isBackofficeRole) return true;
    const gate = gates.find((g) => g.pageKey === pageKey);
    if (!gate) return true; // no gate configured = open
    if (!gate.requiredPermissions.length) return true; // empty = open to all with app access
    return gate.requiredPermissions.some((p) => userPerms.includes(p));
  }

  const normalizedLocationPath = normalizeOjcPath(location.pathname);
  const pageTitle = PAGE_TITLES[normalizedLocationPath] ?? resolvePageTitle(location.pathname);
  const displayEmail = user?.email ?? user?.username ?? "";
  const displayRole = user?.role;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="admin-layout">
      <button
        type="button"
        className={`admin-sidebar__scrim${sidebarOpen ? " is-open" : ""}`}
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__brand-name" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
            OnlyJustCauses
          </span>
          <span className="admin-sidebar__badge">Backoffice</span>
        </div>

        <nav className="admin-sidebar__nav">
          {ALL_NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(
              (item) => item.disabled || canAccessPage(item.pageKey),
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.label}>
                <div className="admin-sidebar__section-label">{section.label}</div>
                {visibleItems.map((item) =>
                  item.disabled ? (
                    <span key={item.path} className="admin-nav__item disabled">
                      <i className={`bi ${item.icon}`} />
                      {item.label}
                    </span>
                  ) : (
                    <NavLink
                      key={item.path}
                      to={navDestination(item.path)}
                      onClick={() => setSidebarOpen(false)}
                      className={() => `admin-nav__item${normalizedLocationPath === item.path || normalizedLocationPath.startsWith(item.path + "/") ? " active" : ""}`}
                    >
                      <i className={`bi ${item.icon}`} />
                      {item.label}
                      {item.badge && (
                        <span className="admin-nav__badge">{item.badge}</span>
                      )}
                    </NavLink>
                  ),
                )}
              </div>
            );
          })}
        </nav>

        <div className="admin-sidebar__footer">
          <button className="admin-sidebar__back-btn" onClick={() => navigate("/dashboard")}>
            <i className="bi bi-arrow-left" />
            Back to Dashboard
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__left">
            <button
              type="button"
              className="admin-topbar__menu"
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <i className="bi bi-list" />
            </button>
            <span className="admin-topbar__title">{pageTitle}</span>
          </div>
          <div className="admin-topbar__user">
            {displayRole && (
              <span className="admin-topbar__role">{displayRole}</span>
            )}
            {displayEmail && (
              <span className="admin-topbar__email">{displayEmail}</span>
            )}
            <button
              className="admin-topbar__logout"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </header>

        <main className="admin-content">
          {(() => {
            if (gates.length === 0) return <Outlet />;
            const allItems = ALL_NAV_SECTIONS.flatMap((s) => s.items);
            const match = allItems.find(
              (item) => normalizedLocationPath === item.path || normalizedLocationPath.startsWith(item.path + "/"),
            );
            if (match && !canAccessPage(match.pageKey)) {
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16, textAlign: "center" }}>
                  <i className="bi bi-shield-x" style={{ fontSize: 48, color: "#94a3b8" }} />
                  <h2 style={{ margin: 0, fontWeight: 700, color: "#1e293b" }}>Access Denied</h2>
                  <p style={{ margin: 0, color: "#64748b", maxWidth: 360 }}>You don't have permission to view this page. Contact your administrator if you think this is a mistake.</p>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate("/ojc/overview")}>Back to Overview</button>
                </div>
              );
            }
            return <Outlet />;
          })()}
        </main>
      </div>
    </div>
  );
}
