import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiBackoffice } from "@/shared/lib/axios";
import { usePermission } from "@/shared/hooks/usePermission";
import { useClampPageToTotal } from "@/shared/hooks/useClampPageToTotal";
import "./organizationsPage.css";

type VerificationStatus = "PENDING" | "VERIFIED" | "DECLINED" | null;

interface KybFile {
  fileUrl: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

interface KybSubmission {
  submissionId: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string | null;
  businessRegistrationFile: KybFile;
  representativeIdFile: KybFile;
  representativeSelfieFile: KybFile;
  submittedAt: string;
  updatedAt: string;
}

interface OrganizationListItem {
  profileId: string;
  accountId: string;
  legalName: string | null;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  organizationType: string | null;
  role: string | null;
  website: string | null;
  country: string | null;
  city: string | null;
  createdAt: string;
  email: string | null;
  verificationStatus: VerificationStatus;
  accountStatus: string | null;
  campaignCount: number;
  activeCampaigns: number;
  totalRaised: number;
}

interface OrganizationCampaign {
  campaignId: string;
  title: string;
  status: string;
  amountRaised: number;
  goalAmount: number;
  createdAt: string;
}

interface OrganizationProfile extends OrganizationListItem {
  taxId: string | null;
  socialLinks: string[];
  campaigns: OrganizationCampaign[];
}

interface OrganizationsResponse {
  organizations: OrganizationListItem[];
  total: number;
}

const PAGE_SIZE = 18;
const STALE_REVIEW_DAYS = 7;
import { JUSTCAUSES_URL } from "@/shared/config/env";

const ORGANIZATION_TYPE_OPTIONS = [
  { value: "", label: "All organization types" },
  { value: "NGO", label: "NGO" },
  { value: "CHARITY", label: "Charity" },
  { value: "FOUNDATION", label: "Foundation" },
  { value: "ASSOCIATION", label: "Association" },
  { value: "RELIGIOUS", label: "Religious Organization" },
  { value: "OTHER", label: "Other" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatUrlLabel(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function locationLabel(city?: string | null, country?: string | null) {
  return [city?.trim(), country?.trim()].filter(Boolean).join(", ") || "Location not provided";
}

function organizationName(organization: { legalName: string | null; username: string }) {
  return organization.legalName?.trim() || organization.username;
}

function statusTone(status: string | null) {
  if (status === "VERIFIED" || status === "ACTIVE") return "good";
  if (status === "PENDING") return "warn";
  if (status === "DECLINED" || status === "INACTIVE" || status === "SUSPENDED") return "bad";
  return "neutral";
}

function StatusPill({ label, tone }: { label: string; tone: "good" | "warn" | "bad" | "neutral" }) {
  return (
    <span className={`organizations-page__pill organizations-page__pill--${tone}`}>
      {label}
    </span>
  );
}

function kybStatusTone(status: KybSubmission["status"]): "good" | "warn" | "bad" {
  if (status === "approved") return "good";
  if (status === "rejected") return "bad";
  return "warn";
}

function kybStatusLabel(status: KybSubmission["status"]) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending review";
}

function isOlderThanDays(value: string | null | undefined, days: number) {
  const timestamp = new Date(value ?? "").getTime();
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp >= days * 24 * 60 * 60 * 1000;
}

function canRejectStaleKyb(submission: KybSubmission) {
  return submission.status === "pending" && isOlderThanDays(submission.submittedAt, STALE_REVIEW_DAYS);
}

function KybDocumentLink({ label, file }: { label: string; file: KybFile }) {
  const isImage = file.contentType.startsWith("image/");
  const icon = isImage ? "bi-image" : "bi-file-earmark-pdf";
  const sizeKb = Math.round(file.fileSize / 1024);
  return (
    <a
      href={file.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="organizations-page__kyb-doc"
    >
      <i className={`bi ${icon}`} />
      <span>
        <strong>{label}</strong>
        <small>{file.fileName} · {sizeKb} KB</small>
      </span>
      <i className="bi bi-box-arrow-up-right organizations-page__kyb-doc-arrow" />
    </a>
  );
}

function KybSection({
  profileId,
  onReviewed,
  canKyb,
}: {
  profileId: string;
  onReviewed: (newStatus: "approved" | "rejected") => void;
  canKyb: boolean;
}) {
  const [submission, setSubmission] = useState<KybSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!canKyb) {
      setSubmission(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    apiBackoffice
      .get<KybSubmission>(`/ojc/organizations/${profileId}/kyb`)
      .then((r) => setSubmission(r.data))
      .catch(() => setSubmission(null))
      .finally(() => setLoading(false));
  }, [profileId, canKyb]);

  if (!canKyb) {
    return (
      <section className="organizations-page__modal-card organizations-page__modal-card--wide">
        <div className="organizations-page__section-label">KYB Verification</div>
        <p className="organizations-page__empty-copy">
          KYB information requires the View KYB permission.
        </p>
      </section>
    );
  }

  async function handleSubmit() {
    if (!action) return;
    if (action === "reject" && !note.trim()) {
      setActionError("A rejection reason is required.");
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const endpoint = `/ojc/organizations/${profileId}/kyb/${action}`;
      const { data } = await apiBackoffice.post<KybSubmission>(endpoint, {
        adminNote: note.trim() || undefined,
      });
      setSubmission(data);
      setReviewing(false);
      setAction(null);
      setNote("");
      onReviewed(data.status as "approved" | "rejected");
    } catch {
      setActionError("Failed to submit decision. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function rejectStaleSubmission() {
    if (!submission) return;

    setSubmitting(true);
    setActionError(null);
    try {
      const { data } = await apiBackoffice.post<KybSubmission>(`/ojc/organizations/${profileId}/kyb/reject-stale`);
      setSubmission(data);
      setReviewing(false);
      setAction(null);
      setNote("");
      onReviewed(data.status as "approved" | "rejected");
    } catch {
      setActionError("Failed to decline the stale KYB submission. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="organizations-page__modal-card organizations-page__modal-card--wide">
        <div className="organizations-page__section-label">KYB Verification</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 14 }}>
          <div className="spinner-border spinner-border-sm" role="status" />
          Loading KYB submission…
        </div>
      </section>
    );
  }

  if (!submission) {
    return (
      <section className="organizations-page__modal-card organizations-page__modal-card--wide">
        <div className="organizations-page__section-label">KYB Verification</div>
        <h3>Business verification</h3>
        <p className="organizations-page__empty-copy">
          This organization has not submitted KYB documents yet.
        </p>
      </section>
    );
  }

  const canApproveSubmission = submission.status !== "approved";
  const canRejectSubmission = submission.status !== "rejected";
  const canRejectStaleSubmission = canRejectStaleKyb(submission);

  return (
    <section className="organizations-page__modal-card organizations-page__modal-card--wide">
      <div className="organizations-page__section-label">KYB Verification</div>
      <div className="organizations-page__kyb-header">
        <h3>Business verification</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {canKyb && canRejectStaleSubmission && (
            <button
              type="button"
              onClick={() => void rejectStaleSubmission()}
              disabled={submitting}
              style={{
                padding: "7px 12px",
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #fca5a5",
                background: "#fee2e2",
                color: "#991b1b",
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.6 : 1,
                fontWeight: 700,
              }}
            >
              {submitting ? "Rejecting..." : "Reject submission"}
            </button>
          )}
          <StatusPill label={kybStatusLabel(submission.status)} tone={kybStatusTone(submission.status)} />
        </div>
      </div>

      {submission.adminNote && (
        <div className="organizations-page__kyb-note">
          <i className="bi bi-chat-left-text" />
          <span>{submission.adminNote}</span>
        </div>
      )}

      {actionError && !action && (
        <div style={{ color: "#dc2626", fontSize: 13 }}>
          <i className="bi bi-exclamation-circle" style={{ marginRight: 5 }} />
          {actionError}
        </div>
      )}

      <div className="organizations-page__kyb-docs">
        <KybDocumentLink label="Business registration" file={submission.businessRegistrationFile} />
        <KybDocumentLink label="Representative ID" file={submission.representativeIdFile} />
        <KybDocumentLink label="Representative selfie" file={submission.representativeSelfieFile} />
      </div>

      {canKyb && !reviewing && !action && (
        <div className="organizations-page__kyb-actions">
          <button
            type="button"
            onClick={() => setReviewing(true)}
            style={{ padding: "5px 12px", fontSize: 12, borderRadius: 8, border: "1px solid #cbd5e1", background: "#f1f5f9", color: "#475569", cursor: "pointer", fontWeight: 600 }}
          >
            <i className="bi bi-pencil-square" style={{ marginRight: 5 }} />
            Review verification
          </button>
        </div>
      )}

      {canKyb && reviewing && !action && (
        <div className="organizations-page__kyb-actions">
          {canApproveSubmission && (
            <button
              type="button"
              onClick={() => { setAction("approve"); setNote(""); setActionError(null); }}
              style={{ padding: "5px 12px", fontSize: 12, borderRadius: 8, border: "1px solid #6ee7b7", background: "#d1fae5", color: "#065f46", cursor: "pointer", fontWeight: 600 }}
            >
              <i className="bi bi-check-circle" style={{ marginRight: 5 }} />
              Approve
            </button>
          )}
          {canRejectSubmission && (
            <button
              type="button"
              onClick={() => { setAction("reject"); setNote(""); setActionError(null); }}
              style={{ padding: "5px 12px", fontSize: 12, borderRadius: 8, border: "1px solid #fca5a5", background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontWeight: 600 }}
            >
              <i className="bi bi-x-circle" style={{ marginRight: 5 }} />
              Reject
            </button>
          )}
          <button
            type="button"
            onClick={() => setReviewing(false)}
            style={{ padding: "5px 12px", fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600 }}
          >
            Cancel
          </button>
        </div>
      )}

      {canKyb && action && (
        <div style={{ marginTop: 4, padding: "14px 16px", borderRadius: 12, border: `1px solid ${action === "approve" ? "#6ee7b7" : "#fecaca"}`, background: action === "approve" ? "#f0fdf4" : "#fff5f5", display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: action === "approve" ? "#065f46" : "#991b1b", marginBottom: 4 }}>
              {action === "approve" ? "Approve KYB submission" : "Reject KYB submission"}
            </div>
            <div style={{ fontSize: 13, color: action === "approve" ? "#064e3b" : "#7f1d1d", lineHeight: 1.5 }}>
              {action === "approve"
                ? "An optional note will be included in the email sent to the organization."
                : "A rejection reason is required and will be sent to the organization."}
            </div>
          </div>
          <textarea
            rows={3}
            maxLength={1000}
            placeholder={action === "approve" ? "Optional note for the organization…" : "Reason for rejection (required)…"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: "100%", borderRadius: 10, border: `1px solid ${action === "approve" ? "#6ee7b7" : "#fecaca"}`, padding: "10px 12px", fontSize: 13, resize: "vertical", outline: "none" }}
          />
          {actionError && (
            <div style={{ color: "#dc2626", fontSize: 13 }}>
              <i className="bi bi-exclamation-circle" style={{ marginRight: 5 }} />
              {actionError}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={() => { setAction(null); setReviewing(false); setNote(""); setActionError(null); }}
              disabled={submitting}
              style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || (action === "reject" && !note.trim())}
              style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${action === "approve" ? "#6ee7b7" : "#ef4444"}`, background: action === "approve" ? "#d1fae5" : "#fee2e2", color: action === "approve" ? "#065f46" : "#991b1b", cursor: (submitting || (action === "reject" && !note.trim())) ? "default" : "pointer", fontSize: 13, fontWeight: 600, opacity: (submitting || (action === "reject" && !note.trim())) ? 0.6 : 1 }}
            >
              {submitting ? "Saving…" : action === "approve" ? "Confirm approval" : "Confirm rejection"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function OrganizationDetailModal({
  organizationId,
  onClose,
  onKybReviewed,
  canBlockSuspend,
  canKyb,
}: {
  organizationId: string;
  onClose: () => void;
  onKybReviewed: (profileId: string, status: "approved" | "rejected") => void;
  canBlockSuspend: boolean;
  canKyb: boolean;
}) {
  const [organization, setOrganization] = useState<OrganizationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deactivationComposerOpen, setDeactivationComposerOpen] = useState(false);
  const [deactivationMessage, setDeactivationMessage] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    setDeactivationComposerOpen(false);
    setDeactivationMessage("");

    apiBackoffice
      .get<OrganizationProfile>(`/ojc/organizations/${organizationId}`)
      .then((response) => setOrganization(response.data))
      .catch(() => {
        setOrganization(null);
        setError("Failed to load organization details.");
      })
      .finally(() => setLoading(false));
  }, [organizationId]);

  async function updateAccountStatus(nextStatus: "ACTIVE" | "INACTIVE") {
    if (!organization) return;
    setStatusLoading(true);
    try {
      await apiBackoffice.patch(`/ojc/organizations/${organizationId}/account-status`, {
        status: nextStatus,
        message: deactivationMessage.trim() || undefined,
      });
      setOrganization((o) => o ? { ...o, accountStatus: nextStatus } : o);
      setDeactivationComposerOpen(false);
      setDeactivationMessage("");
    } catch {
      // leave UI as-is, user can retry
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <div className="organizations-page__modal-backdrop" onClick={onClose}>
      <div className="organizations-page__modal" onClick={(event) => event.stopPropagation()}>
        {loading ? (
          <div className="organizations-page__modal-loading">
            <div className="spinner-border" role="status" />
          </div>
        ) : error || !organization ? (
          <div className="organizations-page__modal-error">
            <h3>Organization details</h3>
            <p>{error ?? "Organization not found."}</p>
            <button type="button" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div className="organizations-page__modal-header">
              <div className="organizations-page__modal-identity">
                {organization.avatarUrl ? (
                  <img src={organization.avatarUrl} alt="" />
                ) : (
                  <div className="organizations-page__avatar organizations-page__avatar--large">
                    <i className="bi bi-building" />
                  </div>
                )}
                <div>
                  <div className="organizations-page__modal-title-row">
                    <h2>{organizationName(organization)}</h2>
                    {organization.organizationType ? (
                      <StatusPill label={organization.organizationType} tone="neutral" />
                    ) : null}
                    {organization.verificationStatus ? (
                      <StatusPill
                        label={organization.verificationStatus === "VERIFIED" ? "Verified" : organization.verificationStatus === "PENDING" ? "Pending verification" : "Declined"}
                        tone={statusTone(organization.verificationStatus)}
                      />
                    ) : null}
                  </div>
                  <p>@{organization.username}</p>
                  <div className="organizations-page__modal-meta">
                    <span>{locationLabel(organization.city, organization.country)}</span>
                    <span>Joined {formatDate(organization.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="organizations-page__modal-actions">
                <a
                  href={`${JUSTCAUSES_URL}/profile/${organization.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="bi bi-box-arrow-up-right" />
                  Open public profile
                </a>
                {canBlockSuspend && (
                  organization.accountStatus === "ACTIVE" ? (
                    <button
                      type="button"
                      onClick={() => { setDeactivationComposerOpen(true); }}
                      disabled={statusLoading}
                      style={{ padding: "5px 12px", fontSize: 12, borderRadius: 8, border: "1px solid #fca5a5", background: "#fee2e2", color: "#991b1b", cursor: statusLoading ? "default" : "pointer", opacity: statusLoading ? 0.6 : 1, fontWeight: 600 }}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void updateAccountStatus("ACTIVE")}
                      disabled={statusLoading}
                      style={{ padding: "5px 12px", fontSize: 12, borderRadius: 8, border: "1px solid #6ee7b7", background: "#d1fae5", color: "#065f46", cursor: statusLoading ? "default" : "pointer", opacity: statusLoading ? 0.6 : 1, fontWeight: 600 }}
                    >
                      {statusLoading ? "Activating…" : "Activate"}
                    </button>
                  )
                )}
                <button type="button" className="organizations-page__icon-button" onClick={onClose} aria-label="Close modal">
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            </div>

            {canBlockSuspend && deactivationComposerOpen && (
              <div style={{ margin: "16px 0 0", padding: "14px 16px", borderRadius: 12, border: "1px solid #fecaca", background: "#fff5f5", display: "grid", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 4 }}>Deactivate account</div>
                  <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.5 }}>
                    Add an optional note for the deactivation email. Leave empty to send the standard message.
                  </div>
                </div>
                <textarea
                  value={deactivationMessage}
                  onChange={(e) => setDeactivationMessage(e.target.value)}
                  rows={3}
                  placeholder="Optional message from the team"
                  style={{ width: "100%", borderRadius: 10, border: "1px solid #fecaca", padding: "10px 12px", fontSize: 13, resize: "vertical", outline: "none" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => { setDeactivationComposerOpen(false); setDeactivationMessage(""); }}
                    style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateAccountStatus("INACTIVE")}
                    disabled={statusLoading}
                    style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #ef4444", background: "#fee2e2", color: "#991b1b", cursor: statusLoading ? "default" : "pointer", fontSize: 13, fontWeight: 600, opacity: statusLoading ? 0.6 : 1 }}
                  >
                    {statusLoading ? "Deactivating…" : "Confirm deactivation"}
                  </button>
                </div>
              </div>
            )}

            <div className="organizations-page__modal-grid">
              <section className="organizations-page__modal-card organizations-page__modal-card--wide">
                <div className="organizations-page__section-label">About</div>
                <h3>Organization profile</h3>
                <p>{organization.bio?.trim() || "No organization summary provided."}</p>
              </section>

              <section className="organizations-page__modal-card">
                <div className="organizations-page__section-label">Details</div>
                <h3>Organization details</h3>
                <dl className="organizations-page__definition-list">
                  <div>
                    <dt>Legal name</dt>
                    <dd>{organization.legalName?.trim() || "-"}</dd>
                  </div>
                  <div>
                    <dt>Representative role</dt>
                    <dd>{organization.role?.trim() || "-"}</dd>
                  </div>
                  <div>
                    <dt>Tax ID</dt>
                    <dd>{organization.taxId?.trim() || "-"}</dd>
                  </div>
                  <div>
                    <dt>Account status</dt>
                    <dd>{organization.accountStatus ?? "-"}</dd>
                  </div>
                </dl>
              </section>

              <section className="organizations-page__modal-card">
                <div className="organizations-page__section-label">Reach</div>
                <h3>Public footprint</h3>
                <dl className="organizations-page__definition-list">
                  <div>
                    <dt>Campaigns</dt>
                    <dd>{organization.campaignCount}</dd>
                  </div>
                  <div>
                    <dt>Active campaigns</dt>
                    <dd>{organization.activeCampaigns}</dd>
                  </div>
                  <div>
                    <dt>Total raised</dt>
                    <dd>{formatMoney(organization.totalRaised)}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{organization.email ?? "-"}</dd>
                  </div>
                </dl>
              </section>

              <section className="organizations-page__modal-card">
                <div className="organizations-page__section-label">Links</div>
                <h3>Website and social links</h3>
                <div className="organizations-page__links">
                  {organization.website ? (
                    <a href={organization.website} target="_blank" rel="noopener noreferrer">
                      <i className="bi bi-globe2" />
                      {formatUrlLabel(organization.website)}
                    </a>
                  ) : (
                    <span className="organizations-page__empty-inline">No website provided.</span>
                  )}

                  {organization.socialLinks.map((link) => (
                    <a key={link} href={link} target="_blank" rel="noopener noreferrer">
                      <i className="bi bi-link-45deg" />
                      {formatUrlLabel(link)}
                    </a>
                  ))}
                </div>
              </section>

              <KybSection
                profileId={organizationId}
                onReviewed={(status) => onKybReviewed(organizationId, status)}
                canKyb={canKyb}
              />

              <section className="organizations-page__modal-card organizations-page__modal-card--wide">
                <div className="organizations-page__section-label">Campaigns</div>
                <h3>Recent campaigns</h3>
                {organization.campaigns.length === 0 ? (
                  <p className="organizations-page__empty-copy">No campaigns found for this organization yet.</p>
                ) : (
                  <div className="organizations-page__campaign-list">
                    {organization.campaigns.map((campaign) => (
                      <article key={campaign.campaignId} className="organizations-page__campaign-item">
                        <div>
                          <strong>{campaign.title}</strong>
                          <span>{formatDate(campaign.createdAt)}</span>
                        </div>
                        <div>
                          <span className="organizations-page__campaign-status">{campaign.status}</span>
                          <span>{formatMoney(campaign.amountRaised)} / {formatMoney(campaign.goalAmount)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function OrganizationsPage() {
  const canBlockSuspend = usePermission("block_suspend");
  const canKyb = usePermission("view_kyb");
  const [searchParams, setSearchParams] = useSearchParams();
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [organizationType, setOrganizationType] = useState(searchParams.get("type") || "");
  const [accountStatus, setAccountStatus] = useState(searchParams.get("status") || "");
  const [order, setOrder] = useState<"asc" | "desc">((searchParams.get("order") as "asc" | "desc") || "desc");
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1));
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleKybReviewed(profileId: string, status: "approved" | "rejected") {
    const next: VerificationStatus = status === "approved" ? "VERIFIED" : "DECLINED";
    setOrganizations((prev) =>
      prev.map((org) => org.profileId === profileId ? { ...org, verificationStatus: next } : org),
    );
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (organizationType) params.set("type", organizationType);
    if (accountStatus) params.set("status", accountStatus);
    if (order !== "desc") params.set("order", order);
    if (page > 1) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [searchTerm, organizationType, accountStatus, order, page, setSearchParams]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    apiBackoffice
      .get<OrganizationsResponse>("/ojc/organizations", {
        params: {
          search: searchTerm || undefined,
          organizationType: organizationType || undefined,
          accountStatus: accountStatus || undefined,
          order,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((response) => {
        setOrganizations(response.data.organizations);
        setTotal(response.data.total);
      })
      .catch(() => {
        setOrganizations([]);
        setTotal(0);
        setError("Failed to load organizations.");
      })
      .finally(() => setLoading(false));
  }, [organizationType, accountStatus, order, page, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  useClampPageToTotal({ page, totalPages, setPage, disabled: loading });

  const snapshot = useMemo(() => {
    return organizations.reduce(
      (acc, organization) => {
        acc.activeCampaigns += organization.activeCampaigns;
        acc.totalRaised += organization.totalRaised;
        if (organization.verificationStatus === "VERIFIED") acc.verified += 1;
        return acc;
      },
      { verified: 0, activeCampaigns: 0, totalRaised: 0 },
    );
  }, [organizations]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchTerm(value.trim());
      setPage(1);
    }, 300);
  }

  return (
    <>
      <div className="admin-page-header">
        <h1>Organizations</h1>
        <p>
          Review organization profiles exactly as they are represented in OnlyJustCauses, including identity, public profile details, and campaign footprint.
        </p>
      </div>

      <section className="organizations-page__snapshot">
        <article>
          <span>Total organizations</span>
          <strong>{total}</strong>
          <small>Matching the current filters</small>
        </article>
        <article>
          <span>Verified on this page</span>
          <strong>{snapshot.verified}</strong>
          <small>Latest verification status</small>
        </article>
        <article>
          <span>Active campaigns</span>
          <strong>{snapshot.activeCampaigns}</strong>
          <small>Across the visible organizations</small>
        </article>
        <article>
          <span>Raised on this page</span>
          <strong>{formatMoney(snapshot.totalRaised)}</strong>
          <small>Current visible total</small>
        </article>
      </section>

      <section className="organizations-page__toolbar">
        <div className="organizations-page__search">
          <i className="bi bi-search" />
          <input
            type="text"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search legal name, username, email, website or tax ID"
          />
        </div>

        <select
          value={organizationType}
          onChange={(event) => {
            setOrganizationType(event.target.value);
            setPage(1);
          }}
        >
          {ORGANIZATION_TYPE_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={accountStatus}
          onChange={(event) => {
            setAccountStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All account statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        <select
          value={order}
          onChange={(event) => {
            setOrder(event.target.value as "asc" | "desc");
            setPage(1);
          }}
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </section>

      {error ? <div className="organizations-page__error">{error}</div> : null}

      <section className="organizations-page__grid">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <article key={index} className="organizations-page__card organizations-page__card--skeleton">
              <div />
            </article>
          ))
        ) : organizations.length === 0 ? (
          <div className="organizations-page__empty">
            <i className="bi bi-building" />
            <h3>No organizations found</h3>
            <p>Try adjusting the search term or removing the organization type filter.</p>
          </div>
        ) : (
          organizations.map((organization) => (
            <article key={organization.profileId} className="organizations-page__card">
              <div className="organizations-page__card-header">
                <div className="organizations-page__identity">
                  {organization.avatarUrl ? (
                    <img src={organization.avatarUrl} alt="" className="organizations-page__avatar-image" />
                  ) : (
                    <div className="organizations-page__avatar">
                      <i className="bi bi-building" />
                    </div>
                  )}
                  <div>
                    <h2>{organizationName(organization)}</h2>
                    <p>@{organization.username}</p>
                  </div>
                </div>

                <div className="organizations-page__badges">
                  {organization.organizationType ? (
                    <StatusPill label={organization.organizationType} tone="neutral" />
                  ) : null}
                  {organization.accountStatus ? (
                    <StatusPill
                      label={organization.accountStatus === "ACTIVE" ? "Active" : organization.accountStatus === "INACTIVE" ? "Inactive" : "Suspended"}
                      tone={statusTone(organization.accountStatus)}
                    />
                  ) : null}
                  {organization.verificationStatus ? (
                    <StatusPill
                      label={organization.verificationStatus === "VERIFIED" ? "Verified" : organization.verificationStatus === "PENDING" ? "Pending" : "Declined"}
                      tone={statusTone(organization.verificationStatus)}
                    />
                  ) : null}
                </div>
              </div>

              <p className="organizations-page__bio" style={{ marginTop: "auto" }}>
                {organization.bio?.trim() || "No organization summary provided."}
              </p>

              <div className="organizations-page__meta">
                <span>
                  <i className="bi bi-geo-alt" />
                  {locationLabel(organization.city, organization.country)}
                </span>
                <span>
                  <i className="bi bi-person-badge" />
                  {organization.role?.trim() || "Representative role not provided"}
                </span>
                <span>
                  <i className="bi bi-globe2" />
                  {organization.website ? formatUrlLabel(organization.website) : "No website"}
                </span>
              </div>

              <div className="organizations-page__stats">
                <div>
                  <strong>{organization.campaignCount}</strong>
                  <span>Campaigns</span>
                </div>
                <div>
                  <strong>{organization.activeCampaigns}</strong>
                  <span>Active</span>
                </div>
                <div>
                  <strong>{formatMoney(organization.totalRaised)}</strong>
                  <span>Raised</span>
                </div>
              </div>

              <div className="organizations-page__card-footer">
                <div>
                  <span className="organizations-page__footer-label">Joined</span>
                  <strong>{formatDate(organization.createdAt)}</strong>
                </div>
                <button type="button" onClick={() => setSelectedOrganizationId(organization.profileId)}>
                  View organization
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      {!loading && total > PAGE_SIZE ? (
        <div className="organizations-page__pagination">
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
            Next
          </button>
        </div>
      ) : null}

      {selectedOrganizationId ? (
        <OrganizationDetailModal
          organizationId={selectedOrganizationId}
          onClose={() => setSelectedOrganizationId(null)}
          onKybReviewed={handleKybReviewed}
          canBlockSuspend={canBlockSuspend}
          canKyb={canKyb}
        />
      ) : null}
    </>
  );
}
