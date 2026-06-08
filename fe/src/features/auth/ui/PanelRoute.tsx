import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useAuthUser } from "@/features/auth/model/useAuthUser";
import { logAppAccessAttempt } from "@/shared/lib/auditTrail";

/**
 * Guards routes that require access to the Just Causes panel.
 * - "just_causes" roleApplication → allowed (panel only)
 * - "backoffice" roleApplication → allowed (global admins can access panel)
 * - Default role or no role → redirect to dashboard
 */
export default function PanelRoute() {
  const { user, isAuthenticated, loading } = useAuthUser();
  const location = useLocation();
  const hasLoggedSuccessRef = useRef(false);
  const hasLoggedFailureRef = useRef(false);

  const canAccess =
    user?.appsAccessible?.includes("just_causes") ||
    (!user?.roleIsDefault &&
      (user?.roleApplication === "just_causes" ||
        user?.roleApplication === "backoffice"));

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    if (canAccess && !hasLoggedSuccessRef.current) {
      hasLoggedSuccessRef.current = true;
      void logAppAccessAttempt("only_just_causes", "success");
      return;
    }

    if (!canAccess && !hasLoggedFailureRef.current) {
      hasLoggedFailureRef.current = true;
      void logAppAccessAttempt(
        "only_just_causes",
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
