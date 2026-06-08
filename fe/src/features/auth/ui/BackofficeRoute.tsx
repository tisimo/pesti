import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuthUser } from "@/features/auth/model/useAuthUser";
import { logAppAccessAttempt } from "@/shared/lib/auditTrail";

// Known backoffice role names — fallback for existing DB records missing the application field
const BACKOFFICE_ROLE_NAMES = [
  "Super Admin",
  "Backoffice Admin",
  "Backoffice Auditor",
];

/**
 * Guards routes that require a backoffice application role.
 * - "backoffice" roleApplication → allowed
 * - known backoffice role name → allowed (fallback for DB records missing the application field)
 * - "just_causes" or no role → redirect to dashboard
 */
export default function BackofficeRoute() {
  const { user, isAuthenticated, loading } = useAuthUser();
  const location = useLocation();

  const canAccess =
    user?.appsAccessible?.includes("backoffice") ||
    (!user?.roleIsDefault &&
      (user?.roleApplication === "backoffice" ||
        BACKOFFICE_ROLE_NAMES.includes(user?.role ?? "")));

  useEffect(() => {
    if (!loading && isAuthenticated && !canAccess) {
      void logAppAccessAttempt(
        "backoffice",
        "failed",
        "role_application_not_allowed",
      );
    }
  }, [canAccess, isAuthenticated, loading]);

  if (loading) return <div>A verificar sessão...</div>;
  if (!isAuthenticated)
    return <Navigate to="/login" replace state={{ from: location }} />;
  if (!canAccess) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 12, background: "#f8fafc" }}>
        <i className="bi bi-shield-x" style={{ fontSize: 48, color: "#cbd5e1" }} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Access Denied</h2>
        <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>You don't have permission to access this application.</p>
        <button
          onClick={() => window.location.replace("/dashboard")}
          style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return <Outlet />;
}
