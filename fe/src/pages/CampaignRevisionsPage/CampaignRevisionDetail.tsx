import { useEffect, useMemo, useState } from "react";
import { usePermission } from "@/shared/hooks/usePermission";
import CampaignRevisionDiff from "./CampaignRevisionDiff";
import type {
  CategoryOption,
  CampaignRevisionReviewAction,
  CampaignRevisionThreadDetail,
  CampaignRevisionSubmission,
} from "./campaignRevisions.api";

interface CampaignRevisionDetailProps {
  detail: CampaignRevisionThreadDetail | null;
  categories: CategoryOption[];
  loading: boolean;
  acting: boolean;
  onApprove: (threadId: string, message?: string) => Promise<void>;
  onRequestChanges: (threadId: string, message: string) => Promise<void>;
  onReject: (threadId: string, message: string) => Promise<void>;
}

const THREAD_STATUS_LABELS: Record<CampaignRevisionThreadDetail["status"], string> = {
  pending: "Pending",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const THREAD_TYPE_LABELS: Record<CampaignRevisionThreadDetail["type"], string> = {
  initial_approval: "Initial approval",
  live_update: "Live update",
};

const LIVE_STATUS_LABELS: Record<CampaignRevisionThreadDetail["liveCampaignStatus"], string> = {
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

function firstAvailableBeforeSnapshot(detail: CampaignRevisionThreadDetail | null) {
  return detail?.submissions.find((submission) => submission.beforeSnapshot)?.beforeSnapshot ?? null;
}

function previousSubmissionSnapshot(
  detail: CampaignRevisionThreadDetail | null,
  submission: CampaignRevisionSubmission | null,
) {
  if (!detail || !submission) return null;

  const previousSubmission = detail.submissions
    .filter((entry) => entry.submissionNumber < submission.submissionNumber)
    .sort((left, right) => right.submissionNumber - left.submissionNumber)[0];

  return previousSubmission?.afterSnapshot ?? null;
}

function findSubmission(detail: CampaignRevisionThreadDetail | null, submissionId: string | null) {
  if (!detail || !submissionId) return null;
  return detail.submissions.find((submission) => submission.submissionId === submissionId) ?? null;
}

export default function CampaignRevisionDetail({
  detail,
  categories,
  loading,
  acting,
  onApprove,
  onRequestChanges,
  onReject,
}: CampaignRevisionDetailProps) {
  const canModerate = usePermission("approve_reject");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [pendingAction, setPendingAction] = useState<CampaignRevisionReviewAction | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSelectedSubmissionId(detail?.latestSubmissionId ?? null);
    setPendingAction(null);
    setMessage("");
  }, [detail?.threadId, detail?.latestSubmissionId]);

  const selectedSubmission = useMemo<CampaignRevisionSubmission | null>(() => {
    return findSubmission(detail, selectedSubmissionId) ?? detail?.submissions[0] ?? null;
  }, [detail, selectedSubmissionId]);

  const comparisonBeforeSnapshot = useMemo(() => {
    if (!selectedSubmission) return null;

    if (selectedSubmission.beforeSnapshot) {
      return selectedSubmission.beforeSnapshot;
    }

    if (detail?.type === "initial_approval" && selectedSubmission.submissionNumber > 1) {
      return previousSubmissionSnapshot(detail, selectedSubmission);
    }

    return firstAvailableBeforeSnapshot(detail);
  }, [detail, selectedSubmission]);

  const isInitialSubmissionWithoutBaseline =
    detail?.type === "initial_approval" &&
    selectedSubmission?.submissionNumber === 1 &&
    !comparisonBeforeSnapshot;

  const isInitialResubmission =
    detail?.type === "initial_approval" &&
    (selectedSubmission?.submissionNumber ?? 1) > 1;

  if (loading) {
    return (
      <div className="campaign-revisions__detail-state">
        <div className="spinner-border" role="status" style={{ width: "1.6rem", height: "1.6rem" }} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="campaign-revisions__detail-state">
        Select a revision thread to inspect its submission history and moderation details.
      </div>
    );
  }

  const requiresMessage = pendingAction === "changes_requested" || pendingAction === "rejected";
  const contextNote =
    detail.type === "live_update"
      ? detail.status === "changes_requested"
        ? "Changes were requested for this live update. The current live campaign stays public until the creator submits a revised version."
        : "The live campaign remains visible until this submitted version is approved."
      : detail.status === "changes_requested"
        ? isInitialResubmission
          ? "Changes were requested for this initial-approval resubmission. Compare it against the previous submitted version and wait for the creator's next update."
          : "Changes were requested for the first initial-approval submission. There is still no earlier approved baseline for this campaign."
        : isInitialResubmission
          ? "This is an initial-approval resubmission. Compare it against the previous submitted version rather than an empty baseline."
          : "This is the first initial-approval submission. Review the proposed campaign details as a new submission.";

  return (
    <div className="campaign-revisions__detail">
      <div className="campaign-revisions__detail-summary">
        <div className="campaign-revisions__campaign-card">
          {detail.campaign.thumbnailUrl ? (
            <img
              src={detail.campaign.thumbnailUrl}
              alt=""
              className="campaign-revisions__campaign-thumb"
            />
          ) : (
            <div className="campaign-revisions__campaign-thumb is-empty">
              <i className="bi bi-image" />
            </div>
          )}

          <div className="campaign-revisions__campaign-copy">
            <div className="campaign-revisions__eyebrow">Campaign</div>
            <h2>{detail.campaign.title}</h2>
            <div className="campaign-revisions__summary-meta">
              <span>{detail.campaign.creatorName}</span>
              {detail.campaign.creatorUsername && <span>{detail.campaign.creatorUsername}</span>}
              <span>{detail.campaign.categoryName || "Uncategorised"}</span>
              <span>{[detail.campaign.city, detail.campaign.country].filter(Boolean).join(", ")}</span>
            </div>
          </div>
        </div>

        <div className="campaign-revisions__summary-grid">
          <div className="campaign-revisions__summary-stat">
            <span>Thread type</span>
            <strong>{THREAD_TYPE_LABELS[detail.type]}</strong>
          </div>
          <div className="campaign-revisions__summary-stat">
            <span>Thread status</span>
            <strong>{THREAD_STATUS_LABELS[detail.status]}</strong>
          </div>
          <div className="campaign-revisions__summary-stat">
            <span>Live campaign status</span>
            <strong>{LIVE_STATUS_LABELS[detail.liveCampaignStatus]}</strong>
          </div>
          <div className="campaign-revisions__summary-stat">
            <span>Latest submission</span>
            <strong>#{detail.latestSubmissionNumber}</strong>
          </div>
        </div>
      </div>

      <div className="campaign-revisions__review-workspace">
        <main className="campaign-revisions__review-main">
          <section className="campaign-revisions__panel">
            <div className="campaign-revisions__panel-head">
              <div>
                <h3>{isInitialSubmissionWithoutBaseline ? "Submitted campaign details" : "Submission diff"}</h3>
                <p>
                  {isInitialSubmissionWithoutBaseline
                    ? "This campaign has just been created, so there is no previous version to compare against."
                    : isInitialResubmission
                      ? "Comparing the selected submission against the previous submitted version in this approval cycle."
                      : "Comparing the selected submission against the baseline available for this thread."}
                </p>
              </div>

              {!isInitialSubmissionWithoutBaseline && (
                <label className="campaign-revisions__toggle">
                  <input
                    type="checkbox"
                    checked={showUnchanged}
                    onChange={(event) => setShowUnchanged(event.target.checked)}
                  />
                  <span>Show unchanged fields</span>
                </label>
              )}
            </div>

            {selectedSubmission && (
              <CampaignRevisionDiff
                beforeSnapshot={comparisonBeforeSnapshot}
                afterSnapshot={selectedSubmission.afterSnapshot}
                categories={categories}
                showUnchanged={isInitialSubmissionWithoutBaseline ? true : showUnchanged}
                mode={isInitialSubmissionWithoutBaseline ? "snapshot" : "diff"}
                currentLabel="Submitted"
              />
            )}
          </section>
        </main>

        <aside className="campaign-revisions__review-rail">
          <div className="campaign-revisions__context-note">
            {contextNote}
          </div>

          <section className="campaign-revisions__panel">
            <div className="campaign-revisions__panel-head">
              <h3>Submission history</h3>
              <span>{detail.submissions.length} submission{detail.submissions.length === 1 ? "" : "s"}</span>
            </div>

            <div className="campaign-revisions__submission-list">
              {detail.submissions.map((submission) => (
                <button
                  key={submission.submissionId}
                  type="button"
                  className={`campaign-revisions__submission-item${selectedSubmission?.submissionId === submission.submissionId ? " is-selected" : ""}`}
                  onClick={() => setSelectedSubmissionId(submission.submissionId)}
                >
                  <div>
                    <strong>Submission #{submission.submissionNumber}</strong>
                    <div>{formatDateTime(submission.createdAt)}</div>
                  </div>
                  {submission.submissionId === detail.latestSubmissionId && (
                    <span className="campaign-revisions__inline-badge">Latest</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="campaign-revisions__panel">
            <div className="campaign-revisions__panel-head">
              <h3>Review history</h3>
              <span>{detail.reviews.length} event{detail.reviews.length === 1 ? "" : "s"}</span>
            </div>

            {detail.reviews.length === 0 ? (
              <div className="campaign-revisions__empty-panel">No moderation history yet.</div>
            ) : (
              <div className="campaign-revisions__review-list">
                {detail.reviews.map((review) => (
                  <div key={review.reviewId} className="campaign-revisions__review-item">
                    <div className="campaign-revisions__review-top">
                      <span className={`campaign-revisions__pill is-${review.action.replace(/_/g, "-")}`}>
                        {review.action === "changes_requested"
                          ? "Changes requested"
                          : review.action === "rejected"
                            ? "Rejected"
                            : "Approved"}
                      </span>
                      <span>{formatDateTime(review.createdAt)}</span>
                    </div>
                    <div className="campaign-revisions__review-actor">
                      {review.reviewedByEmail || review.reviewedByAccountId}
                    </div>
                    <p>{review.message || "No message provided."}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {canModerate && (
            <section className="campaign-revisions__panel">
              <div className="campaign-revisions__panel-head">
                <div>
                  <h3>Moderation</h3>
                  <p>
                    Review the latest submission and decide whether to approve it, request changes, or reject it.
                  </p>
                </div>
              </div>

              {detail.status !== "pending" ? (
                <div className="campaign-revisions__context-note">
                  {detail.status === "changes_requested"
                    ? "Changes have already been requested for this thread. Moderation actions stay locked until the creator submits a new revision."
                    : "This thread is no longer pending, so moderation actions are locked."}
                </div>
              ) : (
                <>
                  {pendingAction && (
                    <div className="campaign-revisions__composer">
                      <div className="campaign-revisions__composer-title">
                        {pendingAction === "changes_requested"
                          ? "Request changes"
                          : pendingAction === "rejected"
                            ? "Reject revision"
                            : "Approve revision"}
                      </div>
                      <textarea
                        rows={4}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder={
                          pendingAction === "approved"
                            ? "Optional note for the moderation record."
                            : "Provide the moderator note that will be recorded for this thread."
                        }
                      />
                      <div className="campaign-revisions__composer-actions">
                        <button
                          type="button"
                          className="campaign-revisions__button is-secondary"
                          onClick={() => {
                            setPendingAction(null);
                            setMessage("");
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className={`campaign-revisions__button${pendingAction === "rejected" ? " is-danger" : ""}`}
                          disabled={acting || (requiresMessage && !message.trim())}
                          onClick={async () => {
                            if (pendingAction === "approved") {
                              await onApprove(detail.threadId, message);
                            } else if (pendingAction === "changes_requested") {
                              await onRequestChanges(detail.threadId, message);
                            } else {
                              await onReject(detail.threadId, message);
                            }
                          }}
                        >
                          {acting
                            ? "Saving..."
                            : pendingAction === "approved"
                              ? "Approve revision"
                              : pendingAction === "changes_requested"
                                ? "Request changes"
                                : "Reject revision"}
                        </button>
                      </div>
                    </div>
                  )}

                  {!pendingAction && (
                    <div className="campaign-revisions__moderation-actions">
                      <button
                        type="button"
                        className="campaign-revisions__button"
                        disabled={acting}
                        onClick={() => setPendingAction("approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="campaign-revisions__button is-secondary"
                        disabled={acting}
                        onClick={() => setPendingAction("changes_requested")}
                      >
                        Request changes
                      </button>
                      <button
                        type="button"
                        className="campaign-revisions__button is-danger"
                        disabled={acting}
                        onClick={() => setPendingAction("rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
