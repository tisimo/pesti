import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { apiBackoffice } from "@/shared/lib/axios";
import { usePermission } from "@/shared/hooks/usePermission";
import { useClampPageToTotal } from "@/shared/hooks/useClampPageToTotal";
import "./usersPage.css";

interface AdminUser {
  profileId: string;
  accountId: string;
  firstName: string;
  lastName: string;
  username: string;
  country: string;
  city: string;
  userType: "DONOR" | "CREATOR";
  verificationStatus: "PENDING" | "VERIFIED" | "DECLINED" | null;
  avatarUrl: string | null;
  createdAt: string;
  email: string | null;
  role: string | null;
  accountStatus: string | null;
  strikeCount: number;
  completedDonationCount: number;
}

interface KycInfo {
  verificationId: string;
  status: "PENDING" | "VERIFIED" | "DECLINED";
  veriffSessionId: string | null;
  verifiedAt: string | null;
  submittedAt: string;
  updatedAt: string;
}

interface UserCampaign {
  campaignId: string;
  title: string;
  status: string;
  amountRaised: number;
  goalAmount: number;
  createdAt: string;
}

interface UserDonation {
  donationId: string;
  campaignId: string;
  campaignTitle: string | null;
  amount: number;
  status: string;
  isAnonymous: boolean;
  createdAt: string;
}

interface UserProfile extends AdminUser {
  bio: string | null;
  causes: string | null;
  kyc: KycInfo | null;
  campaigns: UserCampaign[];
  donations: UserDonation[];
}

interface UsersPageData {
  users: AdminUser[];
  total: number;
}

type StrikeOperation = "ADD_ONE" | "REMOVE_ONE" | "CLEAR_ALL";
type KycStatusFilter = "" | "PENDING" | "VERIFIED" | "DECLINED" | "NONE";
type UserMutationUpdates = {
  accountStatus?: string;
  strikeCount?: number;
};

type StrikeUpdateResponse = {
  ok: boolean;
  strikeCount?: number;
  accountStatus?: string;
};

import { JUSTCAUSES_URL } from "@/shared/config/env";

const PAGE_SIZE = 20;

const USER_TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  DONOR:   { label: "Donor",   bg: "#eff4ff", color: "#0047AB" },
  CREATOR: { label: "Creator", bg: "#f0fdf4", color: "#15803d" },
};

const ACCOUNT_STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE:   { label: "Active",   bg: "#f0fdf4", color: "#15803d" },
  INACTIVE: { label: "Inactive", bg: "#fff1f2", color: "#be123c" },
  SUSPENDED: { label: "Suspended", bg: "#fff7ed", color: "#c2410c" },
};

const KYC_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:  { label: "Pending",  bg: "#fff7ed", color: "#c2410c" },
  VERIFIED: { label: "Verified", bg: "#f0fdf4", color: "#15803d" },
  DECLINED: { label: "Declined", bg: "#fff1f2", color: "#be123c" },
};

const CAMPAIGN_STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE:    { label: "Active",    bg: "#f0fdf4", color: "#15803d" },
  INACTIVE:  { label: "Inactive",  bg: "#f8fafc", color: "#64748b" },
  PENDING:   { label: "Pending",   bg: "#fff7ed", color: "#c2410c" },
  REVIEWING: { label: "Reviewing", bg: "#eff4ff", color: "#0047AB" },
  FINISHED:  { label: "Finished",  bg: "#f8fafc", color: "#64748b" },
  REJECTED:  { label: "Rejected",  bg: "#fff1f2", color: "#be123c" },
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, marginTop: 20 }}>
      {title}
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px 16px", fontSize: 13, color: "#475569" }}>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span style={{ fontWeight: 600, color: "#0f172a" }}>{label}: </span>
      <span>{value ?? "—"}</span>
    </div>
  );
}

function StatusBadge({ map, value }: { map: Record<string, { label: string; bg: string; color: string }>; value: string }) {
  const cfg = map[value];
  if (!cfg) return <span>{value}</span>;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function StrikeBadge({ count }: { count: number | null | undefined }) {
  const value = Number(count ?? 0);
  const cfg =
    value >= 3
      ? { bg: "#fff1f2", color: "#be123c", border: "#fecdd3" }
      : value > 0
        ? { bg: "#fff7ed", color: "#c2410c", border: "#fdba74" }
        : { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 40,
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 20,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {value} / 3
    </span>
  );
}

function UserDetailModal({
  profileId,
  onClose,
  canBlockSuspend,
  onUserChanged,
}: {
  profileId: string;
  onClose: () => void;
  canBlockSuspend: boolean;
  onUserChanged: (profileId: string, updates: UserMutationUpdates) => void;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [strikeLoading, setStrikeLoading] = useState<StrikeOperation | null>(null);
  const [deactivationComposerOpen, setDeactivationComposerOpen] = useState(false);
  const [deactivationMessage, setDeactivationMessage] = useState("");
  const [strikeComposerOpen, setStrikeComposerOpen] = useState(false);
  const [strikeMessage, setStrikeMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiBackoffice
      .get<UserProfile>(`/ojc/users/${profileId}`)
      .then((r) => setProfile(r.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setDeactivationComposerOpen(false);
    setDeactivationMessage("");
    setStrikeComposerOpen(false);
    setStrikeMessage("");
    setActionError("");
  }, [profileId, profile?.accountStatus]);

  async function updateStatus(nextStatus: "ACTIVE" | "INACTIVE", options?: { deactivationMessage?: string }) {
    if (!profile) return;
    setStatusLoading(true);
    setActionError("");
    try {
      await apiBackoffice.patch(`/ojc/users/${profileId}/status`, {
        accountId: profile.accountId,
        status: nextStatus,
        deactivationMessage: options?.deactivationMessage,
      });
      setProfile((current) => (current ? { ...current, accountStatus: nextStatus } : current));
      onUserChanged(profileId, { accountStatus: nextStatus });
      if (nextStatus === "INACTIVE") {
        setDeactivationComposerOpen(false);
        setDeactivationMessage("");
      }
    } catch (error: any) {
      setActionError(error?.response?.data?.message ?? "Failed to update user status.");
    } finally {
      setStatusLoading(false);
    }
  }

  function openStrikeComposer() {
    if (!profile) return;
    setStrikeMessage("");
    setStrikeComposerOpen(true);
    setActionError("");
  }

  async function updateStrikes(operation: StrikeOperation, reason?: string) {
    if (!profile) return;
    const trimmedReason = reason?.trim() ?? "";
    if (operation === "ADD_ONE" && !trimmedReason) {
      setActionError("A reason is required before recording a strike.");
      return;
    }

    setStrikeLoading(operation);
    setActionError("");
    try {
      const response = await apiBackoffice.patch<StrikeUpdateResponse>(`/ojc/users/${profileId}/strikes`, {
        accountId: profile.accountId,
        operation,
        reason: operation === "ADD_ONE" ? trimmedReason : undefined,
      });
      const nextStrikeCount = typeof response.data.strikeCount === "number"
        ? response.data.strikeCount
        : operation === "CLEAR_ALL"
          ? 0
          : operation === "ADD_ONE"
            ? Math.min((profile.strikeCount ?? 0) + 1, 3)
            : Math.max((profile.strikeCount ?? 0) - 1, 0);
      const nextAccountStatus = response.data.accountStatus ?? profile.accountStatus ?? undefined;
      setProfile((current) => (current ? { ...current, strikeCount: nextStrikeCount, accountStatus: nextAccountStatus ?? current.accountStatus } : current));
      onUserChanged(profileId, { strikeCount: nextStrikeCount, accountStatus: nextAccountStatus });
      if (operation === "ADD_ONE") {
        setStrikeComposerOpen(false);
        setStrikeMessage("");
      }
    } catch (error: any) {
      setActionError(error?.response?.data?.message ?? "Failed to update user strikes.");
    } finally {
      setStrikeLoading(null);
    }
  }

  const typeBadge = profile ? USER_TYPE_BADGE[profile.userType] : undefined;
  const statusCfg = profile?.accountStatus ? ACCOUNT_STATUS_BADGE[profile.accountStatus] : undefined;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div className="spinner-border" style={{ width: "1.8rem", height: "1.8rem", color: "#0047AB" }} />
          </div>
        ) : !profile ? (
          <div style={{ padding: 32 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>Failed to load user</div>
            <button type="button" onClick={onClose} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13 }}>
              Close
            </button>
          </div>
        ) : (
          <div style={{ padding: "20px 24px 28px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#eff4ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="bi bi-person" style={{ color: "#0047AB", fontSize: 22 }} />
                  </div>
                )}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                      {profile.firstName} {profile.lastName}
                    </h2>
                    {typeBadge && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: typeBadge.bg, color: typeBadge.color }}>
                        {typeBadge.label}
                      </span>
                    )}
                    {statusCfg && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: statusCfg.bg, color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>@{profile.username}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{profile.email ?? "—"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                <a
                  href={`${JUSTCAUSES_URL}/profile/${profile.username || profile.profileId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#0047AB", textDecoration: "none", padding: "4px 10px", border: "1px solid #bfdbfe", borderRadius: 8, background: "#eff6ff" }}
                >
                  <i className="bi bi-box-arrow-up-right" style={{ fontSize: 11 }} /> Open
                </a>
                {canBlockSuspend && (
                  profile.accountStatus === "ACTIVE" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDeactivationComposerOpen(true);
                        setActionError("");
                      }}
                      disabled={statusLoading}
                      style={{
                        padding: "4px 10px", fontSize: 12, borderRadius: 8, border: "1px solid",
                        borderColor: "#fca5a5",
                        background: "#fee2e2",
                        color: "#991b1b",
                        cursor: statusLoading ? "default" : "pointer",
                        opacity: statusLoading ? 0.6 : 1,
                      }}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void updateStatus("ACTIVE")}
                      disabled={statusLoading}
                      style={{
                        padding: "4px 10px", fontSize: 12, borderRadius: 8, border: "1px solid",
                        borderColor: "#6ee7b7",
                        background: "#d1fae5",
                        color: "#065f46",
                        cursor: statusLoading ? "default" : "pointer",
                        opacity: statusLoading ? 0.6 : 1,
                      }}
                    >
                      Activate
                    </button>
                  )
                )}
                <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, padding: 4, lineHeight: 1 }}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            </div>

            {canBlockSuspend && deactivationComposerOpen ? (
              <div
                style={{
                  marginBottom: 16,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid #fecaca",
                  background: "#fff5f5",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 4 }}>
                    Deactivate account
                  </div>
                  <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.5 }}>
                    Add an optional note for the email. If you leave it empty, the account will still be deactivated with the standard message.
                  </div>
                </div>

                <textarea
                  value={deactivationMessage}
                  onChange={(event) => setDeactivationMessage(event.target.value)}
                  rows={4}
                  placeholder="Optional message from the team"
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid #fecaca",
                    padding: "10px 12px",
                    fontSize: 13,
                    resize: "vertical",
                    outline: "none",
                  }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setDeactivationComposerOpen(false);
                      setDeactivationMessage("");
                      setActionError("");
                    }}
                    style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateStatus("INACTIVE", { deactivationMessage })}
                    disabled={statusLoading}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 8,
                      border: "1px solid #ef4444",
                      background: "#fee2e2",
                      color: "#991b1b",
                      cursor: statusLoading ? "default" : "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      opacity: statusLoading ? 0.6 : 1,
                    }}
                  >
                    {statusLoading ? "Deactivating..." : "Confirm deactivation"}
                  </button>
                </div>
              </div>
            ) : null}

            {canBlockSuspend ? (
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #fed7aa",
                  background: "#fff7ed",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "grid", gap: 8, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#9a3412" }}>
                    Strike management
                  </div>
                  <div style={{ fontSize: 13, color: "#9a3412", lineHeight: 1.5 }}>
                    Record or adjust moderation strikes for this account. A third strike deactivates the account automatically.
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => openStrikeComposer()}
                      disabled={strikeLoading !== null || profile.strikeCount >= 3}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 8,
                        border: "1px solid #f97316",
                        background: "#f97316",
                        color: "#fff",
                        cursor: strikeLoading || profile.strikeCount >= 3 ? "default" : "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        opacity: strikeLoading || profile.strikeCount >= 3 ? 0.6 : 1,
                      }}
                    >
                      Add 1 strike
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateStrikes("REMOVE_ONE")}
                      disabled={strikeLoading !== null || profile.strikeCount <= 0}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 8,
                        border: "1px solid #fdba74",
                        background: "#fff7ed",
                        color: "#9a3412",
                        cursor: strikeLoading || profile.strikeCount <= 0 ? "default" : "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        opacity: strikeLoading || profile.strikeCount <= 0 ? 0.6 : 1,
                      }}
                    >
                      {strikeLoading === "REMOVE_ONE" ? "Removing..." : "Remove 1 strike"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateStrikes("CLEAR_ALL")}
                      disabled={strikeLoading !== null || profile.strikeCount <= 0}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 8,
                        border: "1px solid #fdba74",
                        background: "#fff",
                        color: "#9a3412",
                        cursor: strikeLoading || profile.strikeCount <= 0 ? "default" : "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        opacity: strikeLoading || profile.strikeCount <= 0 ? 0.6 : 1,
                      }}
                    >
                      {strikeLoading === "CLEAR_ALL" ? "Clearing..." : "Clear all strikes"}
                    </button>
                  </div>
                  {strikeComposerOpen ? (
                    <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 800, color: "#9a3412", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Strike reason
                      </label>
                      <textarea
                        value={strikeMessage}
                        onChange={(event) => setStrikeMessage(event.target.value)}
                        rows={4}
                        placeholder="Write the specific reason for this strike"
                        style={{
                          width: "100%",
                          borderRadius: 10,
                          border: "1px solid #fdba74",
                          padding: "10px 12px",
                          fontSize: 13,
                          lineHeight: 1.5,
                          resize: "vertical",
                          outline: "none",
                          color: "#0f172a",
                          background: "#fff",
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setStrikeComposerOpen(false);
                            setStrikeMessage("");
                            setActionError("");
                          }}
                          disabled={strikeLoading !== null}
                          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: strikeLoading ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: "#475569" }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateStrikes("ADD_ONE", strikeMessage)}
                          disabled={strikeLoading !== null || !strikeMessage.trim()}
                          style={{
                            padding: "7px 12px",
                            borderRadius: 8,
                            border: "1px solid #f97316",
                            background: "#f97316",
                            color: "#fff",
                            cursor: strikeLoading || !strikeMessage.trim() ? "default" : "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                            opacity: strikeLoading || !strikeMessage.trim() ? 0.6 : 1,
                          }}
                        >
                          {strikeLoading === "ADD_ONE" ? "Recording..." : "Record strike"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ flexShrink: 0, alignSelf: "center" }}>
                  <StrikeBadge count={profile.strikeCount} />
                </div>
              </div>
            ) : null}

            {actionError ? (
              <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#be123c", fontSize: 13 }}>
                {actionError}
              </div>
            ) : null}

            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
              {/* Account Info */}
              <SectionHeader title="Account" />
              <InfoGrid>
                <InfoItem label="Profile ID" value={<span style={{ fontFamily: "monospace", fontSize: 12 }}>{profile.profileId}</span>} />
                <InfoItem label="Account ID" value={<span style={{ fontFamily: "monospace", fontSize: 12 }}>{profile.accountId}</span>} />
                <InfoItem label="Role" value={profile.role} />
                <InfoItem label="Location" value={[profile.city, profile.country].filter(Boolean).join(", ") || null} />
                <InfoItem label="Joined" value={formatDateTime(profile.createdAt)} />
                <InfoItem label="Strikes" value={<StrikeBadge count={profile.strikeCount} />} />
                {profile.bio && <InfoItem label="Bio" value={profile.bio} />}
              </InfoGrid>

              {/* KYC */}
              <SectionHeader title="KYC / Identity Verification" />
              {!profile.kyc ? (
                <div style={{ fontSize: 13, color: "#94a3b8" }}>No verification record found.</div>
              ) : (
                <InfoGrid>
                  <InfoItem
                    label="Status"
                    value={<StatusBadge map={KYC_BADGE} value={profile.kyc.status} />}
                  />
                  <InfoItem label="Submitted" value={formatDateTime(profile.kyc.submittedAt)} />
                  {profile.kyc.verifiedAt && <InfoItem label="Verified at" value={formatDateTime(profile.kyc.verifiedAt)} />}
                  {profile.kyc.veriffSessionId && (
                    <InfoItem label="Session ref" value={<span style={{ fontFamily: "monospace", fontSize: 12 }}>{profile.kyc.veriffSessionId}</span>} />
                  )}
                  <InfoItem label="Last updated" value={formatDateTime(profile.kyc.updatedAt)} />
                </InfoGrid>
              )}

              {/* Campaigns — CREATOR only */}
              {profile.userType === "CREATOR" && (
                <>
                  <SectionHeader title={`Campaigns (${profile.campaigns.length})`} />
                  {profile.campaigns.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>No campaigns yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {profile.campaigns.map((c) => {
                        const pct = c.goalAmount > 0 ? Math.min(100, Math.round((Number(c.amountRaised) / Number(c.goalAmount)) * 100)) : 0;
                        return (
                          <div key={c.campaignId} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{c.title}</span>
                              <StatusBadge map={CAMPAIGN_STATUS_BADGE} value={c.status} />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                              <span>${Number(c.amountRaised).toLocaleString()} / ${Number(c.goalAmount).toLocaleString()} ({pct}%)</span>
                              <span>·</span>
                              <span>{formatDate(c.createdAt)}</span>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <a
                                href={`/ojc/campaigns?highlight=${c.campaignId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#374151", textDecoration: "none" }}
                              >
                                View in Backoffice
                              </a>
                              <a
                                href={`${JUSTCAUSES_URL}/campaign/${c.campaignId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#0047AB", textDecoration: "none" }}
                              >
                                Preview <i className="bi bi-box-arrow-up-right" style={{ fontSize: 10 }} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Donations */}
              {(() => {
                const donations = profile.donations;
                const totalCount = donations.length;
                const completedDonations = donations.filter((donation) => donation.status === "COMPLETED");
                const completedSum = completedDonations.reduce((acc, d) => acc + Number(d.amount), 0);
                const completedAvg = completedDonations.length > 0 ? completedSum / completedDonations.length : 0;
                return (
                  <>
                    <SectionHeader title={`Donations (${totalCount})`} />
                    {totalCount === 0 ? (
                      <div style={{ fontSize: 13, color: "#94a3b8" }}>No donations yet.</div>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 13 }}>
                          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 14px", flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Records</div>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>{totalCount}</div>
                          </div>
                          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 14px", flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Confirmed total</div>
                            <div style={{ fontWeight: 700, color: "#15803d" }}>${completedSum.toLocaleString()}</div>
                          </div>
                          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 14px", flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Confirmed average</div>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>${completedAvg.toFixed(0)}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {donations.map((d) => (
                            <div key={d.donationId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 500, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {d.campaignTitle ?? "Unknown campaign"}
                                </div>
                                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                                  {d.isAnonymous ? `Anonymous donation · ${formatDate(d.createdAt)}` : formatDate(d.createdAt)}
                                </div>
                              </div>
                              <div style={{ flexShrink: 0, marginLeft: 12, display: "flex", alignItems: "center", gap: 8 }}>
                                {d.status && (
                                  <span style={{
                                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                                    background: d.status === "COMPLETED" ? "#f0fdf4" : d.status === "FAILED" ? "#fff1f2" : "#fff7ed",
                                    color: d.status === "COMPLETED" ? "#15803d" : d.status === "FAILED" ? "#be123c" : "#c2410c",
                                  }}>
                                    {d.status === "COMPLETED" ? "Confirmed" : d.status === "FAILED" ? "Failed" : "Pending"}
                                  </span>
                                )}
                                <span style={{ fontWeight: 600, color: "#15803d" }}>${Number(d.amount).toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UsersPage() {
  const canBlockSuspend = usePermission("block_suspend");
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<UsersPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1));
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [inputValue, setInputValue] = useState(searchParams.get("search") || "");
  const [typeFilter, setTypeFilter] = useState<"" | "DONOR" | "CREATOR">((searchParams.get("type") as "" | "DONOR" | "CREATOR") || "");
  const [kycStatusFilter, setKycStatusFilter] = useState<KycStatusFilter>((searchParams.get("kycStatus") as KycStatusFilter) || "");
  const [strikedOnly, setStrikedOnly] = useState(searchParams.get("strikedOnly") === "true");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">((searchParams.get("order") as "asc" | "desc") || "desc");
  const [previewProfileId, setPreviewProfileId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deactivating, setDeactivating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (typeFilter) params.set("type", typeFilter);
    if (kycStatusFilter) params.set("kycStatus", kycStatusFilter);
    if (strikedOnly) params.set("strikedOnly", "true");
    if (sortOrder !== "desc") params.set("order", sortOrder);
    if (page > 1) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [search, typeFilter, kycStatusFilter, strikedOnly, sortOrder, page, setSearchParams]);

  useEffect(() => {
    setLoading(true);
    apiBackoffice
      .get<UsersPageData>("/ojc/users", {
        params: {
          search: search || undefined,
          type: typeFilter || undefined,
          kycStatus: kycStatusFilter || undefined,
          strikedOnly: strikedOnly || undefined,
          sort: "createdAt",
          order: sortOrder,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [search, page, typeFilter, kycStatusFilter, strikedOnly, sortOrder]);

  function handleSearchChange(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 400);
  }

  function handleUserChanged(profileId: string, updates: UserMutationUpdates) {
    setData((current) =>
      current
        ? {
            ...current,
            users: current.users.map((u) =>
              u.profileId === profileId
                ? {
                    ...u,
                    accountStatus: updates.accountStatus ?? u.accountStatus,
                    strikeCount: typeof updates.strikeCount === "number" ? updates.strikeCount : u.strikeCount,
                  }
                : u,
            ),
          }
        : current,
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  useClampPageToTotal({ page, totalPages, setPage, disabled: loading || !data });
  const allSelected = !!data && data.users.length > 0 && data.users.every((u) => selectedIds.includes(u.profileId));

  function toggleSelectAll() {
    if (!data) return;
    setSelectedIds(allSelected ? [] : data.users.map((u) => u.profileId));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function deactivateSelected() {
    if (!data) return;
    const targets = data.users.filter((u) => selectedIds.includes(u.profileId));
    setDeactivating(true);
    await Promise.allSettled(
      targets.map((u) =>
        apiBackoffice.patch(`/ojc/users/${u.profileId}/status`, { accountId: u.accountId, status: "INACTIVE" }),
      ),
    );
    setData((current) =>
      current
        ? { ...current, users: current.users.map((u) => selectedIds.includes(u.profileId) ? { ...u, accountStatus: "INACTIVE" } : u) }
        : current,
    );
    setSelectedIds([]);
    setDeactivating(false);
  }

  return (
    <>
      <div className="admin-page-header">
        <h1>Users</h1>
        <p>All registered platform users.</p>
      </div>

      <div
        className="users-page__panel"
        style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", width: "100%" }}
      >
        <div
          className="users-page__toolbar"
          style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
        >
          <div
            className="users-page__search"
            style={{ position: "relative", flex: "1 1 320px", minWidth: 230, maxWidth: 420 }}
          >
            <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14 }} />
            <input
              type="text"
              placeholder="Search name, username, email or ID…"
              value={inputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none",
              }}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as "" | "DONOR" | "CREATOR"); setPage(1); }}
            style={{ padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff" }}
          >
            <option value="">All types</option>
            <option value="DONOR">Donor</option>
            <option value="CREATOR">Creator</option>
          </select>

          <select
            value={kycStatusFilter}
            onChange={(e) => { setKycStatusFilter(e.target.value as KycStatusFilter); setPage(1); }}
            style={{ padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff" }}
          >
            <option value="">All KYC</option>
            <option value="PENDING">KYC pending</option>
            <option value="VERIFIED">KYC verified</option>
            <option value="DECLINED">KYC declined</option>
            <option value="NONE">No KYC record</option>
          </select>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "7px 10px",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 13,
              color: "#475569",
              background: strikedOnly ? "#fff7ed" : "#fff",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={strikedOnly}
              onChange={(e) => { setStrikedOnly(e.target.checked); setPage(1); }}
              style={{ margin: 0 }}
            />
            With strikes
          </label>

          <select
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value as "asc" | "desc"); setPage(1); }}
            style={{ padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff" }}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>

          {canBlockSuspend && selectedIds.length > 0 && (
            <button
              onClick={deactivateSelected}
              disabled={deactivating}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #ef4444", background: "#fee2e2", color: "#991b1b", cursor: deactivating ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: deactivating ? 0.6 : 1 }}
            >
              {deactivating ? "Deactivating…" : `Deactivate all (${selectedIds.length})`}
            </button>
          )}

          {data && (
            <span className="users-page__count" style={{ fontSize: 13, color: "#64748b", flexShrink: 0, marginLeft: "auto" }}>
              {data.total.toLocaleString()} users
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
            <div className="spinner-border" style={{ width: "1.8rem", height: "1.8rem", color: "#0047AB" }} />
          </div>
        ) : !data || data.users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8", fontSize: 14 }}>
            No users found.
          </div>
        ) : (
          <div className="users-page__table">
            <table
              className={canBlockSuspend ? "users-table users-table--selectable" : "users-table"}
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  {canBlockSuspend && (
                    <th style={{ padding: "10px 16px", width: 40 }}>
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                    </th>
                  )}
                  {["User", "Email", "Type", "KYC", "Location", "Donations", "Strikes", "Status", "Joined"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => {
                  const typeBadge = USER_TYPE_BADGE[u.userType];
                  return (
                    <tr
                      key={u.profileId}
                      style={{ borderBottom: "1px solid #f8fafc", cursor: "pointer" }}
                      onClick={() => setPreviewProfileId(u.profileId)}
                    >
                      {canBlockSuspend && (
                        <td data-label="Select" style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(u.profileId)}
                            onChange={() => toggleSelect(u.profileId)}
                          />
                        </td>
                      )}
                      <td data-label="User" style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#eff4ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <i className="bi bi-person" style={{ color: "#0047AB", fontSize: 15 }} />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 500, color: "#0f172a" }}>{u.firstName} {u.lastName}</div>
                            <div style={{ color: "#94a3b8", fontSize: 12 }}>@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Email" style={{ padding: "12px 16px", color: "#475569" }}>{u.email ?? "—"}</td>
                      <td data-label="Type" style={{ padding: "12px 16px" }}>
                        {typeBadge && (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: typeBadge.bg, color: typeBadge.color }}>
                            {typeBadge.label}
                          </span>
                        )}
                      </td>
                      <td data-label="KYC" style={{ padding: "12px 16px" }}>
                        {u.verificationStatus ? (
                          <StatusBadge map={KYC_BADGE} value={u.verificationStatus} />
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#f1f5f9", color: "#94a3b8" }}>
                            Not verified
                          </span>
                        )}
                      </td>
                      <td data-label="Location" style={{ padding: "12px 16px", color: "#64748b" }}>
                        {[u.city, u.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td data-label="Donations" style={{ padding: "12px 16px", color: "#0f172a", fontWeight: 700 }}>
                        {u.completedDonationCount ?? 0}
                      </td>
                      <td data-label="Strikes" style={{ padding: "12px 16px" }}>
                        <StrikeBadge count={u.strikeCount} />
                      </td>
                      <td data-label="Status" style={{ padding: "12px 16px" }}>
                        {u.accountStatus ? (
                          <StatusBadge map={ACCOUNT_STATUS_BADGE} value={u.accountStatus} />
                        ) : "—"}
                      </td>
                      <td data-label="Joined" style={{ padding: "12px 16px", color: "#64748b", whiteSpace: "nowrap" }}>
                        {formatDate(u.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && data && totalPages > 1 && (
          <div
            className="users-page__pagination"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid #f1f5f9" }}
          >
            <span style={{ fontSize: 13, color: "#64748b" }}>Page {page} of {totalPages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                style={{ padding: "5px 14px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}
              >
                ← Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                style={{ padding: "5px 14px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {previewProfileId && (
        <UserDetailModal
          profileId={previewProfileId}
          onClose={() => setPreviewProfileId(null)}
          canBlockSuspend={canBlockSuspend}
          onUserChanged={handleUserChanged}
        />
      )}
    </>
  );
}
