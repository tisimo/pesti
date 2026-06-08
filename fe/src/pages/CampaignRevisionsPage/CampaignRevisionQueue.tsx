import type { CampaignRevisionThreadSummary } from "./campaignRevisions.api";

interface CampaignRevisionQueueProps {
  items: CampaignRevisionThreadSummary[];
  loading: boolean;
  onOpen: (threadId: string) => void;
}

const THREAD_STATUS_LABELS: Record<CampaignRevisionThreadSummary["status"], string> = {
  pending: "Pending",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const THREAD_TYPE_LABELS: Record<CampaignRevisionThreadSummary["type"], string> = {
  initial_approval: "Initial approval",
  live_update: "Live update",
};

const LIVE_STATUS_LABELS: Record<CampaignRevisionThreadSummary["liveCampaignStatus"], string> = {
  active: "Active",
  inactive: "Inactive",
  finished: "Finished",
  pending: "Pending",
  reviewing: "Reviewing",
  rejected: "Rejected",
  deleted: "Deleted",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CampaignRevisionQueue({
  items,
  loading,
  onOpen,
}: CampaignRevisionQueueProps) {
  if (loading) {
    return (
      <div className="campaign-revisions__queue-state">
        <div className="spinner-border" role="status" style={{ width: "1.4rem", height: "1.4rem" }} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="campaign-revisions__queue-state">
        No revision threads found for the selected filters.
      </div>
    );
  }

  return (
    <div className="campaign-revisions__queue-list">
      {items.map((item) => (
        <button
          key={item.threadId}
          type="button"
          onClick={() => onOpen(item.threadId)}
          className="campaign-revisions__queue-item"
        >
          <div className="campaign-revisions__queue-item-top">
            <span className="campaign-revisions__queue-title">{item.campaign.title}</span>
            <span className={`campaign-revisions__pill is-${item.status.replace(/_/g, "-")}`}>
              {THREAD_STATUS_LABELS[item.status]}
            </span>
          </div>

          <div className="campaign-revisions__queue-meta">
            <span>{THREAD_TYPE_LABELS[item.type]}</span>
            <span>{item.campaign.creatorName}</span>
            <span>{item.campaign.categoryName || "Uncategorised"}</span>
          </div>

          <div className="campaign-revisions__queue-submeta">
            <span>Submission #{item.latestSubmissionNumber}</span>
            <span>Live: {LIVE_STATUS_LABELS[item.liveCampaignStatus]}</span>
            <span>{formatDateTime(item.latestSubmittedAt)}</span>
          </div>

          {item.lastAdminMessage && (
            <div className="campaign-revisions__queue-note">{item.lastAdminMessage}</div>
          )}

          <div className="campaign-revisions__queue-action">
            <span>Open revision review</span>
            <i className="bi bi-arrow-right" />
          </div>
        </button>
      ))}
    </div>
  );
}
