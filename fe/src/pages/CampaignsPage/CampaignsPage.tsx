import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiBackoffice } from "@/shared/lib/axios";
import { usePermission } from "@/shared/hooks/usePermission";
import { useClampPageToTotal } from "@/shared/hooks/useClampPageToTotal";

type CampaignStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "FINISHED" | "REJECTED" | "REVIEWING";
type VerificationStatus = "PENDING" | "VERIFIED" | "DECLINED";
type CampaignApprovalState =
  | "none"
  | "pending_initial_approval"
  | "changes_requested_initial_approval"
  | "pending_new_version_approval"
  | "changes_requested_new_version";

interface CampaignWorkflowSummary {
  approvalState: CampaignApprovalState;
  openThreadId: string | null;
  openSubmissionNumber: number | null;
  lastAdminMessage: string | null;
}

const VERIFICATION_CONFIG: Record<VerificationStatus, { label: string; bg: string; color: string }> = {
  VERIFIED: { label: "Verified",  bg: "#f0fdf4", color: "#15803d" },
  PENDING:  { label: "Pending",   bg: "#eff6ff", color: "#1d4ed8" },
  DECLINED: { label: "Declined",  bg: "#fff1f2", color: "#be123c" },
};

interface AdminCampaignDetail {
  campaignId: string;
  title: string;
  description: string;
  category: string;
  country: string;
  city: string;
  status: CampaignStatus;
  goalAmount: number;
  amountRaised: number;
  donorCount: number;
  viewsCount: number;
  sharesCount: number;
  durationDays: number | null;
  creatorUsername: string;
  creatorFirstName: string;
  creatorLastName: string;
  creatorVerificationStatus: VerificationStatus | null;
  thumbnailUrl: string | null;
  reviewMessage: string | null;
  createdAt: string;
  publishedAt: string | null;
  workflow: CampaignWorkflowSummary | null;
}

interface AdminCampaign {
  campaignId: string;
  title: string;
  category: string;
  country: string;
  status: CampaignStatus;
  goalAmount: number;
  amountRaised: number;
  donorCount: number;
  viewsCount: number;
  creatorUsername: string;
  creatorFirstName: string;
  creatorLastName: string;
  creatorVerificationStatus: VerificationStatus | null;
  thumbnailUrl: string | null;
  reviewMessage: string | null;
  createdAt: string;
  publishedAt: string | null;
  workflow: CampaignWorkflowSummary | null;
}

interface CampaignsPage {
  campaigns: AdminCampaign[];
  total: number;
}

interface CampaignCategoryOption {
  categoryId: string;
  name: string;
  isActive: boolean;
}

import { JUSTCAUSES_URL } from "@/shared/config/env";

const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<CampaignStatus, { label: string; bg: string; color: string }> = {
  PENDING:   { label: "Pending Review",    bg: "#eff6ff", color: "#1d4ed8" },
  REVIEWING: { label: "Changes Requested", bg: "#fff7ed", color: "#c2410c" },
  ACTIVE:    { label: "Active",            bg: "#f0fdf4", color: "#15803d" },
  INACTIVE:  { label: "Inactive",          bg: "#fef3c7", color: "#92400e" },
  FINISHED:  { label: "Finished",          bg: "#f1f5f9", color: "#475569" },
  REJECTED:  { label: "Rejected",          bg: "#fff1f2", color: "#be123c" },
};

const WORKFLOW_STATUS_CONFIG: Record<Exclude<CampaignApprovalState, "none">, { label: string; bg: string; color: string }> = {
  pending_initial_approval: { label: "Pending Review", bg: "#eff6ff", color: "#1d4ed8" },
  changes_requested_initial_approval: { label: "Changes Requested", bg: "#fff7ed", color: "#c2410c" },
  pending_new_version_approval: { label: "Update Pending Review", bg: "#eef2ff", color: "#4338ca" },
  changes_requested_new_version: { label: "Update Needs Changes", bg: "#fff7ed", color: "#c2410c" },
};

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "",          label: "All statuses"      },
  { value: "PENDING",   label: "Pending Review"    },
  { value: "REVIEWING", label: "Changes Requested" },
  { value: "ACTIVE",    label: "Active"            },
  { value: "INACTIVE",  label: "Inactive"          },
  { value: "FINISHED",  label: "Finished"          },
  { value: "REJECTED",  label: "Rejected"          },
];

function ProgressBar({ raised, goal }: { raised: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#0047AB", borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getDisplayedStatus(campaign: Pick<AdminCampaign, "status" | "workflow">) {
  if (campaign.workflow && campaign.workflow.approvalState !== "none") {
    return WORKFLOW_STATUS_CONFIG[campaign.workflow.approvalState];
  }
  return STATUS_CONFIG[campaign.status];
}

function CampaignPreviewModal({
  campaignId,
  updatingId,
  onClose,
  onStatusChange,
}: {
  campaignId: string;
  updatingId: string | null;
  onClose: () => void;
  onStatusChange: (campaign: AdminCampaign, status: CampaignStatus, message?: string) => Promise<void>;
}) {
  const canApproveReject = usePermission("approve_reject");
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AdminCampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [requestChangesMsg, setRequestChangesMsg] = useState("");

  useEffect(() => {
    apiBackoffice
      .get<AdminCampaignDetail>(`/ojc/campaigns/${campaignId}`)
      .then((r) => setDetail(r.data))
      .finally(() => setLoading(false));
  }, [campaignId]);

  async function handleAction(status: CampaignStatus, message?: string) {
    if (!detail) return;
    setActionError(null);
    try {
      await onStatusChange(detail as unknown as AdminCampaign, status, message);
      onClose();
    } catch (error: any) {
      setActionError(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update the campaign status.",
      );
    }
  }

  const cfg = detail ? getDisplayedStatus(detail) : null;
  const pct = detail && detail.goalAmount > 0 ? Math.min(100, (detail.amountRaised / detail.goalAmount) * 100) : 0;
  const isUpdating = updatingId === campaignId;
  const workflowState = detail?.workflow?.approvalState ?? "none";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !detail ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240 }}>
            <div className="spinner-border" role="status" style={{ width: "1.8rem", height: "1.8rem", color: "#0047AB" }} />
          </div>
        ) : (
          <>
            {/* Thumbnail */}
            {detail.thumbnailUrl ? (
              <img src={detail.thumbnailUrl} alt="" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: "16px 16px 0 0", display: "block" }} />
            ) : (
              <div style={{ width: "100%", height: 200, background: "#f1f5f9", borderRadius: "16px 16px 0 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-image" style={{ fontSize: 48, color: "#cbd5e1" }} />
              </div>
            )}

            <div style={{ padding: "20px 24px 24px" }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{detail.title}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: cfg!.bg, color: cfg!.color }}>{cfg!.label}</span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{detail.category}</span>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>·</span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{[detail.city, detail.country].filter(Boolean).join(", ")}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <a
                    href={`${JUSTCAUSES_URL}/campaign/${detail.campaignId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in JustCauses"
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#0047AB", textDecoration: "none", padding: "4px 10px", border: "1px solid #bfdbfe", borderRadius: 8, background: "#eff6ff" }}
                  >
                    <i className="bi bi-box-arrow-up-right" style={{ fontSize: 11 }} /> Open
                  </a>
                  <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, padding: 4, lineHeight: 1 }}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>

              {/* Creator */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "10px 12px", background: "#f8fafc", borderRadius: 8 }}>
                <i className="bi bi-person-circle" style={{ fontSize: 18, color: "#94a3b8" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{detail.creatorFirstName} {detail.creatorLastName}</span>
                    {detail.creatorVerificationStatus && (() => {
                      const vcfg = VERIFICATION_CONFIG[detail.creatorVerificationStatus];
                      return (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 20, background: vcfg.bg, color: vcfg.color }}>
                          {vcfg.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>@{detail.creatorUsername}</div>
                </div>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 6 }}>
                  <span><strong style={{ color: "#0f172a" }}>${detail.amountRaised.toLocaleString()}</strong> raised of ${detail.goalAmount.toLocaleString()}</span>
                  <span>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "#0047AB", borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", gap: 20, marginTop: 8, fontSize: 12, color: "#64748b" }}>
                  <span><i className="bi bi-people" style={{ marginRight: 4 }} />{detail.donorCount} donors</span>
                  <span><i className="bi bi-eye" style={{ marginRight: 4 }} />{detail.viewsCount.toLocaleString()} views</span>
                  <span><i className="bi bi-share" style={{ marginRight: 4 }} />{detail.sharesCount.toLocaleString()} shares</span>
                  {detail.durationDays && <span><i className="bi bi-clock" style={{ marginRight: 4 }} />{detail.durationDays}d duration</span>}
                </div>
              </div>

              {/* Review message */}
              {((workflowState === "changes_requested_initial_approval" || workflowState === "changes_requested_new_version") ||
                ((detail.status === "REVIEWING" || detail.status === "REJECTED") && detail.reviewMessage)) && (detail.workflow?.lastAdminMessage || detail.reviewMessage) && (
                <div style={{ marginBottom: 16, padding: "10px 12px", background: detail.status === "REJECTED" ? "#fff1f2" : "#fff7ed", borderRadius: 8, border: `1px solid ${detail.status === "REJECTED" ? "#fca5a5" : "#fdba74"}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: detail.status === "REJECTED" ? "#be123c" : "#c2410c", marginBottom: 4 }}>
                    {detail.status === "REJECTED" ? "Rejection reason" : "Latest moderation note"}
                  </div>
                  <div style={{ fontSize: 13, color: "#475569" }}>{detail.workflow?.lastAdminMessage || detail.reviewMessage}</div>
                </div>
              )}

              {/* Description */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Description</div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{detail.description}</div>
              </div>

              {/* Dates */}
              <div style={{ display: "flex", gap: 20, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8" }}>
                <span>Submitted {formatDate(detail.createdAt)}</span>
                {detail.publishedAt && <span>Published {formatDate(detail.publishedAt)}</span>}
              </div>

              {/* Actions footer */}
              {canApproveReject && (detail.status === "PENDING" || detail.status === "REVIEWING" || detail.status === "ACTIVE" || detail.status === "INACTIVE") && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
                  {actionError && (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "1px solid #fecaca",
                        background: "#fff5f5",
                        color: "#b91c1c",
                        fontSize: 13,
                        lineHeight: 1.55,
                      }}
                    >
                      {actionError}
                    </div>
                  )}
                  {isUpdating ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 13 }}>
                      <span className="spinner-border spinner-border-sm" role="status" style={{ width: "1rem", height: "1rem", color: "#0047AB" }} />
                      Saving…
                    </div>
                  ) : detail.workflow?.approvalState && detail.workflow.approvalState !== "none" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: 10,
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          color: "#475569",
                          fontSize: 13,
                          lineHeight: 1.55,
                        }}
                      >
                        {detail.workflow.approvalState === "changes_requested_initial_approval"
                          ? "Changes were requested on this initial approval. Wait for the creator to resubmit from the app, then continue the review in Campaign Revisions."
                          : detail.workflow.approvalState === "changes_requested_new_version"
                            ? "Changes were requested on this live update. The live campaign stays public until the creator submits a revised version."
                            : "This campaign is currently in the revision workflow. Continue the review from Campaign Revisions."}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => {
                            navigate(`/ojc/campaign-revisions?campaignId=${detail.campaignId}`);
                            onClose();
                          }}
                          style={{ fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 8, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", cursor: "pointer" }}
                        >
                          Open Campaign Revisions
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {/* Reactivate: INACTIVE */}
                        {detail.status === "INACTIVE" && (
                          <button
                            onClick={() => handleAction("ACTIVE")}
                            style={{ fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 8, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#15803d", cursor: "pointer" }}
                          >
                            Reactivate
                          </button>
                        )}
                        {/* Deactivate: ACTIVE */}
                        {detail.status === "ACTIVE" && (
                          <button
                            onClick={() => handleAction("INACTIVE")}
                            style={{ fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 8, border: "1px solid #fde68a", background: "#fef3c7", color: "#92400e", cursor: "pointer" }}
                          >
                            Deactivate
                          </button>
                        )}
                        {/* Finish: ACTIVE or INACTIVE */}
                        {(detail.status === "ACTIVE" || detail.status === "INACTIVE") && (
                          <button
                            onClick={() => handleAction("FINISHED")}
                            style={{ fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f1f5f9", color: "#475569", cursor: "pointer" }}
                          >
                            Finish
                          </button>
                        )}
                        {/* Request Changes: ACTIVE only */}
                        {detail.status === "ACTIVE" && (
                          <button
                            onClick={() => { setShowRequestChanges((v) => !v); setRequestChangesMsg(""); setActionError(null); }}
                            style={{ fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 8, border: "1px solid #fdba74", background: "#fff7ed", color: "#c2410c", cursor: "pointer" }}
                          >
                            Request Changes
                          </button>
                        )}
                        {/* Campaign Revisions */}
                        <button
                          onClick={() => {
                            navigate(`/ojc/campaign-revisions?campaignId=${detail.campaignId}`);
                            onClose();
                          }}
                          style={{ fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 8, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", cursor: "pointer" }}
                        >
                          Campaign Revisions
                        </button>
                      </div>
                      {/* Inline request-changes form */}
                      {showRequestChanges && (
                        <div style={{ padding: "14px", background: "#fff7ed", borderRadius: 10, border: "1px solid #fdba74", display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#c2410c" }}>Request Changes — message to creator</div>
                          <textarea
                            value={requestChangesMsg}
                            onChange={(e) => setRequestChangesMsg(e.target.value)}
                            placeholder="Describe what needs to be changed…"
                            rows={3}
                            style={{ width: "100%", resize: "vertical", padding: "8px 10px", fontSize: 13, borderRadius: 8, border: "1px solid #fdba74", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              disabled={!requestChangesMsg.trim()}
                              onClick={() => handleAction("REVIEWING", requestChangesMsg.trim())}
                              style={{ fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 8, border: "1px solid #fdba74", background: "#c2410c", color: "#fff", cursor: requestChangesMsg.trim() ? "pointer" : "default", opacity: requestChangesMsg.trim() ? 1 : 0.5 }}
                            >
                              Confirm Request
                            </button>
                            <button
                              onClick={() => { setShowRequestChanges(false); setRequestChangesMsg(""); }}
                              style={{ fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f1f5f9", color: "#475569", cursor: "pointer" }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<CampaignsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1));
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "");
  const [categoryOptions, setCategoryOptions] = useState<CampaignCategoryOption[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [inputValue, setInputValue] = useState(searchParams.get("search") || "");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(() => searchParams.get("highlight"));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (search.trim()) params.set("search", search.trim());
    if (page > 1) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [statusFilter, categoryFilter, search, page, setSearchParams]);

  useEffect(() => {
    apiBackoffice
      .get<{ categories: CampaignCategoryOption[] }>("/ojc/categories")
      .then((response) => {
        const categories = response.data.categories ?? [];
        setCategoryOptions(categories);
      })
      .catch(() => setCategoryOptions([]));
  }, []);

  function fetchData() {
    setLoading(true);
    apiBackoffice
      .get<CampaignsPage>("/ojc/campaigns", {
        params: {
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          search: search || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  useEffect(fetchData, [statusFilter, categoryFilter, search, page]);

  function handleSearchChange(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(value); setPage(1); }, 400);
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleCategoryFilterChange(value: string) {
    setCategoryFilter(value);
    setPage(1);
  }

  async function handleStatusChange(campaign: AdminCampaign, newStatus: CampaignStatus, message?: string) {
    setUpdatingId(campaign.campaignId);
    try {
      await apiBackoffice.patch(`/ojc/campaigns/${campaign.campaignId}/status`, {
        status: newStatus,
        ...(message ? { reviewMessage: message } : {}),
      });
      fetchData();
    } catch (error) {
      throw error;
    } finally {
      setUpdatingId(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  useClampPageToTotal({ page, totalPages, setPage, disabled: loading || !data });

  return (
    <>
      <div className="admin-page-header">
        <h1>Campaigns</h1>
        <p>
          {statusFilter === "PENDING"
            ? "Campaigns submitted by creators awaiting review. Approval decisions are handled from Campaign Revisions."
            : statusFilter === "REVIEWING"
            ? "Campaigns with changes requested awaiting creator resubmission. Review actions are handled from Campaign Revisions."
            : "All platform fundraising campaigns."}
        </p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", minWidth: "max-content" }}>
        {/* Toolbar */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 320, minWidth: 200 }}>
            <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14 }} />
            <input
              type="text"
              placeholder="Search title or creator…"
              value={inputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none" }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff" }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryFilterChange(e.target.value)}
            style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff", maxWidth: 220 }}
            aria-label="Filter campaigns by category"
          >
            <option value="">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category.categoryId} value={category.name}>
                {category.name}{category.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </select>
          {data && (
            <span style={{ fontSize: 13, color: "#64748b", flexShrink: 0 }}>
              {statusFilter === "PENDING"
                ? `${data.total} pending review`
                : `${data.total.toLocaleString()} campaigns`}
            </span>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
            <div className="spinner-border" role="status" style={{ width: "1.8rem", height: "1.8rem", color: "#0047AB" }} />
          </div>
        ) : !data || data.campaigns.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8", fontSize: 14 }}>
            {statusFilter === "PENDING" ? "No campaigns pending review." : "No campaigns found."}
          </div>
        ) : (
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  {["Campaign", "Creator", "Category", "Progress", "Donations", "Submitted", "Status"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c) => {
                  const statusCfg = getDisplayedStatus(c);
                  const workflowState = c.workflow?.approvalState ?? "none";
                  const moderationNote = c.workflow?.lastAdminMessage || c.reviewMessage;

                  return (
                    <tr key={c.campaignId} style={{ borderBottom: "1px solid #f8fafc", cursor: "pointer" }} onClick={() => setPreviewId(c.campaignId)}>
                      {/* Campaign */}
                      <td style={{ padding: "12px 16px", maxWidth: 280, width: 280 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          {c.thumbnailUrl ? (
                            <img src={c.thumbnailUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: 6, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <i className="bi bi-image" style={{ color: "#94a3b8" }} />
                            </div>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 500, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                            <div style={{ color: "#94a3b8", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.country}</div>
                          </div>
                        </div>
                      </td>

                      {/* Creator */}
                      <td style={{ padding: "12px 16px", color: "#475569", maxWidth: 180, width: 180 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.creatorFirstName} {c.creatorLastName}</div>
                        <div style={{ color: "#94a3b8", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{c.creatorUsername}</div>
                        {c.creatorVerificationStatus && (() => {
                          const vcfg = VERIFICATION_CONFIG[c.creatorVerificationStatus];
                          return (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 20, background: vcfg.bg, color: vcfg.color, marginTop: 3, display: "inline-block" }}>
                              {vcfg.label}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Category */}
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>{c.category}</td>

                      {/* Progress */}
                      <td style={{ padding: "12px 16px", minWidth: 160 }}>
                        <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
                          ${c.amountRaised.toLocaleString()} / ${c.goalAmount.toLocaleString()}
                        </div>
                        <ProgressBar raised={c.amountRaised} goal={c.goalAmount} />
                      </td>

                      {/* Donations */}
                      <td style={{ padding: "12px 16px", color: "#475569", fontSize: 12, whiteSpace: "nowrap" }}>
                        <i className="bi bi-cash" style={{ color: "#94a3b8", marginRight: 4 }} />
                        {c.donorCount.toLocaleString()}
                      </td>

                      {/* Submitted */}
                      <td style={{ padding: "12px 16px", color: "#64748b", whiteSpace: "nowrap", fontSize: 12 }}>
                        {formatDate(c.createdAt)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 16px", maxWidth: 200, width: 200 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: statusCfg.bg, color: statusCfg.color, whiteSpace: "nowrap" }}>
                          {statusCfg.label}
                        </span>
                        {((workflowState === "changes_requested_initial_approval" || workflowState === "changes_requested_new_version") ||
                          (c.status === "REVIEWING" || c.status === "REJECTED")) && moderationNote && (
                          <div
                            style={{ marginTop: 5, fontSize: 11, color: "#64748b", lineHeight: 1.4, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            title={moderationNote}
                          >
                            "{moderationNote}"
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && data && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>Page {page} of {totalPages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: "5px 14px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>← Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ padding: "5px 14px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {previewId && (
        <CampaignPreviewModal
          campaignId={previewId}
          updatingId={updatingId}
          onClose={() => setPreviewId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}
