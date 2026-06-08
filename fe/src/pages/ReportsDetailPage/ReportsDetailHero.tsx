import type { AdminReport } from "./reportsDetail.api";
import type { BadgeConfig } from "./reportsDetail.model";
import { formatDateTime } from "./reportsDetail.model";
import { StatusBadge } from "./ReportsDetailModals";

interface ReportsDetailHeroProps {
  report: AdminReport;
  campaignTitle: string;
  reasonLabel: string;
  evidenceCount: number;
  dueMeta: { label: string; className: string } | null;
  reportStatusConfig: BadgeConfig | null;
  campaignStatusConfig: BadgeConfig | null;
  onBack: () => void;
}

export function ReportsDetailHero({
  report,
  campaignTitle,
  reasonLabel,
  evidenceCount,
  dueMeta,
  reportStatusConfig,
  campaignStatusConfig,
  onBack,
}: ReportsDetailHeroProps) {
  return (
    <>
      <div className="admin-page-header report-detail__header">
        <div>
          <h1>Report Review</h1>
          <p>Review the evidence, inspect the campaign, and decide on the appropriate moderation outcome.</p>
        </div>
        <button type="button" className="report-detail__back-btn" onClick={onBack}>
          <i className="bi bi-arrow-left" aria-hidden="true" />
          Back to Reports
        </button>
      </div>

      <section className="report-detail__hero">
        <div>
          <div className="report-detail__eyebrow">
            <i className="bi bi-shield-exclamation" aria-hidden="true" />
            Moderation Case
          </div>
          <h2>{campaignTitle}</h2>
          <p>Use the report details, campaign context, and supporting evidence to reach a confident moderation decision.</p>
          <div className="report-detail__badge-row">
            {reportStatusConfig ? <StatusBadge config={reportStatusConfig} /> : null}
            <span className="report-detail__badge" style={{ background: "#f1f5f9", color: "#475569" }}>
              <i className="bi bi-tag" aria-hidden="true" />
              {reasonLabel}
            </span>
            {campaignStatusConfig ? <StatusBadge config={campaignStatusConfig} /> : null}
          </div>
        </div>

        <div className="report-detail__hero-meta">
          <div className="report-detail__hero-stat">
            <span className="report-detail__hero-stat-label">Submitted</span>
            <span className="report-detail__hero-stat-value">{formatDateTime(report.createdAt)}</span>
            <span className="report-detail__hero-stat-note">Report received for moderation review.</span>
          </div>
          <div className="report-detail__hero-stat">
            <span className="report-detail__hero-stat-label">Review due</span>
            <span className={`report-detail__hero-stat-value ${dueMeta?.className ?? ""}`}>
              {dueMeta?.label ?? "No due date available"}
            </span>
            <span className="report-detail__hero-stat-note">{formatDateTime(report.reviewDueAt)}</span>
          </div>
          <div className="report-detail__hero-stat">
            <span className="report-detail__hero-stat-label">Evidence</span>
            <span className="report-detail__hero-stat-value">
              {evidenceCount} item{evidenceCount === 1 ? "" : "s"}
            </span>
            <span className="report-detail__hero-stat-note">
              {evidenceCount > 0 ? "Open thumbnails below for a closer review." : "No image evidence attached."}
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
