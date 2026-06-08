import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiBackoffice } from "@/shared/lib/axios";
import { useClampPageToTotal } from "@/shared/hooks/useClampPageToTotal";
import "@/pages/FinancePages/financePages.css";

interface Donation {
  donationId: string;
  campaignId: string;
  campaignTitle: string | null;
  donorName: string | null;
  donorUsername: string | null;
  profileId: string | null;
  amount: number;
  status: "COMPLETED" | "PENDING" | "FAILED";
  isAnonymous: boolean;
  transactionId: string | null;
  createdAt: string;
}

interface DonationsPageData {
  donations: Donation[];
  total: number;
  summary: {
    totalAmount: number;
    completedCount: number;
    pendingCount: number;
    failedCount: number;
  };
  overall: {
    total: number;
    summary: {
      totalAmount: number;
      completedCount: number;
      pendingCount: number;
      failedCount: number;
    };
  };
}

import { JUSTCAUSES_URL } from "@/shared/config/env";

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  COMPLETED: { label: "Completed", bg: "#f0fdf4", color: "#15803d" },
  PENDING: { label: "Pending", bg: "#fffbeb", color: "#92400e" },
  FAILED: { label: "Failed", bg: "#fef2f2", color: "#b91c1c" },
};

function fmt(amount: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "USD" }).format(amount);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortHash(value: string) {
  return value.length > 16 ? `${value.slice(0, 12)}...` : value;
}

async function copyValue(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Ignore clipboard failures in older browsers.
  }
}

export default function DonationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<DonationsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1));
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [inputValue, setInputValue] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (page > 1) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [search, statusFilter, page, setSearchParams]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), pageSize: String(PAGE_SIZE) };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    apiBackoffice
      .get<DonationsPageData>("/ojc/donations", { params })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  function handleInput(val: string) {
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  }

  function handleStatus(val: string) {
    setStatusFilter(val);
    setPage(1);
  }

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  useClampPageToTotal({ page, totalPages, setPage, disabled: loading || !data });

  return (
    <div className="finance-page">
      <div className="finance-page__header">
        <h1>Donations</h1>
        <p>Campaign donation records and processing outcomes across OnlyJustCauses, with donor and transaction context where available.</p>
      </div>

      <div className="finance-stats">
        <div className="finance-stat">
          <p className="finance-stat__label">Total donations</p>
          <p className="finance-stat__value">{data?.overall.total ?? 0}</p>
          <p className="finance-stat__note">All donation records</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Successful</p>
          <p className="finance-stat__value">{data?.overall.summary.completedCount ?? 0}</p>
          <p className="finance-stat__note">Completed donation records</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Pending</p>
          <p className="finance-stat__value">{data?.overall.summary.pendingCount ?? 0}</p>
          <p className="finance-stat__note">Awaiting resolution</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Failed</p>
          <p className="finance-stat__value">{data?.overall.summary.failedCount ?? 0}</p>
          <p className="finance-stat__note">Did not complete</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Completed donated</p>
          <p className="finance-stat__value">{fmt(data?.overall.summary.totalAmount ?? 0)}</p>
          <p className="finance-stat__note">Completed donations only</p>
        </div>
      </div>

      <div className="finance-toolbar">
        <input
          className="finance-toolbar__search"
          type="text"
          placeholder="Search campaign or donor..."
          value={inputValue}
          onChange={(e) => handleInput(e.target.value)}
        />
        <select className="finance-toolbar__select" value={statusFilter} onChange={(e) => handleStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
        <div className="finance-toolbar__meta">
          <span className="finance-toolbar__count">{total} donation{total !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {loading ? (
        <div className="finance-empty">Loading...</div>
      ) : !data || data.donations.length === 0 ? (
        <div className="finance-empty">No donations found.</div>
      ) : (
        <>
          <div className="finance-surface">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Campaign</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Transaction</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.donations.map((donation) => {
                  const badge = STATUS_BADGE[donation.status] ?? STATUS_BADGE.PENDING;
                  return (
                    <tr key={donation.donationId} onClick={() => setSelectedDonation(donation)}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {donation.donorUsername ? (
                            <a
                              href={`${JUSTCAUSES_URL}/profile/${encodeURIComponent(donation.donorUsername)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              style={{ color: "#0f172a", textDecoration: "none", fontWeight: 700 }}
                            >
                              {donation.donorName ?? donation.donorUsername}
                            </a>
                          ) : (
                            <p className="finance-cell-title">{donation.donorName ?? "Unknown donor"}</p>
                          )}
                        </div>
                        <p className="finance-cell-subtitle">
                          {donation.isAnonymous ? "Anonymous donation" : donation.profileId ?? "No linked profile"}
                        </p>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <a
                            href={`${JUSTCAUSES_URL}/campaign/${donation.campaignId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            style={{ color: "#0f172a", textDecoration: "none", fontWeight: 700 }}
                          >
                            {donation.campaignTitle ?? "Unknown campaign"}
                          </a>
                        </div>
                        <p className="finance-cell-subtitle">{donation.campaignId}</p>
                      </td>
                      <td>
                        <div className="finance-amount">{fmt(donation.amount)}</div>
                        <p className="finance-cell-subtitle">Single donation record</p>
                      </td>
                      <td>
                        <span className="finance-badge" style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td>
                        {donation.transactionId ? (
                          <>
                            <p className="finance-cell-title finance-cell-mono">{shortHash(donation.transactionId)}</p>
                            <p className="finance-cell-subtitle">Linked payment reference</p>
                          </>
                        ) : (
                          <>
                            <p className="finance-cell-title">No transaction</p>
                            <p className="finance-cell-subtitle">Reference not available</p>
                          </>
                        )}
                      </td>
                      <td>
                        <p className="finance-cell-title">{fmtDate(donation.createdAt)}</p>
                        <p className="finance-cell-subtitle">Open details</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="finance-pagination">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </button>
            </div>
          )}
        </>
      )}

      <div className={`finance-drawer${selectedDonation ? " is-open" : ""}`}>
        <div className="finance-drawer__backdrop" onClick={() => setSelectedDonation(null)} />
        <aside className="finance-drawer__panel">
          {selectedDonation && (
            <>
              <div className="finance-drawer__header">
                <div>
                  <p className="finance-drawer__eyebrow">Donation record</p>
                  <h2 className="finance-drawer__title">{fmt(selectedDonation.amount)}</h2>
                  <p className="finance-drawer__subtitle">{selectedDonation.campaignTitle ?? "Unknown campaign"}</p>
                </div>
                <button className="finance-drawer__close" onClick={() => setSelectedDonation(null)} aria-label="Close">
                  ×
                </button>
              </div>
              <div className="finance-drawer__body">
                <div className="finance-detail-grid">
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Status</p>
                    <p className="finance-detail-value">{selectedDonation.status}</p>
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Recorded at</p>
                    <p className="finance-detail-value">{fmtDateTime(selectedDonation.createdAt)}</p>
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Donor</p>
                    <div className="finance-identity">
                      <p className="finance-identity__title">
                        {selectedDonation.donorUsername ? (
                          <a
                            href={`${JUSTCAUSES_URL}/profile/${encodeURIComponent(selectedDonation.donorUsername)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {selectedDonation.donorName ?? selectedDonation.donorUsername}
                          </a>
                        ) : (
                          selectedDonation.donorName ?? "Unknown donor"
                        )}
                      </p>
                      <p className="finance-identity__meta">
                        {selectedDonation.isAnonymous
                          ? "Anonymous donation"
                          : selectedDonation.donorUsername
                            ? `@${selectedDonation.donorUsername}`
                            : "Named donation"}
                      </p>
                    </div>
                    {selectedDonation.profileId && (
                      <p className="finance-detail-note finance-detail-note--mono">{selectedDonation.profileId}</p>
                    )}
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Campaign</p>
                    <div className="finance-identity">
                      <p className="finance-identity__title">
                        <a
                          href={`${JUSTCAUSES_URL}/campaign/${selectedDonation.campaignId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedDonation.campaignTitle ?? "Unknown campaign"}
                        </a>
                      </p>
                      <p className="finance-identity__meta">OnlyJustCauses campaign</p>
                    </div>
                    <p className="finance-detail-note finance-detail-note--mono">{selectedDonation.campaignId}</p>
                  </div>
                  <div className="finance-detail-card finance-detail-card--full">
                    <p className="finance-detail-label">Donation ID</p>
                    <p className="finance-detail-value finance-cell-mono">{selectedDonation.donationId}</p>
                    <div className="finance-detail-actions">
                      <button className="finance-detail-action" onClick={() => copyValue(selectedDonation.donationId)}>
                        Copy donation ID
                      </button>
                    </div>
                  </div>
                  <div className="finance-detail-card finance-detail-card--full">
                    <p className="finance-detail-label">Transaction reference</p>
                    <p className="finance-detail-value finance-cell-mono">
                      {selectedDonation.transactionId ? shortHash(selectedDonation.transactionId) : "No transaction reference stored"}
                    </p>
                    <p className="finance-detail-note">
                      {selectedDonation.transactionId
                        ? "Internal payment reference linked to this donation record."
                        : "This donation does not currently include a stored payment reference."}
                    </p>
                    {selectedDonation.transactionId && (
                      <>
                        <p className="finance-detail-note finance-detail-note--mono">{selectedDonation.transactionId}</p>
                        <div className="finance-detail-actions">
                          <button className="finance-detail-action" onClick={() => copyValue(selectedDonation.transactionId!)}>
                            Copy transaction reference
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
