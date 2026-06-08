import type { ReportAction } from "./reportsDetail.api";
import { ACTION_CONFIG, getCreatorImpactSummary, type ActionDraft, type BadgeConfig } from "./reportsDetail.model";

export function StatusBadge({ config }: { config: BadgeConfig }) {
  return (
    <span className="report-detail__badge" style={{ background: config.bg, color: config.color }}>
      <i className={`bi ${config.icon}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}

export function LoadingState() {
  return (
    <div className="report-detail__card" style={{ textAlign: "center", padding: 48 }}>
      <div className="spinner-border" role="status" style={{ width: "1.5rem", height: "1.5rem", color: "#0047AB" }} />
    </div>
  );
}

export function EmptyState({ reportId, onBack }: { reportId?: string; onBack: () => void }) {
  return (
    <>
      <div className="admin-page-header">
        <h1>Report Review</h1>
        <p>Unable to load report details for ID: {reportId}</p>
      </div>
      <div className="report-detail__card">
        <p className="report-detail__card-subtitle" style={{ marginTop: 0 }}>
          This page expects report data from the list view or a valid report ID in the URL.
        </p>
        <button type="button" className="report-detail__button report-detail__button--soft" onClick={onBack}>
          Back to Reports
        </button>
      </div>
    </>
  );
}

interface ConfirmationModalProps {
  action: ReportAction;
  draft: ActionDraft;
  summary: string;
  creatorStrikeCount?: number | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmationModal({ action, draft, summary, creatorStrikeCount, busy, onClose, onConfirm }: ConfirmationModalProps) {
  const config = ACTION_CONFIG[action];
  const creatorImpact = getCreatorImpactSummary(action, creatorStrikeCount, draft.applyStrike);

  return (
    <div className="report-detail__modal-backdrop" role="presentation" onClick={onClose}>
      <div className="report-detail__modal" role="dialog" aria-modal="true" aria-labelledby="report-confirm-title" onClick={(event) => event.stopPropagation()}>
        <div className="report-detail__card-header">
          <div>
            <h3 id="report-confirm-title" className="report-detail__card-title">
              Confirm {config.label.toLowerCase()}
            </h3>
            <p className="report-detail__card-subtitle">
              Review the message, summary, and resolution choice before this moderation action is sent.
            </p>
          </div>
          <button type="button" className="report-detail__button report-detail__button--soft" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>

        {creatorImpact ? (
          <div className={`report-detail__callout report-detail__callout--${creatorImpact.tone}`}>
            <strong className="report-detail__callout-title">{creatorImpact.title}</strong>
            {creatorImpact.message}
          </div>
        ) : null}

        <div className="report-detail__confirm-summary">
          <div className="report-detail__confirm-row">
            <span>Action</span>
            <span>{config.label}</span>
          </div>
          {creatorImpact && typeof creatorImpact.currentStrikeCount === "number" ? (
            <div className="report-detail__confirm-row">
              <span>Creator strikes</span>
              <span>
                {draft.applyStrike && typeof creatorImpact.nextStrikeCount === "number" && creatorImpact.nextStrikeCount !== creatorImpact.currentStrikeCount
                  ? `${creatorImpact.currentStrikeCount} -> ${creatorImpact.nextStrikeCount} of 3`
                  : `${creatorImpact.currentStrikeCount} of 3`}
              </span>
            </div>
          ) : null}
          {creatorImpact ? (
            <div className="report-detail__confirm-row">
              <span>Strike outcome</span>
              <span>{draft.applyStrike ? "Record strike" : "No strike recorded"}</span>
            </div>
          ) : null}
          <div className="report-detail__confirm-row">
            <span>Report status after action</span>
            <span>{draft.resolve ? "Marked as resolved" : "Keep current status"}</span>
          </div>
          {draft.message.trim() ? (
            <div className="report-detail__confirm-row">
              <span>{config.messageLabel}</span>
              <span>{draft.message.trim()}</span>
            </div>
          ) : null}
          <div className="report-detail__confirm-row">
            <span>{config.summaryLabel}</span>
            <span>{summary}</span>
          </div>
        </div>

        <div className="report-detail__button-row">
          <div className="report-detail__helper">{config.impact}</div>
          <div className="report-detail__button-group">
            <button type="button" className="report-detail__button report-detail__button--soft" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className={`report-detail__button ${config.tone === "danger" ? "report-detail__button--danger" : "report-detail__button--primary"}`}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" style={{ width: "1rem", height: "1rem" }} />
                  Processing...
                </>
              ) : (
                config.confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
