import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { logAppAccessAttempt } from "@/shared/lib/auditTrail";
import logoHeaderImg from "@/assets/Only-High-IQ-Logo.png";
import ojcLogo from "@/assets/OJC_Hor_Logo_Blue.png";

const PURPLE = "#6B21E8";
const PURPLE_LIGHT = "#f5f3ff";

const apps = [
  {
    id: "ojc",
    name: "Only Just Causes",
    description: "Cause and campaign management",
    logo: ojcLogo,
    accentColor: "#6B21E8",
    accentLight: "#f5f3ff",
    badge: null,
    path: "/ojc/overview",
  },
];

function normalizeOjcPath(path: string) {
  return path.startsWith("/panel") ? path.replace(/^\/panel(?=\/|$)/, "/ojc") : path;
}

export default function AppSelector() {
  const { user, getAccessToken, logout } = useAuth();
  const navigate = useNavigate();

  const isBackofficeRole =
    user?.appsAccessible?.includes("backoffice") ||
    (!user?.roleIsDefault && user?.roleApplication === "backoffice");
  const visibleApps = apps.filter((app) => {
    if (app.id === "ojc") return user?.appsAccessible?.includes("just_causes") ?? !user?.roleIsDefault;
    return true;
  });

  const [hovered, setHovered] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastAccessed, setLastAccessed] = useState<Record<string, number>>({});

  const uid = user?.userId ?? "";

  useEffect(() => {
    if (!uid) return;
    try {
      const stored = localStorage.getItem(`bo_${uid}_last_accessed`);
      if (stored) setLastAccessed(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, [uid]);

  const displayName = user?.email ?? user?.username ?? "User";
  const initials = displayName
    .split(/[@.\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0].toUpperCase())
    .join("");

  async function handleCopyToken() {
    try {
      const token = await getAccessToken();
      if (token) {
        await navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* silent */
    }
    setProfileOpen(false);
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  function formatLastAccessed(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  }

  const LAST_URL_KEYS: Record<string, string> = {
    ojc: `bo_${uid}_last_url_ojc`,
    backoffice: `bo_${uid}_last_url_backoffice`,
  };

  function handleSelect(app: (typeof apps)[0]) {
    if (app.badge === "soon" || !app.path) return;
    setSelected(app.id);
    void logAppAccessAttempt(app.id, "success");
    let destination = app.path!;
    try {
      const saved = localStorage.getItem(LAST_URL_KEYS[app.id] ?? "");
      const normalizedSaved = saved ? normalizeOjcPath(saved) : null;
      if (normalizedSaved && normalizedSaved.startsWith(app.path!.split("/").slice(0, 2).join("/"))) {
        destination = normalizedSaved;
      }
    } catch { /* ignore */ }
    try {
      const updated = { ...lastAccessed, [app.id]: Date.now() };
      localStorage.setItem(`bo_${uid}_last_accessed`, JSON.stringify(updated));
      setLastAccessed(updated);
    } catch {
      /* ignore */
    }
    setTimeout(() => navigate(destination), 400);
  }

  return (
    <div className="dash-root" data-testid="dashboard-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .dash-root {
          min-height: 100vh;
          min-height: 100dvh;
          background: linear-gradient(to bottom, #ffffff 0%, #faf9ff 55%, #f3f0ff 100%);
          font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow-x: hidden;
        }

        /* ─── Header ─── */
        .dash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: clamp(10px, 1.2vw, 22px) clamp(16px, 3vw, 56px);
          border-bottom: 1px solid #f0f0f0;
          background: #fff;
          position: relative;
          top: 0;
          z-index: 50;
          gap: clamp(8px, 0.8vw, 16px);
        }

        .dash-header__logo {
          height: clamp(36px, 3.8vw, 76px);
          width: auto;
          display: block;
          flex-shrink: 0;
        }

        .dash-header__actions {
          display: flex;
          align-items: center;
          gap: clamp(6px, 0.8vw, 16px);
          flex-shrink: 0;
        }

        /* ─── App Card ─── */
        .app-card {
          background: #fff;
          border: 1.5px solid #ebebeb;
          border-radius: clamp(16px, 1.6vw, 32px);
          padding: clamp(28px, 3.5vw, 72px) clamp(24px, 3vw, 64px) clamp(32px, 4vw, 80px);
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.34, 1.4, 0.64, 1);
          position: relative;
          overflow: hidden;
          user-select: none;
          /* Card scales with viewport: ~340px on 1366, ~480px on 1920, ~600px on 2560 */
          width: clamp(280px, 26vw, 640px);
          max-width: 100%;
          min-height: clamp(220px, 24vw, 480px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .app-card.active {
          transform: translateY(-8px) scale(1.015);
          box-shadow: 0 28px 80px rgba(0,0,0,0.11);
        }
        .app-card.entering {
          animation: enterApp 0.38s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes enterApp {
          0%   { transform: scale(1.015) translateY(-8px); opacity: 1; }
          100% { transform: scale(0.96) translateY(0); opacity: 0; }
        }
        .card-bg {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.25s;
          pointer-events: none;
        }
        .app-card.active .card-bg { opacity: 1; }
        .app-logo-wrap {
          width: 100%;
          height: clamp(48px, 5.5vw, 110px);
          display: flex;
          align-items: center;
          margin-bottom: clamp(14px, 2vw, 40px);
        }
        .app-logo-wrap img {
          max-height: clamp(44px, 5vw, 100px);
          max-width: 100%;
          width: auto;
          object-fit: contain;
          object-position: left center;
        }
        .app-desc {
          font-size: clamp(12px, 0.9vw, 18px);
          color: #aaa;
          font-weight: 300;
        }
        .arrow-icon {
          position: absolute;
          bottom: clamp(20px, 2.8vw, 52px);
          right: clamp(20px, 2.8vw, 52px);
          opacity: 0;
          transform: translateX(-8px);
          transition: all 0.2s ease;
        }
        .app-card.active .arrow-icon {
          opacity: 1;
          transform: translateX(0);
        }

        /* ─── Admin Button ─── */
        .admin-btn {
          display: flex;
          align-items: center;
          gap: clamp(5px, 0.5vw, 10px);
          padding: clamp(7px, 0.6vw, 12px) clamp(10px, 1vw, 20px);
          border-radius: clamp(8px, 0.7vw, 14px);
          border: none;
          background: ${PURPLE};
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(11px, 0.78vw, 16px);
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 12px rgba(107,33,232,0.25);
          white-space: nowrap;
        }
        .admin-btn:hover {
          background: #5b17d4;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(107,33,232,0.35);
        }
        .admin-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(107,33,232,0.2);
        }
        .admin-btn svg { transition: transform 0.5s ease; }
        .admin-btn:hover svg { transform: rotate(60deg); }

        .admin-btn__label {
          display: inline;
        }

        /* ─── Profile ─── */
        .profile-btn {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: clamp(4px, 0.6vw, 12px);
          padding: clamp(5px, 0.5vw, 10px) clamp(5px, 0.6vw, 14px);
          border-radius: clamp(8px, 0.7vw, 14px);
          transition: background 0.15s;
        }
        .profile-btn:hover { background: ${PURPLE_LIGHT}; }

        .profile-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          background: #fff;
          border: 1.5px solid #ebebeb;
          border-radius: clamp(12px, 1vw, 18px);
          padding: clamp(5px, 0.5vw, 10px);
          min-width: clamp(200px, 14vw, 300px);
          max-width: 80vw;
          box-shadow: 0 12px 40px rgba(107,33,232,0.10);
          animation: dropIn 0.16s cubic-bezier(0.34, 1.4, 0.64, 1);
          z-index: 100;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: clamp(6px, 0.6vw, 12px);
          padding: clamp(8px, 0.7vw, 14px) clamp(10px, 0.8vw, 16px);
          border-radius: clamp(7px, 0.6vw, 12px);
          font-size: clamp(12px, 0.78vw, 16px);
          color: #333;
          cursor: pointer;
          transition: background 0.12s;
          font-family: 'DM Sans', sans-serif;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          white-space: nowrap;
        }
        .dropdown-item:hover:not(:disabled) { background: ${PURPLE_LIGHT}; color: ${PURPLE}; }
        .dropdown-item.danger { color: #c93a3a; }
        .dropdown-item.danger:hover:not(:disabled) { background: #fff0f0; color: #c93a3a; }
        .dropdown-item:disabled { opacity: 0.5; cursor: default; }

        .avatar {
          width: clamp(28px, 2.3vw, 48px);
          height: clamp(28px, 2.3vw, 48px);
          border-radius: 50%;
          background: ${PURPLE};
          color: #fff;
          font-size: clamp(10px, 0.78vw, 16px);
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }

        .profile-name {
          font-size: clamp(11px, 0.78vw, 16px);
          font-weight: 500;
          color: #1a1a1a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: clamp(60px, 10vw, 220px);
        }

        .divider { height: 1px; background: #f0f0f0; margin: clamp(3px, 0.35vw, 7px) 0; }

        /* ─── Main ─── */
        .dash-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(16px, 3.5vw, 72px) clamp(12px, 2.5vw, 48px);
          position: relative;
          z-index: 1;
        }

        /* ─── Footer ─── */
        .dash-footer {
          text-align: center;
          padding: clamp(12px, 1.5vw, 28px);
          font-size: clamp(9px, 0.7vw, 14px);
          color: #ddd;
          letter-spacing: 0.04em;
          position: relative;
          z-index: 1;
        }

        .fade-in { animation: fadeIn 0.45s ease both; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ═══════════════════════════════════
           Responsive breakpoints
           ═══════════════════════════════════ */

        /* 2K+ screens */
        @media (min-width: 1921px) {
          .app-card {
            width: clamp(540px, 25vw, 700px);
          }
          .dash-header {
            padding: 22px 64px;
          }
        }

        /* Tablet landscape */
        @media (max-width: 1023px) and (min-width: 769px) {
          .app-card {
            width: min(70%, 440px);
            min-height: 320px;
          }
        }

        /* Tablet portrait (iPad) */
        @media (max-width: 768px) {
          .admin-btn__label {
            display: none;
          }
          .admin-btn {
            padding: 10px;
            border-radius: 10px;
          }
          .app-card {
            width: min(85%, 420px);
            min-height: 280px;
          }
        }

        /* Phone */
        @media (max-width: 480px) {
          .dash-header {
            padding: 10px 12px;
          }
          .dash-header__logo {
            height: 36px;
          }
          .app-card {
            width: 100%;
            min-height: 240px;
            border-radius: 18px;
            padding: 28px 22px 32px;
          }
          .app-logo-wrap {
            height: 56px;
            margin-bottom: 16px;
          }
          .dash-main {
            padding: 20px 12px;
          }
          .profile-name {
            display: none;
          }
        }

        /* Very small / high zoom */
        @media (max-width: 360px) {
          .app-card {
            padding: 22px 16px 26px;
            min-height: 200px;
            border-radius: 14px;
          }
        }

        /* Landscape phones */
        @media (max-height: 500px) and (orientation: landscape) {
          .dash-main {
            padding: 16px;
            align-items: flex-start;
          }
          .app-card {
            min-height: 220px;
          }
        }
      `}</style>

      {/* Header */}
      <header className="dash-header" data-testid="dashboard-header">
        <img
          className="dash-header__logo"
          src={logoHeaderImg}
          alt="Only High IQ"
          data-testid="dashboard-header-logo"
        />

        <div className="dash-header__actions">
          {isBackofficeRole && (
            <button
              className="admin-btn"
              data-testid="dashboard-admin-button"
              onClick={() => {
                void logAppAccessAttempt("backoffice", "success");
                let dest = "/admin";
                try {
                  const saved = localStorage.getItem(`bo_${uid}_last_url_backoffice`);
                  if (saved?.startsWith("/admin")) dest = saved;
                } catch { /* ignore */ }
                navigate(dest);
              }}
            >
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="10"
                  cy="10"
                  r="3"
                  stroke="white"
                  strokeWidth="1.6"
                />
                <path
                  d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <span className="admin-btn__label">Manage Backoffice</span>
            </button>
          )}

          <div style={{ position: "relative" }}>
            <button
              className="profile-btn"
              data-testid="dashboard-profile-button"
              onClick={() => setProfileOpen((v) => !v)}
            >
              <div className="avatar">{initials || "U"}</div>
              <div style={{ textAlign: "left" }}>
                <div className="profile-name">{displayName}</div>
              </div>
              <svg
                width="15"
                height="15"
                viewBox="0 0 14 14"
                fill="none"
                style={{
                  color: "#ccc",
                  transform: profileOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                  flexShrink: 0,
                }}
              >
                <path
                  d="M3 5l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {profileOpen && (
              <div
                className="profile-dropdown"
                data-testid="dashboard-profile-dropdown"
              >
                <div style={{ padding: "10px 14px 12px" }}>
                  <div style={{ fontSize: 11, color: "#bbb", marginBottom: 3 }}>
                    Signed in as
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#1a1a1a",
                      wordBreak: "break-all",
                    }}
                  >
                    {displayName}
                  </div>
                </div>
                <div className="divider" />
                <button
                  className="dropdown-item"
                  data-testid="dashboard-copy-token-button"
                  onClick={handleCopyToken}
                >
                  <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
                    <rect
                      x="5"
                      y="5"
                      width="8"
                      height="8"
                      rx="1.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                    <path
                      d="M3 10V3a1 1 0 0 1 1-1h7"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                  {copied ? "Token copied ✓" : "Copy token"}
                </button>
                <div className="divider" />
                <button
                  className="dropdown-item danger"
                  data-testid="dashboard-sign-out-button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
                    <path
                      d="M5 7.5h8M10 5l3 2.5-3 2.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                  {isLoggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {profileOpen && (
        <div
          data-testid="dashboard-profile-overlay"
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
          onClick={() => setProfileOpen(false)}
        />
      )}

      {/* Main - centered card */}
      <main className="dash-main" data-testid="dashboard-main">
        {visibleApps.length === 0 ? (
          <div style={{ textAlign: "center", color: "#64748b", fontSize: 14 }}>
            No applications assigned yet.
          </div>
        ) : visibleApps.map((app) => {
          const isActive = hovered === app.id;
          return (
            <div
              data-testid={`dashboard-app-card-${app.id}`}
              key={app.id}
              className={[
                "app-card",
                "fade-in",
                isActive ? "active" : "",
                selected === app.id ? "entering" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                borderColor: isActive ? app.accentColor : "#ebebeb",
                boxShadow: isActive
                  ? `0 28px 80px ${app.accentColor}22`
                  : undefined,
              }}
              onMouseEnter={() => setHovered(app.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleSelect(app)}
            >
              <div
                className="card-bg"
                style={{
                  background: `linear-gradient(135deg, ${app.accentLight} 0%, #fff 65%)`,
                }}
              />

              <div style={{ position: "relative" }}>
                <div
                  className="app-logo-wrap"
                  data-testid={`dashboard-app-logo-wrap-${app.id}`}
                >
                  <img
                    src={app.logo}
                    alt={app.name}
                    data-testid={`dashboard-app-logo-${app.id}`}
                  />
                </div>
                <div
                  className="app-desc"
                  data-testid={`dashboard-app-description-${app.id}`}
                >
                  {app.description}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "clamp(6px,0.6vw,12px)",
                    marginTop: "clamp(10px,1.2vw,20px)",
                    flexWrap: "wrap",
                  }}
                >
                  {user?.role && (
                    <span
                      style={{
                        fontSize: "clamp(10px,0.7vw,13px)",
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 20,
                        background: app.accentLight,
                        color: app.accentColor,
                        border: `1px solid ${app.accentColor}33`,
                      }}
                    >
                      {user.role}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: "clamp(10px,0.65vw,12px)",
                      color: "#bbb",
                    }}
                  >
                    {lastAccessed[app.id]
                      ? `Last accessed ${formatLastAccessed(lastAccessed[app.id])}`
                      : "Never accessed"}
                  </span>
                </div>
              </div>

              <div className="arrow-icon" style={{ color: app.accentColor }}>
                <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M4 10h12M12 6l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </main>

      <footer className="dash-footer" data-testid="dashboard-footer">
        © {new Date().getFullYear()} Only High IQ
      </footer>
    </div>
  );
}
