import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "@/features/auth/ui/ProtectedRoute";
import PublicRoute from "@/features/auth/ui/PublicRoute";
import BackofficeRoute from "@/features/auth/ui/BackofficeRoute";
import PanelRoute from "@/features/auth/ui/PanelRoute";
import { useAuth } from "@/app/providers/AuthProvider";
import AdminLayout from "@/features/admin/ui/AdminLayout";
import BackofficeManagementLayout from "@/features/backoffice/ui/BackofficeManagementLayout";

import DashboardPage from "@/pages/DashboardPage/DashboardPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage/ForgotPasswordPage";
import LoginPage from "@/pages/LoginPage/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage/ResetPasswordPage";
import AdminOverviewPage from "@/pages/AdminOverviewPage/AdminOverviewPage";
import RolesPermissionsPage from "@/pages/RolesPermissionsPage/RolesPermissionsPage";
import UsersPage from "@/pages/UsersPage/UsersPage";
import OrganizationsPage from "@/pages/OrganizationsPage/OrganizationsPage";
import CampaignsPage from "@/pages/CampaignsPage/CampaignsPage";
import CampaignRevisionsPage from "@/pages/CampaignRevisionsPage/CampaignRevisionsPage";
import CampaignRevisionDetailPage from "@/pages/CampaignRevisionsPage/CampaignRevisionDetailPage";
import ReportsPage from "@/pages/ReportsPage/ReportsPage";
import ReportsDetailPage from "@/pages/ReportsDetailPage/ReportsDetailPage";
import DonationsPage from "@/pages/DonationsPage/DonationsPage";
import DepositsPage from "@/pages/DepositsPage/DepositsPage";
import TransactionsPage from "@/pages/TransactionsPage/TransactionsPage";
import AnalyticsPage from "@/pages/AnalyticsPage/AnalyticsPage";
import CategoriesPage from "@/pages/CategoriesPage/CategoriesPage";
import AdminUsersPage from "@/pages/AdminUsersPage/AdminUsersPage";
import NewPasswordPage from "@/pages/SetPasswordPage/SetPasswordPage";
import LogsPage, {
  OJC_ACTIONS,
  BACKOFFICE_ACTIONS,
} from "@/pages/LogsPage/LogsPage";
import KycQueuePage from "@/pages/KycQueuePage/KycQueuePage";
import WithdrawalsPage from "@/pages/WithdrawalsPage/WithdrawalsPage";
import PageGatesPage from "@/pages/PageGatesPage/PageGatesPage";
import AuditTrailPage from "@/pages/AuditTrailPage/AuditTrailPage";
import EmailInboxPage from "@/pages/EmailInboxPage/EmailInboxPage";

const PANEL_PAGES = [
  { path: "overview",            permissions: [] as string[] },
  { path: "users",               permissions: ["view_users", "flag_escalate", "block_suspend"] },
  { path: "organizations",       permissions: ["view_organizations", "view_kyb"] },
  { path: "campaigns",           permissions: ["view_campaigns", "approve_reject", "view_reports", "respond"] },
  { path: "campaign-revisions",  permissions: ["approve_reject", "respond", "flag_escalate", "block_suspend"] },
  { path: "reports",             permissions: ["view_reports", "respond", "flag_escalate", "block_suspend"] },
  { path: "donations",           permissions: ["view_donations"] },
  { path: "deposits",            permissions: ["view_deposits"] },
  { path: "transactions",        permissions: ["view_donations"] },
  { path: "analytics",           permissions: ["export", "view_campaigns", "view_users"] },
  { path: "categories",          permissions: ["view_categories", "edit_categories"] },
  { path: "kyc",                 permissions: ["view_kyc"] },
  { path: "withdrawals",         permissions: ["view_withdrawals", "process_withdrawals"] },
  { path: "logs",                permissions: ["view_audit_logs", "export"] },
];

const ADMIN_PAGES = [
  { path: "roles", permissions: ["configure_roles"], superAdminOnly: false },
  { path: "users", permissions: ["manage_admins"], superAdminOnly: false },
  { path: "email", permissions: ["view_admin_email"], superAdminOnly: false },
  { path: "logs", permissions: ["view_admin_logs"], superAdminOnly: false },
  {
    path: "page-gates",
    permissions: ["configure_roles"],
    superAdminOnly: false,
  },
  { path: "audit-trail", permissions: ["view_admin_logs"], superAdminOnly: false },
];

function PanelIndexRedirect() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "Super Admin";
  const isBackofficeRole =
    user?.appsAccessible?.includes("backoffice") ||
    (!user?.roleIsDefault && user?.roleApplication === "backoffice");
  const perms = user?.permissions ?? [];
  for (const page of PANEL_PAGES) {
    if (
      isSuperAdmin ||
      isBackofficeRole ||
      page.permissions.length === 0 ||
      page.permissions.some((p) => perms.includes(p))
    ) {
      return <Navigate to={page.path} replace />;
    }
  }
  return <Navigate to="overview" replace />;
}

function AdminIndexRedirect() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "Super Admin";
  const perms = user?.permissions ?? [];
  for (const page of ADMIN_PAGES) {
    if (page.superAdminOnly && !isSuperAdmin) continue;
    if (isSuperAdmin || page.permissions.some((p) => perms.includes(p))) {
      return <Navigate to={page.path} replace />;
    }
  }
  return <Navigate to="roles" replace />;
}

function LegacyPanelRedirect() {
  const location = useLocation();
  const nextPath = location.pathname.replace(/^\/panel(?=\/|$)/, "/ojc");
  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/SetPasswordPage" element={<NewPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/email" element={<Navigate to="/admin/email" replace />} />

        {/* Backoffice Management — requires backoffice application role */}
        <Route element={<BackofficeRoute />}>
          <Route path="/admin" element={<BackofficeManagementLayout />}>
            <Route index element={<AdminIndexRedirect />} />
            <Route path="roles" element={<RolesPermissionsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="email" element={<EmailInboxPage />} />
            <Route
              path="logs"
              element={<LogsPage allowedActions={[...BACKOFFICE_ACTIONS, ...OJC_ACTIONS]} showAppFilter />}
            />
            <Route path="page-gates" element={<PageGatesPage />} />
            <Route
              path="audit-trail"
              element={<AuditTrailPage />}
            />
          </Route>
        </Route>

        {/* OJC Panel — requires just_causes or backoffice application role */}
        <Route element={<PanelRoute />}>
          <Route path="/ojc" element={<AdminLayout />}>
            <Route index element={<PanelIndexRedirect />} />
            <Route path="overview" element={<AdminOverviewPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="campaign-revisions" element={<CampaignRevisionsPage />} />
            <Route path="campaign-revisions/:threadId" element={<CampaignRevisionDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/:reportId" element={<ReportsDetailPage />} />
            <Route path="donations" element={<DonationsPage />} />
            <Route path="deposits" element={<DepositsPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="kyc" element={<KycQueuePage />} />
            <Route path="withdrawals" element={<WithdrawalsPage />} />
            <Route
              path="logs"
              element={<LogsPage allowedActions={OJC_ACTIONS} />}
            />
          </Route>
          <Route path="/panel/*" element={<LegacyPanelRedirect />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
