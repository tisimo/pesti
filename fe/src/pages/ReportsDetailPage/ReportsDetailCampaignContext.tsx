import type { CampaignComment, CampaignDetails, CampaignDonation } from "./reportsDetail.api";
import { formatCurrency, formatDate, formatDateTime } from "./reportsDetail.model";

interface ReportsDetailCampaignContextProps {
  campaign: CampaignDetails | null;
  campaignLoading: boolean;
  mediaUrls: string[];
  activeImage: number;
  onSelectImage: (index: number) => void;
  story: string;
  goalAmount: number;
  amountRaised: number;
  donorCount: number;
  progress: number;
  comments: CampaignComment[];
  donations: CampaignDonation[];
}

export function ReportsDetailCampaignContext({
  campaign,
  campaignLoading,
  mediaUrls,
  activeImage,
  onSelectImage,
  story,
  goalAmount,
  amountRaised,
  donorCount,
  progress,
  comments,
  donations,
}: ReportsDetailCampaignContextProps) {
  return (
    <section className="report-detail__card report-detail__card--soft">
      <div className="report-detail__card-header">
        <div>
          <h3 className="report-detail__card-title">Campaign context</h3>
          <p className="report-detail__card-subtitle">Review the live campaign content and surrounding context before making a moderation decision.</p>
        </div>
      </div>

      {campaignLoading ? (
        <div className="report-detail__spinner">
          <span className="spinner-border spinner-border-sm" role="status" style={{ width: "1rem", height: "1rem", color: "#0047AB" }} />
          Loading campaign context...
        </div>
      ) : !campaign ? (
        <div className="report-detail__empty">Campaign details are not available for this report.</div>
      ) : (
        <div className="report-detail__campaign-grid">
          <div className="report-detail__section-stack">
            <div className="report-detail__card" style={{ padding: 16 }}>
              <div className="report-detail__card-header">
                <div>
                  <h4 className="report-detail__card-title" style={{ fontSize: 14 }}>
                    Media
                  </h4>
                  <p className="report-detail__card-subtitle">
                    Confirm whether the uploaded visuals support or contradict the report.
                  </p>
                </div>
              </div>

              {mediaUrls.length > 0 ? (
                <>
                  <div className="report-detail__media-hero">
                    <img src={mediaUrls[activeImage]} alt={`Campaign media ${activeImage + 1}`} />
                  </div>
                  {mediaUrls.length > 1 ? (
                    <div className="report-detail__media-thumbs">
                      {mediaUrls.map((url, index) => (
                        <button
                          key={url}
                          type="button"
                          className={`report-detail__media-thumb-btn ${index === activeImage ? "report-detail__media-thumb-btn--active" : ""}`}
                          onClick={() => onSelectImage(index)}
                          aria-label={`View campaign media ${index + 1}`}
                        >
                          <img src={url} alt={`Campaign thumbnail ${index + 1}`} />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="report-detail__empty">No campaign media available.</div>
              )}
            </div>

            <div className="report-detail__card" style={{ padding: 16 }}>
              <div className="report-detail__card-header">
                <div>
                  <h4 className="report-detail__card-title" style={{ fontSize: 14 }}>
                    Story
                  </h4>
                  <p className="report-detail__card-subtitle">Review the live campaign copy and fundraising narrative.</p>
                </div>
              </div>
              <div className="report-detail__story">{story || "No description available."}</div>
            </div>

            <div className="report-detail__card" style={{ padding: 16 }}>
              <div className="report-detail__card-header">
                <div>
                  <h4 className="report-detail__card-title" style={{ fontSize: 14 }}>
                    Public comments
                  </h4>
                  <p className="report-detail__card-subtitle">
                    Check community feedback for extra context or signals of abuse.
                  </p>
                </div>
              </div>

              {comments.length > 0 ? (
                <div className="report-detail__comment-list">
                  {comments.map((comment, index) => (
                    <div key={comment.commentId ?? `${comment.createdAt ?? "comment"}-${index}`} className="report-detail__comment-item">
                      <span className="report-detail__comment-meta">
                        {comment.authorName || comment.username || "Anonymous"} - {formatDateTime(comment.createdAt)}
                      </span>
                      <div className="report-detail__comment-text">{comment.text || comment.content || "No comment text available."}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="report-detail__empty">No comments available.</div>
              )}
            </div>
          </div>

          <div className="report-detail__section-stack">
            <div className="report-detail__card" style={{ padding: 16 }}>
              <div className="report-detail__card-header">
                <div>
                  <h4 className="report-detail__card-title" style={{ fontSize: 14 }}>
                    Campaign snapshot
                  </h4>
                  <p className="report-detail__card-subtitle">High-level funding and lifecycle signals for this cause.</p>
                </div>
              </div>

              <div className="report-detail__meta-grid">
                <div className="report-detail__meta-item">
                  <span>Goal</span>
                  <span>{formatCurrency(goalAmount)}</span>
                </div>
                <div className="report-detail__meta-item">
                  <span>Raised</span>
                  <span>{formatCurrency(amountRaised)}</span>
                </div>
                <div className="report-detail__meta-item">
                  <span>Donors</span>
                  <span>{donorCount.toLocaleString()}</span>
                </div>
                <div className="report-detail__meta-item">
                  <span>Progress</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <div className="report-detail__card" style={{ padding: 16 }}>
              <div className="report-detail__card-header">
                <div>
                  <h4 className="report-detail__card-title" style={{ fontSize: 14 }}>
                    Creator
                  </h4>
                  <p className="report-detail__card-subtitle">Useful identity and publication context for moderation.</p>
                </div>
              </div>

              <div className="report-detail__meta-grid">
                <div className="report-detail__meta-item">
                  <span>Name</span>
                  <span>{[campaign.creatorFirstName, campaign.creatorLastName].filter(Boolean).join(" ") || "Unknown"}</span>
                </div>
                <div className="report-detail__meta-item">
                  <span>Username</span>
                  <span>{campaign.creatorUsername ? `@${campaign.creatorUsername}` : "-"}</span>
                </div>
                <div className="report-detail__meta-item">
                  <span>Country</span>
                  <span>{campaign.country || "-"}</span>
                </div>
                <div className="report-detail__meta-item">
                  <span>City</span>
                  <span>{campaign.city || "-"}</span>
                </div>
                <div className="report-detail__meta-item">
                  <span>Created</span>
                  <span>{formatDate(campaign.createdAt)}</span>
                </div>
                <div className="report-detail__meta-item">
                  <span>Published</span>
                  <span>{formatDate(campaign.publishedAt)}</span>
                </div>
              </div>
            </div>

            <div className="report-detail__card" style={{ padding: 16 }}>
              <div className="report-detail__card-header">
                <div>
                  <h4 className="report-detail__card-title" style={{ fontSize: 14 }}>
                    Contributions
                  </h4>
                  <p className="report-detail__card-subtitle">Donation history can help identify suspicious spikes or behavior.</p>
                </div>
              </div>

              {donations.length > 0 ? (
                <div className="report-detail__table-wrap">
                  <table className="report-detail__table">
                    <thead>
                      <tr>
                        <th>Donor</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donations.map((donation) => (
                        <tr key={donation.donationId}>
                          <td>{donation.donorName || "Anonymous"}</td>
                          <td>{formatCurrency(donation.amount)}</td>
                          <td>{donation.status}</td>
                          <td>{formatDate(donation.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="report-detail__empty">No contributions found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
