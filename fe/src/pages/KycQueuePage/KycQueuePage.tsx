import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiBackoffice } from "@/shared/lib/axios";
import { usePermission } from "@/shared/hooks/usePermission";
import { useClampPageToTotal } from "@/shared/hooks/useClampPageToTotal";

type VerificationStatus = "PENDING" | "VERIFIED" | "DECLINED";

interface VerificationData {
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  gender: string | null;
  country: string | null;
  documentType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ComparisonField {
  key: "firstName" | "lastName" | "country";
  label: string;
  platformValue: string | null;
  verificationValue: string | null;
  matches: boolean | null;
}

interface ComparisonSummary {
  checkedFields: ComparisonField[];
  mismatchCount: number;
  missingVerificationData: boolean;
}

interface KycEntry {
  verificationId: string;
  accountId: string;
  profileId: string | null;
  status: VerificationStatus;
  veriffSessionId: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  country: string | null;
  email: string | null;
  accountStatus: string | null;
  verificationData: VerificationData | null;
  comparison: ComparisonSummary;
}

interface KycPage {
  entries: KycEntry[];
  total: number;
  stats?: KycStats;
  filterOptions?: KycFilterOptions;
}

interface KycStats {
  total: number;
  pending: number;
  verified: number;
  declined: number;
  mismatches: number;
  missingProviderData: number;
  stalePending: number;
  inactiveAccounts: number;
}

interface KycFilterOptions {
  countries: string[];
  documentTypes: string[];
}

interface KycActionResponse {
  ok: boolean;
  entry?: KycEntry;
  removedVerificationId?: string;
}

const PAGE_SIZE = 20;
const STALE_REVIEW_DAYS = 7;
const JUSTCAUSES_URL = "https://dev.onlyjustcausetest.com";

const STATUS_CONFIG: Record<VerificationStatus, { label: string; bg: string; color: string }> = {
  PENDING: { label: "Pending", bg: "#fef3c7", color: "#92400e" },
  VERIFIED: { label: "Verified", bg: "#f0fdf4", color: "#15803d" },
  DECLINED: { label: "Declined", bg: "#fff1f2", color: "#be123c" },
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "DECLINED", label: "Declined" },
];

const COMPARISON_OPTIONS = [
  { value: "", label: "All comparisons" },
  { value: "mismatch", label: "Mismatches" },
  { value: "match", label: "No mismatches" },
  { value: "no_provider", label: "No provider data" },
];

const EMPTY_STATS: KycStats = {
  total: 0,
  pending: 0,
  verified: 0,
  declined: 0,
  mismatches: 0,
  missingProviderData: 0,
  stalePending: 0,
  inactiveAccounts: 0,
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fullName(entry: KycEntry) {
  return [entry.firstName, entry.lastName].filter(Boolean).join(" ") || null;
}

function verificationName(data: VerificationData | null) {
  if (!data) return null;
  return [data.firstName, data.lastName].filter(Boolean).join(" ") || null;
}

function valueOrDash(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function isOlderThanDays(value: string | null | undefined, days: number) {
  const timestamp = new Date(value ?? "").getTime();
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp >= days * 24 * 60 * 60 * 1000;
}

function canResetStaleKyc(entry: KycEntry) {
  return entry.status === "PENDING" && isOlderThanDays(entry.createdAt, STALE_REVIEW_DAYS);
}

function comparisonLabel(entry: KycEntry) {
  if (entry.comparison.missingVerificationData) return "No provider data";
  if (entry.comparison.mismatchCount > 0) return `${entry.comparison.mismatchCount} mismatch${entry.comparison.mismatchCount === 1 ? "" : "es"}`;
  return "No mismatches";
}

function comparisonTone(entry: KycEntry) {
  if (entry.comparison.missingVerificationData) {
    return { bg: "#f8fafc", color: "#64748b" };
  }
  if (entry.comparison.mismatchCount > 0) {
    return { bg: "#fff7ed", color: "#c2410c" };
  }
  return { bg: "#f0fdf4", color: "#15803d" };
}

function buildMismatchEmail(entry: KycEntry) {
  const userName = fullName(entry) ?? entry.username ?? "there";
  const differences = entry.comparison.checkedFields
    .filter((field) => field.matches === false)
    .map((field) => `- ${field.label}: your profile says "${valueOrDash(field.platformValue)}", but your KYC verification says "${valueOrDash(field.verificationValue)}".`);

  const differenceBlock = differences.length > 0
    ? differences.join("\n")
    : "- We could not automatically identify a specific mismatch, but your profile information needs to be reviewed against your KYC verification.";

  return `Hello ${userName},

We reviewed your KYC verification and found that some information on your JustCauses profile does not match the verified identity information we received.

Differences found:
${differenceBlock}

Please update your JustCauses profile information within 72 hours so it matches your verified identity information.

If the profile is not corrected within 72 hours, your account may be deactivated until the information is resolved.

Thank you,
The JustCauses Team`;
}

function FieldComparisonRow({ field }: { field: ComparisonField }) {
  const tone =
    field.matches === false
      ? { label: "Mismatch", bg: "#fff7ed", color: "#c2410c" }
      : field.matches === true
        ? { label: "Match", bg: "#f0fdf4", color: "#15803d" }
        : { label: "Not comparable", bg: "#f8fafc", color: "#64748b" };

  return (
    <tr>
      <td style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>{field.label}</td>
      <td style={{ padding: "12px 14px", color: "#334155" }}>{valueOrDash(field.platformValue)}</td>
      <td style={{ padding: "12px 14px", color: "#334155" }}>{valueOrDash(field.verificationValue)}</td>
      <td style={{ padding: "12px 14px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 999, background: tone.bg, color: tone.color }}>
          {tone.label}
        </span>
      </td>
    </tr>
  );
}

export default function KycQueuePage() {
  const canView = usePermission("view_kyc");
  const canDeactivate = usePermission("view_kyc");
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<KycPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<KycEntry | null>(null);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [actionLoading, setActionLoading] = useState<"email" | "deactivate" | "activate" | "reset" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1));
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [comparisonFilter, setComparisonFilter] = useState(searchParams.get("comparison") || "");
  const [countryFilter, setCountryFilter] = useState(searchParams.get("country") || "");
  const [documentTypeFilter, setDocumentTypeFilter] = useState(searchParams.get("documentType") || "");
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get("overdue") === "true");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());
    if (comparisonFilter) params.set("comparison", comparisonFilter);
    if (countryFilter) params.set("country", countryFilter);
    if (documentTypeFilter) params.set("documentType", documentTypeFilter);
    if (overdueOnly) params.set("overdue", "true");
    if (page > 1) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [comparisonFilter, countryFilter, documentTypeFilter, overdueOnly, page, search, statusFilter, setSearchParams]);

  useEffect(() => {
    if (!canView) return;
    setLoading(true);
    apiBackoffice
      .get<KycPage>("/ojc/kyc", {
        params: {
          status: statusFilter || undefined,
          search: search || undefined,
          comparison: comparisonFilter || undefined,
          country: countryFilter || undefined,
          documentType: documentTypeFilter || undefined,
          overdue: overdueOnly ? "true" : undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [canView, comparisonFilter, countryFilter, documentTypeFilter, overdueOnly, page, search, statusFilter]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  useClampPageToTotal({ page, totalPages, setPage, disabled: loading || !data });
  const selectedAccountInactive = selectedEntry?.accountStatus === "INACTIVE";
  const stats = data?.stats ?? EMPTY_STATS;
  const filterOptions = data?.filterOptions ?? { countries: [], documentTypes: [] };

  useEffect(() => {
    if (documentTypeFilter && data?.filterOptions && !data.filterOptions.documentTypes.includes(documentTypeFilter)) {
      setDocumentTypeFilter("");
      setPage(1);
    }
  }, [data?.filterOptions, documentTypeFilter]);

  function handleSearchInput(value: string) {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(value.trim());
      setPage(1);
    }, 350);
  }

  function clearFilters() {
    setStatusFilter("");
    setSearch("");
    setSearchInput("");
    setComparisonFilter("");
    setCountryFilter("");
    setDocumentTypeFilter("");
    setOverdueOnly(false);
    setPage(1);
  }

  function applyUpdatedEntry(updatedEntry: KycEntry) {
    setSelectedEntry(updatedEntry);
    setData((current) => current
      ? {
          ...current,
          entries: current.entries.map((entry) =>
            entry.verificationId === updatedEntry.verificationId ? updatedEntry : entry,
          ),
        }
      : current);
  }

  function removeEntry(verificationId: string) {
    setSelectedEntry(null);
    setData((current) => current
      ? {
          ...current,
          total: Math.max(0, current.total - 1),
          entries: current.entries.filter((entry) => entry.verificationId !== verificationId),
        }
      : current);
  }

  function openComparison(entry: KycEntry) {
    setSelectedEntry(entry);
    setEmailComposerOpen(false);
    setEmailMessage("");
    setActionError(null);
    setActionSuccess(null);
    setActionLoading(null);
  }

  function openEmailComposer(entry: KycEntry) {
    setEmailMessage(buildMismatchEmail(entry));
    setEmailComposerOpen(true);
    setActionError(null);
    setActionSuccess(null);
  }

  async function sendWarningEmail() {
    if (!selectedEntry) return;
    const trimmed = emailMessage.trim();
    if (!trimmed) {
      setActionError("The warning email message cannot be empty.");
      return;
    }

    setActionLoading("email");
    setActionError(null);
    setActionSuccess(null);
    try {
      await apiBackoffice.post(`/ojc/kyc/${selectedEntry.verificationId}/mismatch-warning`, { message: trimmed });
      setActionSuccess("Warning email sent.");
      setEmailComposerOpen(false);
    } catch (error: any) {
      setActionError(error?.response?.data?.message ?? "Failed to send warning email.");
    } finally {
      setActionLoading(null);
    }
  }

  async function deactivateAccount() {
    if (!selectedEntry) return;

    setActionLoading("deactivate");
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await apiBackoffice.post<KycActionResponse>(`/ojc/kyc/${selectedEntry.verificationId}/deactivate`, {
        message: emailMessage.trim() || undefined,
      });
      if (response.data.entry) applyUpdatedEntry(response.data.entry);
      setActionSuccess("Account deactivated.");
    } catch (error: any) {
      setActionError(error?.response?.data?.message ?? "Failed to deactivate account.");
    } finally {
      setActionLoading(null);
    }
  }

  async function activateAccount() {
    if (!selectedEntry) return;

    setActionLoading("activate");
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await apiBackoffice.post<KycActionResponse>(`/ojc/kyc/${selectedEntry.verificationId}/activate`);
      if (response.data.entry) applyUpdatedEntry(response.data.entry);
      setActionSuccess("Account activated.");
    } catch (error: any) {
      setActionError(error?.response?.data?.message ?? "Failed to activate account.");
    } finally {
      setActionLoading(null);
    }
  }

  async function resetStaleSubmission() {
    if (!selectedEntry) return;

    setActionLoading("reset");
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await apiBackoffice.post<KycActionResponse>(`/ojc/kyc/${selectedEntry.verificationId}/reset-stale`);
      removeEntry(response.data.removedVerificationId ?? selectedEntry.verificationId);
    } catch (error: any) {
      setActionError(error?.response?.data?.message ?? "Failed to reset the KYC submission.");
    } finally {
      setActionLoading(null);
    }
  }

  if (!canView) {
    return (
      <>
        <div className="admin-page-header">
          <h1>KYC Queue</h1>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          You do not have permission to view KYC data.
        </div>
      </>
    );
  }

  return (
    <>
      <div className="admin-page-header">
        <h1>KYC Queue</h1>
        <p>Identity verification submissions with profile-to-provider comparison.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Pending", value: stats.pending, tone: "#92400e", bg: "#fffbeb" },
          { label: "Verified", value: stats.verified, tone: "#15803d", bg: "#f0fdf4" },
          { label: "Declined", value: stats.declined, tone: "#be123c", bg: "#fff1f2" },
          { label: "Mismatches", value: stats.mismatches, tone: "#c2410c", bg: "#fff7ed" },
          { label: "No provider data", value: stats.missingProviderData, tone: "#475569", bg: "#f8fafc" },
          { label: "Over 7 days", value: stats.stalePending, tone: "#b91c1c", bg: "#fef2f2" },
        ].map((item) => (
          <div key={item.label} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 16px", background: item.bg }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b" }}>{item.label}</div>
            <div style={{ marginTop: 7, fontSize: 24, lineHeight: 1, fontWeight: 850, color: item.tone }}>{item.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", minWidth: "max-content" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <input
            type="text"
            value={searchInput}
            onChange={(event) => handleSearchInput(event.target.value)}
            placeholder="Search name, email, username, ID, country, document..."
            style={{ minWidth: 300, flex: "1 1 320px", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none" }}
          />
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff" }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={comparisonFilter}
            onChange={(event) => {
              setComparisonFilter(event.target.value);
              setPage(1);
            }}
            style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff" }}
          >
            {COMPARISON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={countryFilter}
            onChange={(event) => {
              setCountryFilter(event.target.value);
              setPage(1);
            }}
            style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff" }}
          >
            <option value="">All countries</option>
            {filterOptions.countries.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          {filterOptions.documentTypes.length > 0 ? (
            <select
              value={documentTypeFilter}
              onChange={(event) => {
                setDocumentTypeFilter(event.target.value);
                setPage(1);
              }}
              style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff" }}
            >
              <option value="">All documents</option>
              {filterOptions.documentTypes.map((documentType) => (
                <option key={documentType} value={documentType}>{documentType}</option>
              ))}
            </select>
          ) : null}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#334155", background: "#fff" }}>
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(event) => {
                setOverdueOnly(event.target.checked);
                setPage(1);
              }}
            />
            Over 7 days
          </label>
          <button
            type="button"
            onClick={clearFilters}
            style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", color: "#334155", fontSize: 13, fontWeight: 700 }}
          >
            Clear filters
          </button>
          </div>
          {data && (
            <span style={{ fontSize: 13, color: "#64748b" }}>
              {data.total.toLocaleString()} result{data.total === 1 ? "" : "s"} · {stats.total.toLocaleString()} in current filtered set
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div className="spinner-border" role="status" style={{ width: "1.8rem", height: "1.8rem", color: "#0047AB" }} />
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8", fontSize: 14 }}>
            No KYC submissions found.
          </div>
        ) : (
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  {["User", "Email", "Platform country", "Verification data", "Comparison", "Status", "Submitted", "Verified At"].map((heading) => (
                    <th key={heading} style={{ padding: "10px 16px", fontWeight: 600, color: "#64748b", textAlign: "left", whiteSpace: "nowrap" }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => {
                  const statusCfg = STATUS_CONFIG[entry.status];
                  const name = fullName(entry);
                  const providerName = verificationName(entry.verificationData);
                  const comparisonCfg = comparisonTone(entry);
                  const isOverdue = canResetStaleKyc(entry);
                  const isInactive = entry.accountStatus === "INACTIVE";

                  return (
                    <tr key={entry.verificationId} style={{ borderBottom: "1px solid #f8fafc", cursor: "pointer" }} onClick={() => openComparison(entry)}>
                      <td style={{ padding: "12px 16px", maxWidth: 220 }}>
                        {name ? (
                          <>
                            <div style={{ fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                            {entry.username && (
                              <a
                                href={`${JUSTCAUSES_URL}/profile/${encodeURIComponent(entry.username)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(event) => event.stopPropagation()}
                                style={{ fontSize: 11, color: "#64748b", textDecoration: "none" }}
                              >
                                @{entry.username}
                              </a>
                            )}
                            {(isOverdue || isInactive) && (
                              <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
                                {isOverdue && <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "#fef2f2", color: "#b91c1c" }}>Overdue</span>}
                                {isInactive && <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "#f8fafc", color: "#475569" }}>Inactive</span>}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.email ?? "-"}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>No profile set</div>
                            {(isOverdue || isInactive) && (
                              <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
                                {isOverdue && <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "#fef2f2", color: "#b91c1c" }}>Overdue</span>}
                                {isInactive && <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "#f8fafc", color: "#475569" }}>Inactive</span>}
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px", color: "#475569", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.email ?? <span style={{ color: "#94a3b8" }}>-</span>}
                      </td>

                      <td style={{ padding: "12px 16px", color: "#64748b", whiteSpace: "nowrap" }}>
                        {entry.country || <span style={{ color: "#94a3b8" }}>-</span>}
                      </td>

                      <td style={{ padding: "12px 16px", maxWidth: 220 }}>
                        {entry.verificationData ? (
                          <>
                            <div style={{ fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {providerName ?? "Provider data stored"}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              {[entry.verificationData.country, entry.verificationData.documentType].filter(Boolean).join(" - ") || "Identity details available"}
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 600, color: "#64748b" }}>No provider data</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>Waiting for extracted verification details</div>
                          </>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 999, background: comparisonCfg.bg, color: comparisonCfg.color, whiteSpace: "nowrap" }}>
                          {comparisonLabel(entry)}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 20, background: statusCfg.bg, color: statusCfg.color, whiteSpace: "nowrap" }}>
                          {statusCfg.label}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", color: "#64748b", whiteSpace: "nowrap", fontSize: 12 }}>
                        {formatDate(entry.createdAt)}
                      </td>

                      <td style={{ padding: "12px 16px", color: "#64748b", whiteSpace: "nowrap", fontSize: 12 }}>
                        {entry.verifiedAt ? formatDate(entry.verifiedAt) : <span style={{ color: "#94a3b8" }}>-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && data && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>Page {page} of {totalPages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: "5px 14px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ padding: "5px 14px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {selectedEntry && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1400, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.45)" }} onClick={() => setSelectedEntry(null)} />
          <div style={{ position: "relative", width: "min(960px, 100%)", maxHeight: "88vh", overflowY: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "22px 24px", borderBottom: "1px solid #e2e8f0" }}>
              <div>
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
                  KYC comparison
                </p>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{fullName(selectedEntry) ?? selectedEntry.email ?? "Unknown user"}</h2>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", color: "#64748b", fontSize: 13 }}>
                  <span>Email: {selectedEntry.email ?? "No email"}</span>
                  <span>Veriff session: {selectedEntry.veriffSessionId ?? "No Veriff session"}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                {canResetStaleKyc(selectedEntry) && (
                  <button
                    type="button"
                    onClick={() => void resetStaleSubmission()}
                    disabled={actionLoading !== null}
                    style={{
                      minHeight: 40,
                      padding: "0 14px",
                      borderRadius: 10,
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      fontWeight: 800,
                      cursor: actionLoading !== null ? "default" : "pointer",
                      opacity: actionLoading !== null ? 0.6 : 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {actionLoading === "reset" ? "Resetting..." : "Reset verification"}
                  </button>
                )}
                <button onClick={() => setSelectedEntry(null)} aria-label="Close" style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 18 }}>
                  x
                </button>
              </div>
            </div>

            <div style={{ padding: 24, display: "grid", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Status</p>
                  <p style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>{selectedEntry.status}</p>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Account</p>
                  <p style={{ margin: 0, fontWeight: 800, color: selectedAccountInactive ? "#b91c1c" : "#15803d" }}>
                    {selectedEntry.accountStatus ?? "Unknown"}
                  </p>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Comparison</p>
                  <p style={{ margin: 0, fontWeight: 800, color: comparisonTone(selectedEntry).color }}>{comparisonLabel(selectedEntry)}</p>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Document</p>
                  <p style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>{valueOrDash(selectedEntry.verificationData?.documentType)}</p>
                </div>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "11px 14px", textAlign: "left", color: "#64748b" }}>Field</th>
                      <th style={{ padding: "11px 14px", textAlign: "left", color: "#64748b" }}>Platform profile</th>
                      <th style={{ padding: "11px 14px", textAlign: "left", color: "#64748b" }}>KYC verification</th>
                      <th style={{ padding: "11px 14px", textAlign: "left", color: "#64748b" }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEntry.comparison.checkedFields.map((field) => (
                      <FieldComparisonRow key={field.key} field={field} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, display: "grid", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "#0f172a" }}>Profile correction action</h3>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                      Send an editable 72-hour correction notice, or deactivate the account if enforcement is required.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => openEmailComposer(selectedEntry)}
                      disabled={!selectedEntry.email || actionLoading !== null}
                      style={{
                        minHeight: 38,
                        padding: "0 14px",
                        borderRadius: 10,
                        border: "1px solid #bfdbfe",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        fontWeight: 700,
                        cursor: !selectedEntry.email || actionLoading !== null ? "default" : "pointer",
                        opacity: !selectedEntry.email || actionLoading !== null ? 0.55 : 1,
                      }}
                    >
                      Prepare email
                    </button>
                    {canDeactivate && (
                      <button
                        type="button"
                        onClick={() => selectedAccountInactive ? void activateAccount() : void deactivateAccount()}
                        disabled={actionLoading !== null}
                        style={{
                          minHeight: 38,
                          padding: "0 14px",
                          borderRadius: 10,
                          border: selectedAccountInactive ? "1px solid #bbf7d0" : "1px solid #fecaca",
                          background: selectedAccountInactive ? "#f0fdf4" : "#fef2f2",
                          color: selectedAccountInactive ? "#15803d" : "#b91c1c",
                          fontWeight: 700,
                          cursor: actionLoading !== null ? "default" : "pointer",
                          opacity: actionLoading !== null ? 0.6 : 1,
                        }}
                      >
                        {actionLoading === "activate"
                          ? "Activating..."
                          : actionLoading === "deactivate"
                            ? "Deactivating..."
                            : selectedAccountInactive
                              ? "Activate account"
                              : "Deactivate account"}
                      </button>
                    )}
                  </div>
                </div>

                {!selectedEntry.email && (
                  <div style={{ border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
                    No email address is linked to this verification record, so a correction notice cannot be sent.
                  </div>
                )}

                {emailComposerOpen && (
                  <div style={{ display: "grid", gap: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                      Email message
                    </label>
                    <textarea
                      value={emailMessage}
                      onChange={(event) => setEmailMessage(event.target.value)}
                      rows={11}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        border: "1px solid #dbe7f4",
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "#0f172a",
                        outline: "none",
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setEmailComposerOpen(false)}
                        disabled={actionLoading !== null}
                        style={{ minHeight: 38, padding: "0 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontWeight: 700 }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void sendWarningEmail()}
                        disabled={actionLoading !== null || !emailMessage.trim()}
                        style={{
                          minHeight: 38,
                          padding: "0 14px",
                          borderRadius: 10,
                          border: "1px solid #1d4ed8",
                          background: "#1d4ed8",
                          color: "#fff",
                          fontWeight: 700,
                          cursor: actionLoading !== null || !emailMessage.trim() ? "default" : "pointer",
                          opacity: actionLoading !== null || !emailMessage.trim() ? 0.6 : 1,
                        }}
                      >
                        {actionLoading === "email" ? "Sending..." : "Send email"}
                      </button>
                    </div>
                  </div>
                )}

                {actionError && (
                  <div style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
                    {actionError}
                  </div>
                )}
                {actionSuccess && (
                  <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#15803d", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
                    {actionSuccess}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#0f172a" }}>Platform profile</h3>
                  <InfoLine label="Name" value={fullName(selectedEntry)} />
                  <InfoLine label="Username" value={selectedEntry.username ? `@${selectedEntry.username}` : null} />
                  <InfoLine label="Country" value={selectedEntry.country} />
                  <InfoLine label="Profile ID" value={selectedEntry.profileId} mono />
                  <InfoLine label="Account ID" value={selectedEntry.accountId} mono />
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#0f172a" }}>KYC verification data</h3>
                  <InfoLine label="Verification ID" value={selectedEntry.verificationId} mono />
                  <InfoLine label="Veriff session" value={selectedEntry.veriffSessionId} mono />
                  <InfoLine label="Name" value={verificationName(selectedEntry.verificationData)} />
                  <InfoLine label="Birth date" value={selectedEntry.verificationData?.birthDate ?? null} />
                  <InfoLine label="Gender" value={selectedEntry.verificationData?.gender ?? null} />
                  <InfoLine label="Country" value={selectedEntry.verificationData?.country ?? null} />
                  <InfoLine label="Document type" value={selectedEntry.verificationData?.documentType ?? null} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoLine({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", gap: 10, padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
      <span style={{ color: "#0f172a", fontSize: 13, fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" : undefined, wordBreak: "break-word" }}>
        {valueOrDash(value)}
      </span>
    </div>
  );
}
