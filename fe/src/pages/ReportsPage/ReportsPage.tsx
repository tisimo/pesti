import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiBackoffice } from "@/shared/lib/axios";
import { resolveEvidenceUrls } from "@/shared/lib/evidence";
import { useAnyPermission } from "@/shared/hooks/usePermission";
import { useClampPageToTotal } from "@/shared/hooks/useClampPageToTotal";
import {
  PAGE_SIZE,
  REASON_LABELS,
  STATUS_CONFIG,
  STATUS_FILTERS,
  formatDate,
  formatReporter,
  getDueMeta,
  getStatementPreview,
  type AdminReport,
  type ReportsPageResponse,
  type ReportStatus,
} from "./reportsPage.model";
import "./reportsPage.css";

function getEvidenceSummary(report: AdminReport) {
  const urls = resolveEvidenceUrls(report.evidenceUrls, report.evidence, report.evidenceText);
  if (urls.length > 0) {
    return {
      label: `${urls.length} file${urls.length === 1 ? "" : "s"} attached`,
      urls,
      text: report.evidenceText || report.evidence || "",
    };
  }

  const textEvidence = report.evidenceText?.trim() || report.evidence?.trim() || "";
  if (textEvidence) {
    return {
      label: "Text evidence provided",
      urls,
      text: textEvidence,
    };
  }

  return {
    label: "No evidence",
    urls,
    text: "",
  };
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canModerateReports = useAnyPermission(["respond", "approve_reject", "block_suspend"]);

  const [data, setData] = useState<ReportsPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1));
  const [statusFilter, setStatusFilter] = useState<"" | ReportStatus>((searchParams.get("status") as ReportStatus | "") || "");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (page > 1) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [statusFilter, page, setSearchParams]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});

  async function fetchData() {
    setLoading(true);
    try {
      const response = await apiBackoffice.get<ReportsPageResponse>("/ojc/reports", {
        params: {
          status: statusFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      });

      setData(response.data);
      setExpandedIds((previous) =>
        previous.filter((id) => response.data.reports.some((report) => report.reportId === id)),
      );
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();
  }, [page, statusFilter]);

  async function saveReportUpdate(
    report: AdminReport,
    nextStatus: ReportStatus,
    options?: { collapseAfterSave?: boolean },
  ) {
    setUpdatingId(report.reportId);
    const resolutionNote = noteValues[report.reportId]?.trim() || undefined;

    try {
      await apiBackoffice.patch(`/ojc/reports/${report.reportId}/status`, {
        status: nextStatus,
        resolutionNote,
      });

      setNoteValues((previous) => ({
        ...previous,
        [report.reportId]: resolutionNote ?? report.resolutionNote ?? "",
      }));

      if (options?.collapseAfterSave) {
        setExpandedIds((previous) => previous.filter((id) => id !== report.reportId));
      }

      await fetchData();
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleStatusChange(report: AdminReport, nextStatus: ReportStatus) {
    await saveReportUpdate(report, nextStatus, { collapseAfterSave: true });
  }

  async function handleSaveNote(report: AdminReport) {
    await saveReportUpdate(report, report.status);
  }

  function toggleExpanded(report: AdminReport) {
    setExpandedIds((previous) =>
      previous.includes(report.reportId)
        ? previous.filter((id) => id !== report.reportId)
        : [...previous, report.reportId],
    );

    setNoteValues((previous) => {
      if (previous[report.reportId] !== undefined) return previous;
      return {
        ...previous,
        [report.reportId]: report.resolutionNote ?? "",
      };
    });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  useClampPageToTotal({ page, totalPages, setPage, disabled: loading || !data });
  const allExpanded = data ? data.reports.length > 0 && expandedIds.length === data.reports.length : false;
  const showingCount = data?.reports.length ?? 0;

  return (
    <div className="reports-page">
      <div className="admin-page-header reports-page__header">
        <div>
          <h1>Reports</h1>
          <p>Review incoming moderation cases, triage urgency, and open the full case when deeper investigation is needed.</p>
        </div>

        <div className="reports-page__header-meta">
          <div className="reports-page__metric">
            <span className="reports-page__metric-label">Queue size</span>
            <strong className="reports-page__metric-value">{data?.total?.toLocaleString() ?? "0"}</strong>
          </div>
          <div className="reports-page__metric">
            <span className="reports-page__metric-label">Current page</span>
            <strong className="reports-page__metric-value">{page}</strong>
          </div>
        </div>
      </div>

      <section className="reports-page__toolbar">
        <div className="reports-page__filters" aria-label="Report status filters">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              className={`reports-page__filter-chip ${statusFilter === filter.value ? "reports-page__filter-chip--active" : ""}`}
              onClick={() => {
                setStatusFilter(filter.value);
                setPage(1);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="reports-page__toolbar-actions">
          <button
            type="button"
            className="reports-page__toolbar-button"
            onClick={() => {
              if (!data) return;
              setExpandedIds(allExpanded ? [] : data.reports.map((report) => report.reportId));
              if (!allExpanded) {
                setNoteValues((previous) => {
                  const nextValues = { ...previous };
                  data.reports.forEach((report) => {
                    if (nextValues[report.reportId] === undefined) {
                      nextValues[report.reportId] = report.resolutionNote ?? "";
                    }
                  });
                  return nextValues;
                });
              }
            }}
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>

          <div className="reports-page__results-meta">
            Showing {showingCount} of {data?.total?.toLocaleString() ?? "0"} reports
          </div>
        </div>
      </section>

      <section className="reports-page__list">
        {loading ? (
          <div className="reports-page__state">
            <div className="spinner-border" role="status" style={{ width: "1.8rem", height: "1.8rem", color: "#0047AB" }} />
          </div>
        ) : !data || data.reports.length === 0 ? (
          <div className="reports-page__empty">
            <h3>No reports found</h3>
            <p>{statusFilter ? "No cases match the current status filter." : "There are no campaign abuse reports to review right now."}</p>
            {statusFilter ? (
              <button type="button" className="reports-page__toolbar-button" onClick={() => setStatusFilter("")}>
                Clear filter
              </button>
            ) : null}
          </div>
        ) : (
          data.reports.map((report) => {
            const status = STATUS_CONFIG[report.status];
            const dueMeta = getDueMeta(report.reviewDueAt);
            const evidence = getEvidenceSummary(report);
            const isExpanded = expandedIds.includes(report.reportId);
            const isUpdating = updatingId === report.reportId;
            const currentNoteValue = noteValues[report.reportId] ?? "";
            const noteDirty = currentNoteValue.trim() !== (report.resolutionNote ?? "").trim();

            return (
              <article key={report.reportId} className={`reports-page__card ${isExpanded ? "reports-page__card--expanded" : ""}`}>
                <div
                  className="reports-page__card-header"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpanded(report)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleExpanded(report);
                    }
                  }}
                >
                  <div className="reports-page__card-main">
                    <div className="reports-page__title-row">
                      <h2 className="reports-page__title">{report.campaignTitle}</h2>
                      <div className="reports-page__badges">
                        <span className="reports-page__badge" style={{ background: status.bg, color: status.color }}>{status.label}</span>
                        <span className="reports-page__badge reports-page__badge--muted">{REASON_LABELS[report.reason] ?? report.reason}</span>
                        {dueMeta ? <span className={`reports-page__badge reports-page__badge--${dueMeta.tone}`}>{dueMeta.label}</span> : null}
                      </div>
                    </div>

                    <div className="reports-page__meta-row">
                      <span><strong>Reporter:</strong> {formatReporter(report)}</span>
                      <span><strong>Submitted:</strong> {formatDate(report.createdAt)}</span>
                      <span><strong>Evidence:</strong> {evidence.label}</span>
                      <span><strong>Case ID:</strong> {report.reportId}</span>
                    </div>

                    <p className="reports-page__preview">{getStatementPreview(report)}</p>

                    {report.resolutionNote ? (
                      <div className="reports-page__saved-summary">
                        <span className="reports-page__saved-summary-label">Current summary</span>
                        <span className="reports-page__saved-summary-text">{report.resolutionNote}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="reports-page__header-actions">
                    <button
                      type="button"
                      className="reports-page__primary-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/ojc/reports/${report.reportId}`, { state: { report } });
                      }}
                    >
                      Review case
                    </button>
                    <button
                      type="button"
                      className="reports-page__expand-toggle"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "Collapse report" : "Expand report"}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleExpanded(report);
                      }}
                    >
                      <i className={`bi bi-chevron-${isExpanded ? "up" : "down"}`} />
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="reports-page__card-body">
                    <div className="reports-page__detail-grid">
                      <section className="reports-page__panel">
                        <div className="reports-page__panel-header">
                          <h3>Reporter statement</h3>
                          <span>{formatReporter(report)}</span>
                        </div>
                        <p className="reports-page__panel-copy">{getStatementPreview(report)}</p>
                      </section>

                      <section className="reports-page__panel">
                        <div className="reports-page__panel-header">
                          <h3>Evidence</h3>
                          <span>{evidence.label}</span>
                        </div>
                        {evidence.urls.length > 0 ? (
                          <div className="reports-page__evidence-grid">
                            {evidence.urls.map((url, index) => (
                              <a
                                key={`${url}-${index}`}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="reports-page__evidence-link"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <img src={url} alt={`Evidence ${index + 1}`} className="reports-page__evidence-thumb" />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="reports-page__evidence-empty">{evidence.text || "No evidence provided."}</div>
                        )}
                      </section>
                    </div>

                    <div className="reports-page__detail-grid reports-page__detail-grid--secondary">
                      <section className="reports-page__panel">
                        <div className="reports-page__panel-header">
                          <h3>Case context</h3>
                          <span>For quick triage</span>
                        </div>
                        <div className="reports-page__info-list">
                          <div className="reports-page__info-item"><span>Campaign ID</span><strong>{report.campaignId}</strong></div>
                          <div className="reports-page__info-item"><span>Reported on</span><strong>{formatDate(report.createdAt)}</strong></div>
                          <div className="reports-page__info-item"><span>Review due</span><strong>{dueMeta?.label ?? "-"}</strong></div>
                          <div className="reports-page__info-item"><span>Current status</span><strong>{status.label}</strong></div>
                        </div>
                      </section>

                      <section className="reports-page__panel">
                        <div className="reports-page__panel-header">
                          <h3>Quick update</h3>
                          <span>{canModerateReports ? "Apply a fast status change from the queue." : "View only"}</span>
                        </div>
                        {canModerateReports ? (
                          <>
                            <label className="reports-page__field-label" htmlFor={`report-note-${report.reportId}`}>Case summary</label>
                            <textarea
                              id={`report-note-${report.reportId}`}
                              className="reports-page__textarea"
                              rows={3}
                              value={currentNoteValue}
                              placeholder="Capture the current moderation summary for this case."
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                setNoteValues((previous) => ({
                                  ...previous,
                                  [report.reportId]: event.target.value,
                                }))
                              }
                            />

                            <div className="reports-page__actions">
                              <button
                                type="button"
                                className="reports-page__action reports-page__action--primary"
                                disabled={isUpdating || !noteDirty}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleSaveNote(report);
                                }}
                              >
                                Save note
                              </button>
                              {report.status !== "OPEN" ? (
                                <button type="button" className="reports-page__action reports-page__action--neutral" disabled={isUpdating} onClick={(event) => { event.stopPropagation(); void handleStatusChange(report, "OPEN"); }}>Reopen</button>
                              ) : null}
                              {report.status !== "IN_REVIEW" ? (
                                <button type="button" className="reports-page__action reports-page__action--warning" disabled={isUpdating} onClick={(event) => { event.stopPropagation(); void handleStatusChange(report, "IN_REVIEW"); }}>Mark in review</button>
                              ) : null}
                              {report.status !== "RESOLVED" ? (
                                <button type="button" className="reports-page__action reports-page__action--success" disabled={isUpdating} onClick={(event) => { event.stopPropagation(); void handleStatusChange(report, "RESOLVED"); }}>Resolve</button>
                              ) : null}
                              {report.status !== "DISMISSED" ? (
                                <button type="button" className="reports-page__action reports-page__action--soft" disabled={isUpdating} onClick={(event) => { event.stopPropagation(); void handleStatusChange(report, "DISMISSED"); }}>Dismiss</button>
                              ) : null}
                            </div>

                            <div className="reports-page__footer-row">
                              <div className="reports-page__helper">
                                {isUpdating ? "Updating report..." : "Use the full case view when you need evidence review, notes, or creator-facing actions."}
                              </div>
                              {isUpdating ? (
                                <span className="spinner-border spinner-border-sm" role="status" style={{ width: "1rem", height: "1rem", color: "#0047AB" }} />
                              ) : (
                                <button
                                  type="button"
                                  className="reports-page__secondary-link"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    navigate(`/ojc/reports/${report.reportId}`, { state: { report } });
                                  }}
                                >
                                  Open full case
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                            <div className="reports-page__read-only">
                            You can inspect the queue here, but only users with moderation permissions can update case status from this page.
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>

      {!loading && data && totalPages > 1 ? (
        <div className="reports-page__pagination">
          <span className="reports-page__pagination-label">Page {page} of {totalPages}</span>
          <div className="reports-page__pagination-actions">
            <button type="button" className="reports-page__toolbar-button" disabled={page <= 1} onClick={() => setPage((previous) => previous - 1)}>Previous</button>
            <button type="button" className="reports-page__toolbar-button" disabled={page >= totalPages} onClick={() => setPage((previous) => previous + 1)}>Next</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
