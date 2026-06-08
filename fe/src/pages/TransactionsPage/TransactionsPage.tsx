import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiBackoffice } from "@/shared/lib/axios";
import { useClampPageToTotal } from "@/shared/hooks/useClampPageToTotal";
import "@/pages/FinancePages/financePages.css";

type TransactionType = "DONATION" | "TIP" | "WITHDRAWAL" | "TRANSFER" | "UNKNOWN";

interface Transaction {
  transactionId: string;
  txHash: string;
  senderAddress: string;
  receiverAddress: string;
  type: TransactionType;
  amount: number;
  fiatAmount: number;
  donationAmount: number;
  linkedDonationAmount: number | null;
  tipAmount: number;
  currency: string;
  token: string;
  commission: number;
  createdAt: string;
  campaignId: string | null;
  campaignTitle: string | null;
  donorName: string | null;
  donorUsername: string | null;
  donorProfileId: string | null;
  donationStatus: "COMPLETED" | "PENDING" | "FAILED" | null;
}

interface TransactionsPageData {
  transactions: Transaction[];
  total: number;
  summary: {
    totalMoved: number;
    completedCount: number;
    pendingCount: number;
    failedCount: number;
    donationCount: number;
    tipCount: number;
    withdrawalCount: number;
    transferCount: number;
  };
  overall: {
    total: number;
    summary: {
      totalMoved: number;
      completedCount: number;
      pendingCount: number;
      failedCount: number;
      donationCount: number;
      tipCount: number;
      withdrawalCount: number;
      transferCount: number;
    };
  };
}

const PAGE_SIZE = 20;
import { JUSTCAUSES_URL } from "@/shared/config/env";
const BASESCAN_URL = "https://basescan.org";
const TRANSACTION_TYPE_FILTERS = ["DONATION", "TIP"] as const;

const TYPE_BADGE: Record<TransactionType, { label: string; bg: string; color: string }> = {
  DONATION: { label: "Donation", bg: "#eff6ff", color: "#1d4ed8" },
  TIP: { label: "Tip", bg: "#f5f3ff", color: "#6d28d9" },
  WITHDRAWAL: { label: "Withdrawal", bg: "#fff7ed", color: "#c2410c" },
  TRANSFER: { label: "Transfer", bg: "#f8fafc", color: "#475569" },
  UNKNOWN: { label: "Unknown", bg: "#f8fafc", color: "#64748b" },
};

const DONATION_STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  COMPLETED: { label: "Completed", bg: "#f0fdf4", color: "#15803d" },
  PENDING: { label: "Pending", bg: "#fffbeb", color: "#92400e" },
  FAILED: { label: "Failed", bg: "#fef2f2", color: "#b91c1c" },
};

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "USD" }).format(amount);
}

function getPlatformDonationAmount(tx: Transaction) {
  if (tx.type !== "DONATION") {
    return 0;
  }
  if (tx.linkedDonationAmount !== null && tx.linkedDonationAmount !== undefined) {
    return tx.linkedDonationAmount;
  }
  return tx.type === "DONATION" ? tx.donationAmount : 0;
}

function getPlatformTipAmount(tx: Transaction) {
  if (tx.tipAmount > 0) return tx.tipAmount;
  return tx.type === "TIP" ? tx.fiatAmount || tx.amount : 0;
}

function getPlatformTransactionAmount(tx: Transaction) {
  const platformTotal = getPlatformDonationAmount(tx) + getPlatformTipAmount(tx);
  return platformTotal || tx.fiatAmount || tx.amount;
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

function shortAddress(value: string) {
  return value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

async function copyValue(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Ignore clipboard failures in older browsers.
  }
}

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<TransactionsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1));
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [inputValue, setInputValue] = useState(searchParams.get("search") || "");
  const [typeFilter, setTypeFilter] = useState(() => {
    const requestedType = searchParams.get("type") || "";
    return TRANSACTION_TYPE_FILTERS.includes(requestedType as (typeof TRANSACTION_TYPE_FILTERS)[number])
      ? requestedType
      : "";
  });
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (page > 1) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [search, typeFilter, statusFilter, page, setSearchParams]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), pageSize: String(PAGE_SIZE) };
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    if (statusFilter) params.status = statusFilter;
    apiBackoffice
      .get<TransactionsPageData>("/ojc/transactions", { params })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, search, typeFilter, statusFilter]);

  function handleInput(val: string) {
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  }

  function handleType(val: string) {
    setTypeFilter(val);
    setPage(1);
  }

  function handleStatus(val: string) {
    setStatusFilter(val);
    setPage(1);
  }

  const total = data?.total ?? 0;
  const overall = data?.overall;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  useClampPageToTotal({ page, totalPages, setPage, disabled: loading || !data });

  return (
    <div className="finance-page">
      <div className="finance-page__header">
        <h1>Transactions</h1>
        <p>
          Internal donation and tip transactions, enriched with OnlyJustCauses campaign context where a match exists.
        </p>
      </div>

      <div className="finance-stats">
        <div className="finance-stat">
          <p className="finance-stat__label">Total entries</p>
          <p className="finance-stat__value">{overall?.total ?? 0}</p>
          <p className="finance-stat__note">All donation and tip transactions</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Successful</p>
          <p className="finance-stat__value">{overall?.summary.completedCount ?? 0}</p>
          <p className="finance-stat__note">Completed donations and standalone tips</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Pending</p>
          <p className="finance-stat__value">{overall?.summary.pendingCount ?? 0}</p>
          <p className="finance-stat__note">Linked to pending donations</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Failed</p>
          <p className="finance-stat__value">{overall?.summary.failedCount ?? 0}</p>
          <p className="finance-stat__note">Linked to failed donations</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Total moved</p>
          <p className="finance-stat__value">{fmtCurrency(overall?.summary.totalMoved ?? 0)}</p>
          <p className="finance-stat__note">Completed donation and tip value only</p>
        </div>
      </div>

      <div className="finance-toolbar">
        <input
          className="finance-toolbar__search"
          type="text"
          placeholder="Search tx hash or wallet..."
          value={inputValue}
          onChange={(e) => handleInput(e.target.value)}
        />
        <select className="finance-toolbar__select" value={typeFilter} onChange={(e) => handleType(e.target.value)}>
          <option value="">All types</option>
          <option value="DONATION">Donation</option>
          <option value="TIP">Tip</option>
        </select>
        <select className="finance-toolbar__select" value={statusFilter} onChange={(e) => handleStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
        <div className="finance-toolbar__meta">
          <span className="finance-toolbar__count">{total} transaction{total !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {loading ? (
        <div className="finance-empty">Loading...</div>
      ) : !data || data.transactions.length === 0 ? (
        <div className="finance-empty">No transactions found.</div>
      ) : (
        <>
          <div className="finance-surface">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Platform amount</th>
                  <th>Linked OJC context</th>
                  <th>Wallet flow</th>
                  <th>Hash</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx) => {
                  const typeBadge = TYPE_BADGE[tx.type] ?? TYPE_BADGE.UNKNOWN;
                  const donationBadge = tx.donationStatus ? DONATION_STATUS_BADGE[tx.donationStatus] : null;
                  const platformDonationAmount = getPlatformDonationAmount(tx);
                  const platformTipAmount = getPlatformTipAmount(tx);
                  return (
                    <tr key={tx.transactionId} onClick={() => setSelectedTransaction(tx)}>
                      <td>
                        <div className="finance-badge-stack">
                          <span className="finance-badge" style={{ background: typeBadge.bg, color: typeBadge.color }}>
                            {typeBadge.label}
                          </span>
                          {donationBadge && (
                            <span className="finance-badge" style={{ background: donationBadge.bg, color: donationBadge.color }}>
                              {donationBadge.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="finance-amount">{fmtCurrency(getPlatformTransactionAmount(tx))}</div>
                        <p className="finance-cell-subtitle">
                          Donation {fmtCurrency(platformDonationAmount)} • Tip {fmtCurrency(platformTipAmount)}
                        </p>
                      </td>
                      <td>
                        {tx.campaignId ? (
                          <a
                            href={`${JUSTCAUSES_URL}/campaign/${tx.campaignId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            style={{ color: "#0f172a", textDecoration: "none", fontWeight: 700 }}
                          >
                            {tx.campaignTitle ?? "Unknown campaign"}
                          </a>
                        ) : (
                          <p className="finance-cell-title">{tx.campaignTitle ?? "Not linked to an OJC donation"}</p>
                        )}
                        <p className="finance-cell-subtitle">
                          {tx.donorUsername ? (
                            <a
                              href={`${JUSTCAUSES_URL}/profile/${encodeURIComponent(tx.donorUsername)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              style={{ color: "#64748b", textDecoration: "none" }}
                            >
                              {tx.donorName ?? tx.donorUsername}
                            </a>
                          ) : (
                            tx.donorProfileId ?? tx.donorName ?? "No donor context available"
                          )}
                        </p>
                      </td>
                      <td>
                        <div className="finance-flow">
                          <span className="finance-cell-mono">{shortAddress(tx.senderAddress)}</span>
                          <span className="finance-flow__arrow">&darr;</span>
                          <span className="finance-cell-mono">{shortAddress(tx.receiverAddress)}</span>
                        </div>
                      </td>
                      <td>
                        <p className="finance-cell-title finance-cell-mono">{shortHash(tx.txHash)}</p>
                        <p className="finance-cell-subtitle">{tx.token}</p>
                      </td>
                      <td>
                        <p className="finance-cell-title">{fmtDate(tx.createdAt)}</p>
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
              <span>
                Page {page} of {totalPages}
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </button>
            </div>
          )}
        </>
      )}

      <div className={`finance-drawer${selectedTransaction ? " is-open" : ""}`}>
        <div className="finance-drawer__backdrop" onClick={() => setSelectedTransaction(null)} />
        <aside className="finance-drawer__panel">
          {selectedTransaction && (
            <>
              <div className="finance-drawer__header">
                <div>
                  <p className="finance-drawer__eyebrow">Ledger entry</p>
                  <h2 className="finance-drawer__title">{fmtCurrency(getPlatformTransactionAmount(selectedTransaction))}</h2>
                  <p className="finance-drawer__subtitle">
                    {selectedTransaction.type} • {selectedTransaction.token}
                  </p>
                </div>
                <button className="finance-drawer__close" onClick={() => setSelectedTransaction(null)} aria-label="Close">
                  x
                </button>
              </div>
              <div className="finance-drawer__body">
                <div className="finance-detail-grid">
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Transaction type</p>
                    <p className="finance-detail-value">{selectedTransaction.type}</p>
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Recorded at</p>
                    <p className="finance-detail-value">{fmtDateTime(selectedTransaction.createdAt)}</p>
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Donation amount</p>
                    <p className="finance-detail-value">{fmtCurrency(getPlatformDonationAmount(selectedTransaction))}</p>
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Tip amount</p>
                    <p className="finance-detail-value">{fmtCurrency(getPlatformTipAmount(selectedTransaction))}</p>
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Ledger fiat value</p>
                    <p className="finance-detail-value">{fmtCurrency(selectedTransaction.fiatAmount || selectedTransaction.amount)}</p>
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Commission</p>
                    <p className="finance-detail-value">{fmtCurrency(selectedTransaction.commission)}</p>
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Linked donation status</p>
                    <p className="finance-detail-value">{selectedTransaction.donationStatus ?? "No linked OJC donation"}</p>
                  </div>
                  <div className="finance-detail-card finance-detail-card--full">
                    <p className="finance-detail-label">Wallet flow</p>
                    <div className="finance-flow">
                      <div className="finance-flow__item">
                        <p className="finance-flow__label">Sender wallet</p>
                        <p className="finance-detail-value finance-cell-mono">{shortAddress(selectedTransaction.senderAddress)}</p>
                        <p className="finance-detail-note finance-detail-note--mono">{selectedTransaction.senderAddress}</p>
                        <div className="finance-detail-actions">
                          <button className="finance-detail-action" onClick={() => copyValue(selectedTransaction.senderAddress)}>
                            Copy sender
                          </button>
                          <a
                            className="finance-detail-action finance-detail-action--subtle"
                            href={`${BASESCAN_URL}/address/${selectedTransaction.senderAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View wallet on BaseScan
                          </a>
                        </div>
                      </div>
                      <span className="finance-flow__arrow">&darr;</span>
                      <div className="finance-flow__item">
                        <p className="finance-flow__label">Receiver wallet</p>
                        <p className="finance-detail-value finance-cell-mono">{shortAddress(selectedTransaction.receiverAddress)}</p>
                        <p className="finance-detail-note finance-detail-note--mono">{selectedTransaction.receiverAddress}</p>
                        <div className="finance-detail-actions">
                          <button className="finance-detail-action" onClick={() => copyValue(selectedTransaction.receiverAddress)}>
                            Copy receiver
                          </button>
                          <a
                            className="finance-detail-action finance-detail-action--subtle"
                            href={`${BASESCAN_URL}/address/${selectedTransaction.receiverAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View wallet on BaseScan
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="finance-detail-card finance-detail-card--full">
                    <p className="finance-detail-label">Transaction hash</p>
                    <p className="finance-detail-value finance-cell-mono">{shortHash(selectedTransaction.txHash)}</p>
                    <p className="finance-detail-note finance-detail-note--mono">{selectedTransaction.txHash}</p>
                    <div className="finance-detail-actions">
                      <button className="finance-detail-action" onClick={() => copyValue(selectedTransaction.txHash)}>
                        Copy hash
                      </button>
                      <a
                        className="finance-detail-action"
                        href={`${BASESCAN_URL}/tx/${selectedTransaction.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View tx on BaseScan
                      </a>
                    </div>
                  </div>
                  <div className="finance-detail-card finance-detail-card--full">
                    <p className="finance-detail-label">Transaction ID</p>
                    <p className="finance-detail-value finance-cell-mono">{selectedTransaction.transactionId}</p>
                    <div className="finance-detail-actions">
                      <button className="finance-detail-action" onClick={() => copyValue(selectedTransaction.transactionId)}>
                        Copy internal ID
                      </button>
                    </div>
                  </div>
                  <div className="finance-detail-card finance-detail-card--full">
                    <p className="finance-detail-label">OnlyJustCauses context</p>
                    <div className="finance-identity">
                      <p className="finance-identity__title">
                        {selectedTransaction.campaignId ? (
                          <a
                            href={`${JUSTCAUSES_URL}/campaign/${selectedTransaction.campaignId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {selectedTransaction.campaignTitle ?? "Unknown campaign"}
                          </a>
                        ) : (
                          selectedTransaction.campaignTitle ?? "Not linked to an OJC campaign"
                        )}
                      </p>
                      <p className="finance-identity__meta">
                        {selectedTransaction.donorUsername ? (
                          <a
                            href={`${JUSTCAUSES_URL}/profile/${encodeURIComponent(selectedTransaction.donorUsername)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#64748b", textDecoration: "none" }}
                          >
                            {selectedTransaction.donorName ?? `@${selectedTransaction.donorUsername}`}
                          </a>
                        ) : (
                          selectedTransaction.donorName ?? "No donor context available"
                        )}
                      </p>
                    </div>
                    <p className="finance-detail-note finance-detail-note--mono">
                      {selectedTransaction.campaignId ?? "No linked campaign ID"} •{" "}
                      {selectedTransaction.donorProfileId ?? "No linked donor profile ID"}
                    </p>
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
