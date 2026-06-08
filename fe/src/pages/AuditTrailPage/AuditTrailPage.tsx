import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiBackoffice } from "@/shared/lib/axios";
import "./auditTrailPage.css";

type Action =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "APP_ACCESS_SUCCESS"
  | "APP_ACCESS_FAILED";

type AuditTrailLog = {
  logId: string;
  adminUserId: string;
  adminEmail: string;
  action: Action | string;
  targetLabel?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
};

type LogsResponse = {
  items: AuditTrailLog[];
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
};

const APP_OPTIONS = [
  { value: "", label: "All apps" },
  { value: "backoffice", label: "Backoffice" },
  { value: "only_just_causes", label: "Only Just Causes" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 500] as const;
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSizeOption = 25;

const APP_LABELS: Record<string, string> = {
  backoffice: "Backoffice",
  only_just_causes: "Only Just Causes",
  just_causes: "Only Just Causes",
  ojc: "Only Just Causes",
};

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEventLabel(action: string): string {
  if (action === "LOGIN_SUCCESS") return "Login success";
  if (action === "LOGIN_FAILED") return "Login failed";
  if (action === "APP_ACCESS_SUCCESS") return "App access success";
  if (action === "APP_ACCESS_FAILED") return "App access failed";
  return action;
}

function getResult(action: string): "success" | "failed" {
  return action === "APP_ACCESS_FAILED" || action === "LOGIN_FAILED"
    ? "failed"
    : "success";
}

function normalizeAppsAccessible(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\s,;|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function mapAppLabel(appId: string): string {
  return APP_LABELS[appId] ?? appId;
}

export default function AuditTrailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AuditTrailLog[]>([]);
  const [currentPage, setCurrentPage] = useState(Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1));
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState<PageSizeOption>(
    (PAGE_SIZE_OPTIONS.includes(parseInt(searchParams.get("pageSize") || "", 10) as PageSizeOption)
      ? parseInt(searchParams.get("pageSize") || "", 10)
      : DEFAULT_PAGE_SIZE) as PageSizeOption,
  );

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [adminEmail, setAdminEmail] = useState(searchParams.get("email") || "");
  const [app, setApp] = useState(searchParams.get("app") || "");
  const [result, setResult] = useState<"" | "success" | "failed">((searchParams.get("result") as "" | "success" | "failed") || "");
  const [selectedLog, setSelectedLog] = useState<AuditTrailLog | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (adminEmail.trim()) params.set("email", adminEmail.trim());
    if (app) params.set("app", app);
    if (result) params.set("result", result);
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(pageSize));
    if (currentPage > 1) params.set("page", String(currentPage));
    setSearchParams(params, { replace: true });
  }, [fromDate, toDate, adminEmail, app, result, pageSize, currentPage, setSearchParams]);

  const actionIn = useMemo(() => {
    if (result === "success") return "LOGIN_SUCCESS,APP_ACCESS_SUCCESS";
    if (result === "failed") return "LOGIN_FAILED,APP_ACCESS_FAILED";
    return "LOGIN_SUCCESS,LOGIN_FAILED,APP_ACCESS_SUCCESS,APP_ACCESS_FAILED";
  }, [result]);

  async function fetchAuditTrail(pageToLoad = 1, pageSizeToLoad: PageSizeOption = pageSize) {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {
        actionIn,
        limit: String(pageSizeToLoad),
        page: String(pageToLoad),
      };

      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const normalizedAdminEmail = adminEmail.trim();
      if (normalizedAdminEmail) params.adminEmail = normalizedAdminEmail;
      if (app) params.app = app;

      const res = await apiBackoffice.get<LogsResponse>("/logs/audit-trail", {
        params,
      });

      setItems(res.data.items || []);
      const resolvedCurrentPage = res.data.currentPage ?? pageToLoad;
      const resolvedTotalPages = Math.max(1, res.data.totalPages ?? 1);
      setCurrentPage(resolvedCurrentPage);
      setTotalPages(resolvedTotalPages);
      setTotalItems(res.data.totalItems ?? res.data.items.length ?? 0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`Failed to load audit trail: ${msg}`);
      setItems([]);
      setCurrentPage(1);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchAuditTrail(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="admin-page-header">
        <h1>Audit Trail</h1>
        <p>Login and app access attempts for full traceability.</p>
      </div>

      <div
        className="audit-trail__panel"
        data-testid="audit-trail-panel"
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          className="audit-trail__filters"
          data-testid="audit-trail-filters"
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div className="audit-trail__filter" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              FROM
            </label>
            <input
              type="date"
              data-testid="filter-from-date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                padding: "6px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
              }}
            />
          </div>

          <div className="audit-trail__filter" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              TO
            </label>
            <input
              type="date"
              data-testid="filter-to-date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                padding: "6px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
              }}
            />
          </div>

          <div className="audit-trail__filter" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              EMAIL
            </label>
            <input
              type="text"
              data-testid="filter-email"
              placeholder="user@email.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              style={{
                padding: "6px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                minWidth: 220,
              }}
            />
          </div>

          <div className="audit-trail__filter" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              APP
            </label>
            <select
              data-testid="filter-app"
              value={app}
              onChange={(e) => setApp(e.target.value)}
              style={{
                padding: "6px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                minWidth: 180,
                background: "#fff",
              }}
            >
              {APP_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="audit-trail__filter" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              RESULT
            </label>
            <select
              data-testid="filter-result"
              value={result}
              onChange={(e) =>
                setResult(e.target.value as "" | "success" | "failed")
              }
              style={{
                padding: "6px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                minWidth: 140,
                background: "#fff",
              }}
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="audit-trail__filter" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              PER PAGE
            </label>
            <select
              data-testid="filter-per-page"
              value={String(pageSize)}
              onChange={(e) => {
                const nextPageSize = Number(e.target.value) as PageSizeOption;
                setPageSize(nextPageSize);
                void fetchAuditTrail(1, nextPageSize);
              }}
              style={{
                padding: "6px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                minWidth: 110,
                background: "#fff",
              }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={String(option)} value={String(option)}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button
            className="audit-trail__apply"
            data-testid="filter-apply-btn"
            onClick={() => void fetchAuditTrail(1)}
            style={{
              padding: "6px 16px",
              background: "#6B21E8",
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
              color: "#b91c1c",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "#94a3b8",
            }}
          >
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "#94a3b8",
              fontSize: 14,
            }}
          >
            No audit trail records found for the selected filters.
          </div>
        ) : (
          <div className="audit-trail__table">
            <table
              className="audit-trail-table"
              data-testid="audit-trail-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  {[
                    "Timestamp",
                    "Email",
                    "Event",
                    "Result",
                    "Details",
                  ].map((head) => (
                    <th
                      key={head}
                      style={{
                        padding: "10px 16px",
                        fontWeight: 600,
                        color: "#64748b",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((log) => {
                  const accessibleApps = normalizeAppsAccessible(
                    log.details?.appsAccessible ?? log.details?.accessibleApps,
                  );
                  const rawAppName =
                    log.action === "LOGIN_SUCCESS" || log.action === "LOGIN_FAILED"
                      ? "Backoffice"
                      : (log.details?.app as string | undefined) ?? log.targetLabel ?? "-";
                  const appName = mapAppLabel(rawAppName);
                  const resultLabel = getResult(log.action);

                  return (
                    <tr
                      key={log.logId}
                      data-testid="audit-trail-row"
                      style={{ borderBottom: "1px solid #f8fafc" }}
                    >
                      <td
                        data-label="Timestamp"
                        className="audit-trail-table__timestamp"
                        style={{
                          padding: "11px 16px",
                          color: "#475569",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td data-label="Email" className="audit-trail-table__email" style={{ padding: "11px 16px" }}>
                        <div style={{ color: "#0f172a", whiteSpace: "normal", wordBreak: "break-word" }}>
                          {log.adminEmail}
                        </div>
                      </td>
                      <td data-label="Event" className="audit-trail-table__event" style={{ padding: "11px 16px", color: "#475569" }}>
                        {getEventLabel(log.action)}
                      </td>
                      <td data-label="Result" className="audit-trail-table__result" style={{ padding: "11px 16px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "3px 9px",
                            borderRadius: 20,
                            background:
                              resultLabel === "failed" ? "#fef2f2" : "#f0fdf4",
                            color:
                              resultLabel === "failed" ? "#b91c1c" : "#15803d",
                          }}
                        >
                          {resultLabel}
                        </span>
                      </td>
                      <td data-label="Details" className="audit-trail-table__details" style={{ padding: "11px 16px" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          style={{
                            padding: 0,
                            border: "none",
                            background: "transparent",
                            color: "#6B21E8",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div
              className="audit-trail__pagination"
              data-testid="audit-trail-pagination"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderTop: "1px solid #f1f5f9",
                color: "#64748b",
                fontSize: 12,
              }}
            >
              <span>{totalItems} records</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  data-testid="pagination-prev"
                  onClick={() => void fetchAuditTrail(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                  style={{
                    padding: "5px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    background: "#fff",
                    color: "#334155",
                    cursor: currentPage <= 1 || loading ? "not-allowed" : "pointer",
                  }}
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  data-testid="pagination-next"
                  onClick={() => void fetchAuditTrail(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                  style={{
                    padding: "5px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    background: "#fff",
                    color: "#334155",
                    cursor:
                      currentPage >= totalPages || loading
                        ? "not-allowed"
                        : "pointer",
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
            data-testid="audit-trail-details-modal"
            aria-labelledby="audit-trail-details-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(720px, 100%)",
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
                  id="audit-trail-details-title"
                  style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}
                >
                  Audit trail details
                </h2>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
                  {getEventLabel(selectedLog.action)} on {formatTimestamp(selectedLog.timestamp)}
                </p>
              </div>
              <button
                type="button"
                data-testid="details-close-btn"
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

            <div style={{ padding: 24, display: "grid", gap: 16 }}>
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
                    {selectedLog.adminUserId ??
                      (selectedLog.details?.userId as string | undefined) ??
                      (selectedLog.details?.cognitoSub as string | undefined) ??
                      "-"}
                  </div>
                </div>
                <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    App
                  </div>
                  <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: "#0f172a", wordBreak: "break-word" }}>
                    {mapAppLabel(
                      selectedLog.action === "LOGIN_SUCCESS" || selectedLog.action === "LOGIN_FAILED"
                        ? "Backoffice"
                        : (selectedLog.details?.app as string | undefined) ?? selectedLog.targetLabel ?? "-",
                    )}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", wordBreak: "break-word" }}>
                    IP {selectedLog.ipAddress ?? (selectedLog.details?.ipAddress as string | undefined) ?? "-"}
                  </div>
                </div>
              </div>

              <div style={{ padding: 16, borderRadius: 12, background: "#ffffff", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Apps accessible
                </div>
                <div style={{ marginTop: 8, color: "#334155", fontSize: 13, lineHeight: 1.6 }}>
                  {normalizeAppsAccessible(
                    selectedLog.details?.appsAccessible ?? selectedLog.details?.accessibleApps,
                  ).join(", ") || "-"}
                </div>
              </div>

              <div style={{ padding: 16, borderRadius: 12, background: "#0f172a", color: "#e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Raw details
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
                  {JSON.stringify(selectedLog.details ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
