import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { RolesService } from "@/features/roles/api/RolesService";
import type { PageGateDTO } from "@/features/roles/model/types";
import { DEFAULT_ACCESS_DENIED_MESSAGE, emitApiAccessDenied } from "@/shared/lib/apiErrors";
import "./backoffice-management.css";

const THREAD_ASSIGNMENT_NOTIFICATIONS_STORAGE_KEY = "bo_email_thread_assignment_notifications";
const THREAD_ASSIGNMENT_NOTIFICATIONS_CHANGED_EVENT = "bo-email-thread-assignment-notifications-changed";

interface NavItem {
  path: string;
  pageKey: string;
  label: string;
  icon: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const ALL_NAV_SECTIONS: NavSection[] = [
  {
    label: "Management",
    items: [
      {
        path: "/admin/roles",
        pageKey: "admin_roles",
        label: "Roles & Permissions",
        icon: "bi-shield-lock",
      },
      {
        path: "/admin/users",
        pageKey: "admin_users",
        label: "Backoffice Users",
        icon: "bi-person-gear",
      },
      {
        path: "/admin/email",
        pageKey: "admin_email",
        label: "Email Inbox",
        icon: "bi-inbox",
      },
      {
        path: "/admin/page-gates",
        pageKey: "admin_page_gates",
        label: "Page Access Config",
        icon: "bi-lock",
      },
    ],
  },
  {
    label: "Audit",
    items: [
      {
        path: "/admin/logs",
        pageKey: "admin_logs",
        label: "Audit Logs",
        icon: "bi-clock-history",
      },
      {
        path: "/admin/audit-trail",
        pageKey: "admin_audit_trail",
        label: "Audit Trail",
        icon: "bi-shield-check",
      },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin/roles": "Roles & Permissions",
  "/admin/users": "Backoffice Users",
  "/admin/email": "Email Inbox",
  "/admin/logs": "Audit Logs",
  "/admin/page-gates": "Page Access Config",
  "/admin/audit-trail": "Audit Trail",
};

const FALLBACK_BACKOFFICE_GATES: PageGateDTO[] = [
  {
    gateId: "fallback-admin-roles",
    pageKey: "admin_roles",
    label: "Roles & Permissions",
    description: "Define roles, assign permission sets, and control what each role can do.",
    application: "backoffice",
    requiredPermissions: ["configure_roles"],
  },
  {
    gateId: "fallback-admin-users",
    pageKey: "admin_users",
    label: "Backoffice Users",
    description: "Manage backoffice administrator accounts.",
    application: "backoffice",
    requiredPermissions: ["manage_admins"],
  },
  {
    gateId: "fallback-admin-email",
    pageKey: "admin_email",
    label: "Email Inbox",
    description: "Centralized inbox for support emails and admin responses.",
    application: "backoffice",
    requiredPermissions: ["view_admin_email"],
  },
  {
    gateId: "fallback-admin-logs",
    pageKey: "admin_logs",
    label: "Audit Logs",
    description: "View backoffice administrative audit logs.",
    application: "backoffice",
    requiredPermissions: ["view_admin_logs"],
  },
  {
    gateId: "fallback-admin-page-gates",
    pageKey: "admin_page_gates",
    label: "Page Access Config",
    description: "Configure page access requirements.",
    application: "backoffice",
    requiredPermissions: ["configure_roles"],
  },
  {
    gateId: "fallback-admin-audit-trail",
    pageKey: "admin_audit_trail",
    label: "Audit Trail",
    description: "View login and app access events.",
    application: "backoffice",
    requiredPermissions: ["view_admin_logs"],
  },
];

export default function BackofficeManagementLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [gates, setGates] = useState<PageGateDTO[]>(FALLBACK_BACKOFFICE_GATES);
  const [gatesLoaded, setGatesLoaded] = useState(false);
  const [emailAssignmentCount, setEmailAssignmentCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deniedToastKey, setDeniedToastKey] = useState("");
  const isSuperAdmin = user?.role === "Super Admin";
  const userPerms = user?.permissions ?? [];

  useEffect(() => {
    let active = true;
    setGatesLoaded(false);

    if (!isSuperAdmin) {
      setGates(FALLBACK_BACKOFFICE_GATES);
      setGatesLoaded(true);
      return () => {
        active = false;
      };
    }

    RolesService.getPageGates("backoffice")
      .then((loadedGates) => {
        if (active) setGates(loadedGates.length ? loadedGates : FALLBACK_BACKOFFICE_GATES);
      })
      .catch(() => {
        if (active) setGates(FALLBACK_BACKOFFICE_GATES);
      })
      .finally(() => {
        if (active) setGatesLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  const uid = user?.userId ?? "";
  const boUserId = user?.boUserId ?? "";

  function readEmailAssignmentCount(): number {
    if (!boUserId) return 0;
    try {
      const raw = localStorage.getItem(THREAD_ASSIGNMENT_NOTIFICATIONS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const ids = Array.isArray(parsed?.[boUserId]) ? parsed[boUserId] : [];
      return ids.filter((id: unknown) => typeof id === "string" && String(id).trim()).length;
    } catch {
      return 0;
    }
  }

  useEffect(() => {
    setEmailAssignmentCount(readEmailAssignmentCount());

    function sync() {
      setEmailAssignmentCount(readEmailAssignmentCount());
    }

    window.addEventListener("storage", sync);
    window.addEventListener(THREAD_ASSIGNMENT_NOTIFICATIONS_CHANGED_EVENT, sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(THREAD_ASSIGNMENT_NOTIFICATIONS_CHANGED_EVENT, sync as EventListener);
    };
  }, [boUserId]);

  useEffect(() => {
    if (!uid) return;
    const fullUrl = location.pathname + location.search;
    try {
      localStorage.setItem(`bo_${uid}_last_url_backoffice`, fullUrl);
      const allItems = ALL_NAV_SECTIONS.flatMap((s) => s.items);
      const match = allItems.find(
        (item) => location.pathname === item.path || location.pathname.startsWith(item.path + "/"),
      );
      if (match) localStorage.setItem(`bo_${uid}_nav_last_${match.path}`, fullUrl);
    } catch { /* ignore */ }
  }, [location.pathname, location.search, uid]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  function navDestination(itemPath: string): string {
    try {
      const saved = localStorage.getItem(`bo_${uid}_nav_last_${itemPath}`);
      if (saved) {
        const savedPathname = saved.split("?")[0];
        if (savedPathname === itemPath || savedPathname.startsWith(itemPath + "/")) return saved;
      }
    } catch { /* ignore */ }
    return itemPath;
  }

  const isEmailRoute = location.pathname === "/admin/email" || location.pathname.startsWith("/admin/email/");

  function canAccessPage(pageKey: string): boolean {
    if (isSuperAdmin) return true;
    if (!userPerms.length) return false;
    const gate = gates.find((g) => g.pageKey === pageKey);
    if (!gate) return true; // no gate = open
    if (!gate.requiredPermissions.length) return true; // empty = open to all with app access
    return gate.requiredPermissions.some((p) => userPerms.includes(p));
  }

  const pageTitle = PAGE_TITLES[location.pathname] ?? "Backoffice Management";
  const displayEmail = user?.email ?? user?.username ?? "";
  const displayRole = user?.role;
  const allNavItems = ALL_NAV_SECTIONS.flatMap((section) => section.items);
  const matchedNavItem = allNavItems.find(
    (item) => location.pathname === item.path || location.pathname.startsWith(item.path + "/"),
  );
  const isCurrentPageDenied = gatesLoaded && matchedNavItem !== undefined && !canAccessPage(matchedNavItem.pageKey);

  useEffect(() => {
    if (!isCurrentPageDenied || !matchedNavItem) return;
    const toastKey = `${location.pathname}|${matchedNavItem.pageKey}`;
    if (toastKey === deniedToastKey) return;

    setDeniedToastKey(toastKey);
    emitApiAccessDenied(DEFAULT_ACCESS_DENIED_MESSAGE, location.pathname);
  }, [deniedToastKey, isCurrentPageDenied, location.pathname, matchedNavItem]);

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
    <div className="bo-layout" data-testid="backoffice-layout">
      <button
        type="button"
        className={`bo-sidebar__scrim${sidebarOpen ? " is-open" : ""}`}
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`bo-sidebar${sidebarOpen ? " is-open" : ""}`} data-testid="backoffice-sidebar">
        <div className="bo-sidebar__brand">
          <span
            className="bo-sidebar__brand-name"
            onClick={() => navigate("/dashboard")}
            style={{ cursor: "pointer" }}
          >
            Only High IQ
          </span>
          <span className="bo-sidebar__badge">Management</span>
        </div>

        <nav className="bo-sidebar__nav">
          {ALL_NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter((item) => {
              return canAccessPage(item.pageKey);
            });
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.label}>
                <div className="bo-sidebar__section-label">{section.label}</div>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={navDestination(item.path)}
                    onClick={() => setSidebarOpen(false)}
                    data-testid={`nav-link-${item.pageKey}`}
                    className={() =>
                      `bo-nav__item${location.pathname === item.path || location.pathname.startsWith(item.path + "/") ? " active" : ""}`
                    }
                  >
                    <i className={`bi ${item.icon}`} />
                    <span className="bo-nav__item-content">
                      <span className="bo-nav__item-label">{item.label}</span>
                      {item.pageKey === "admin_email" && emailAssignmentCount > 0 && !isEmailRoute ? (
                        <span className="bo-nav__badge bo-nav__badge--notification">
                          {emailAssignmentCount > 99 ? "99+" : emailAssignmentCount}
                        </span>
                      ) : null}
                    </span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="bo-sidebar__footer">
          <button
            className="bo-sidebar__back-btn"
            data-testid="sidebar-back-btn"
            onClick={() => navigate("/dashboard")}
          >
            <i className="bi bi-arrow-left" />
            Back to Dashboard
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="bo-main">
        <header className="bo-topbar" data-testid="backoffice-topbar">
          <div className="bo-topbar__left">
            <button
              type="button"
              className="bo-topbar__menu"
              data-testid="topbar-menu-btn"
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <i className="bi bi-list" />
            </button>
            <span className="bo-topbar__title" data-testid="topbar-title">{pageTitle}</span>
          </div>
          <div className="bo-topbar__user">
            {displayRole && (
              <span className="bo-topbar__role" data-testid="topbar-role">{displayRole}</span>
            )}
            {displayEmail && (
              <span className="bo-topbar__email" data-testid="topbar-email">{displayEmail}</span>
            )}
            <button
              className="bo-topbar__logout"
              data-testid="topbar-signout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </header>

        <main className="bo-content" data-testid="bo-main-content">
          {(() => {
            if (!gatesLoaded) {
              return (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#64748b" }}>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Checking access...
                </div>
              );
            }

            if (isCurrentPageDenied) {
              return (
                <div data-testid="access-denied" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16, textAlign: "center" }}>
                  <i className="bi bi-shield-x" style={{ fontSize: 48, color: "#94a3b8" }} />
                  <h2 style={{ margin: 0, fontWeight: 700, color: "#1e293b" }}>Access Denied</h2>
                  <p style={{ margin: 0, color: "#64748b", maxWidth: 360 }}>You don't have permission to view this page. Contact your administrator if you think this is a mistake.</p>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
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
