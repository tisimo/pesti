import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiBackoffice } from "@/shared/lib/axios";
import { useClampPageToTotal } from "@/shared/hooks/useClampPageToTotal";
import "@/pages/FinancePages/financePages.css";

interface AdminWithdrawal {
  withdrawalId: string;
  walletAddress: string;
  amount: number;
  amountFiat: number;
  currency: string;
  provider: string;
  method: string;
  application: string;
  txHash: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
  accountId: string | null;
  email: string | null;
  profileId: string | null;
  username: string | null;
  displayName: string | null;
}

interface WithdrawalsPageData {
  withdrawals: AdminWithdrawal[];
  total: number;
  summary: {
    totalAmountFiat: number;
    pendingCount: number;
    completedCount: number;
    failedCount: number;
  };
  overall: {
    total: number;
    summary: {
      totalAmountFiat: number;
      pendingCount: number;
      completedCount: number;
      failedCount: number;
    };
  };
}

import { JUSTCAUSES_URL } from "@/shared/config/env";

const PAGE_SIZE = 20;
const BASESCAN_URL = "https://basescan.org";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: "Pending", bg: "#fff7ed", color: "#c2410c" },
  COMPLETED: { label: "Completed", bg: "#f0fdf4", color: "#15803d" },
  FAILED: { label: "Failed", bg: "#fff1f2", color: "#be123c" },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCrypto(amount: number, currency: string) {
  return `${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${currency}`;
}

function formatFiat(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "USD" }).format(amount);
}

function shortAddress(addr: string) {
  if (addr.length <= 18) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function shortHash(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 12)}...`;
}

async function copyValue(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Ignore clipboard failures in older browsers.
  }
}

export default function WithdrawalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<WithdrawalsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<AdminWithdrawal | null>(null);
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1));
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [inputValue, setInputValue] = useState(searchParams.get("search") || "");
  const [onlyJustCauses, setOnlyJustCauses] = useState(searchParams.get("onlyJustCauses") === "true");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());
    if (onlyJustCauses) params.set("onlyJustCauses", "true");
    if (page > 1) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [statusFilter, search, onlyJustCauses, page, setSearchParams]);

  useEffect(() => {
    setLoading(true);
    apiBackoffice
      .get<WithdrawalsPageData>("/ojc/withdrawals", {
        params: {
          status: statusFilter || undefined,
          search: search || undefined,
          onlyJustCauses: onlyJustCauses ? "true" : undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [statusFilter, search, onlyJustCauses, page]);

  function handleInput(val: string) {
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  useClampPageToTotal({ page, totalPages, setPage, disabled: loading || !data });

  return (
    <div className="finance-page">
      <div className="finance-page__header">
        <h1>Withdrawals</h1>
        <p>Review creator payout requests, wallet destinations, and processing outcomes across the shared settlement layer.</p>
      </div>

      <div className="finance-stats">
        <div className="finance-stat">
          <p className="finance-stat__label">Total requests</p>
          <p className="finance-stat__value">{data?.overall.total ?? 0}</p>
          <p className="finance-stat__note">All withdrawals</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Successful</p>
          <p className="finance-stat__value">{data?.overall.summary.completedCount ?? 0}</p>
          <p className="finance-stat__note">Completed withdrawal records</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Pending</p>
          <p className="finance-stat__value">{data?.overall.summary.pendingCount ?? 0}</p>
          <p className="finance-stat__note">Awaiting payout handling</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Failed</p>
          <p className="finance-stat__value">{data?.overall.summary.failedCount ?? 0}</p>
          <p className="finance-stat__note">Did not complete</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Completed withdrawn</p>
          <p className="finance-stat__value">{formatFiat(data?.overall.summary.totalAmountFiat ?? 0)}</p>
          <p className="finance-stat__note">Completed withdrawals only</p>
        </div>
      </div>

      <div className="finance-toolbar">
        <input
          className="finance-toolbar__search"
          type="text"
          placeholder="Search creator email, wallet, or tx hash..."
          value={inputValue}
          onChange={(e) => handleInput(e.target.value)}
        />
        <select
          className="finance-toolbar__select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </select>
        <label className="finance-toolbar__checkbox">
          <input
            type="checkbox"
            checked={onlyJustCauses}
            onChange={(event) => {
              setOnlyJustCauses(event.target.checked);
              setPage(1);
            }}
          />
          OnlyJustCauses only
        </label>
        <div className="finance-toolbar__meta">
          <span className="finance-toolbar__count">
            {data ? `${data.total.toLocaleString()} withdrawal${data.total !== 1 ? "s" : ""}` : "0 withdrawals"}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="finance-empty">Loading...</div>
      ) : !data || data.withdrawals.length === 0 ? (
        <div className="finance-empty">No withdrawals found.</div>
      ) : (
        <>
          <div className="finance-surface">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Wallet</th>
                  <th>Amount</th>
                  <th>Provider</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.withdrawals.map((withdrawal) => {
                  const statusCfg = STATUS_CONFIG[withdrawal.status];
                  return (
                    <tr key={withdrawal.withdrawalId} onClick={() => setSelectedWithdrawal(withdrawal)}>
                      <td>
                        {withdrawal.username ? (
                          <a
                            href={`${JUSTCAUSES_URL}/profile/${encodeURIComponent(withdrawal.username)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            style={{ color: "#0f172a", textDecoration: "none", fontWeight: 700 }}
                          >
                            {withdrawal.displayName ?? withdrawal.username}
                          </a>
                        ) : (
                          <p className="finance-cell-title">{withdrawal.displayName ?? withdrawal.email ?? "No linked creator"}</p>
                        )}
                        <p className="finance-cell-subtitle">{withdrawal.accountId ?? "Wallet-only withdrawal request"}</p>
                      </td>
                      <td>
                        <p className="finance-cell-title finance-cell-mono">{shortAddress(withdrawal.walletAddress)}</p>
                        <p className="finance-cell-subtitle">
                          {withdrawal.txHash ? `${shortHash(withdrawal.txHash)}` : "No payout hash yet"}
                        </p>
                      </td>
                      <td>
                        <div className="finance-amount">{formatCrypto(withdrawal.amount, withdrawal.currency)}</div>
                      </td>
                      <td>
                        <p className="finance-cell-title">{withdrawal.provider}</p>
                        <p className="finance-cell-subtitle">{withdrawal.method || withdrawal.application}</p>
                      </td>
                      <td>
                        <p className="finance-cell-title">{formatDate(withdrawal.createdAt)}</p>
                        <p className="finance-cell-subtitle">Open details</p>
                      </td>
                      <td>
                        <span className="finance-badge" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="finance-pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}

      <div className={`finance-drawer${selectedWithdrawal ? " is-open" : ""}`}>
        <div className="finance-drawer__backdrop" onClick={() => setSelectedWithdrawal(null)} />
        <aside className="finance-drawer__panel">
          {selectedWithdrawal && (
            <>
              <div className="finance-drawer__header">
                <div>
                  <p className="finance-drawer__eyebrow">Withdrawal request</p>
                  <h2 className="finance-drawer__title">{formatCrypto(selectedWithdrawal.amount, selectedWithdrawal.currency)}</h2>
                  <p className="finance-drawer__subtitle">{selectedWithdrawal.email ?? "Wallet-only payout request"}</p>
                </div>
                <button className="finance-drawer__close" onClick={() => setSelectedWithdrawal(null)} aria-label="Close">
                  x
                </button>
              </div>
              <div className="finance-drawer__body">
                <div className="finance-detail-grid">
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Status</p>
                    <p className="finance-detail-value">{selectedWithdrawal.status}</p>
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Requested at</p>
                    <p className="finance-detail-value">{formatDateTime(selectedWithdrawal.createdAt)}</p>
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Provider</p>
                    <p className="finance-detail-value">{selectedWithdrawal.provider}</p>
                    <p className="finance-detail-note">{selectedWithdrawal.method || selectedWithdrawal.application}</p>
                  </div>
                  <div className="finance-detail-card finance-detail-card--full">
                    <p className="finance-detail-label">Destination wallet</p>
                    <p className="finance-detail-value finance-cell-mono">{shortAddress(selectedWithdrawal.walletAddress)}</p>
                    <p className="finance-detail-note">Creator payout destination</p>
                    <p className="finance-detail-note finance-detail-note--mono">{selectedWithdrawal.walletAddress}</p>
                    <div className="finance-detail-actions">
                      <button className="finance-detail-action" onClick={() => copyValue(selectedWithdrawal.walletAddress)}>
                        Copy wallet
                      </button>
                      <a
                        className="finance-detail-action finance-detail-action--subtle"
                        href={`${BASESCAN_URL}/address/${selectedWithdrawal.walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View wallet on BaseScan
                      </a>
                    </div>
                  </div>
                  <div className="finance-detail-card finance-detail-card--full">
                    <p className="finance-detail-label">Payout transaction hash</p>
                    <p className="finance-detail-value finance-cell-mono">
                      {selectedWithdrawal.txHash ? shortHash(selectedWithdrawal.txHash) : "No payout transaction hash recorded"}
                    </p>
                    <p className="finance-detail-note">
                      {selectedWithdrawal.txHash
                        ? "Settlement transaction recorded for this payout."
                        : "This withdrawal has not been linked to a settlement transaction yet."}
                    </p>
                    {selectedWithdrawal.txHash && (
                      <>
                        <p className="finance-detail-note finance-detail-note--mono">{selectedWithdrawal.txHash}</p>
                        <div className="finance-detail-actions">
                          <button className="finance-detail-action" onClick={() => copyValue(selectedWithdrawal.txHash!)}>
                            Copy hash
                          </button>
                          <a
                            className="finance-detail-action"
                            href={`${BASESCAN_URL}/tx/${selectedWithdrawal.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View tx on BaseScan
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="finance-detail-card finance-detail-card--full">
                    <p className="finance-detail-label">Creator account</p>
                    <div className="finance-identity">
                      <p className="finance-identity__title">
                        {selectedWithdrawal.username ? (
                          <a
                            href={`${JUSTCAUSES_URL}/profile/${encodeURIComponent(selectedWithdrawal.username)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {selectedWithdrawal.displayName ?? selectedWithdrawal.username}
                          </a>
                        ) : (
                          selectedWithdrawal.displayName ?? selectedWithdrawal.email ?? "No linked creator"
                        )}
                      </p>
                      <p className="finance-identity__meta">
                        {selectedWithdrawal.username
                          ? `@${selectedWithdrawal.username}`
                          : selectedWithdrawal.email ?? "No linked email"}
                      </p>
                    </div>
                    <p className="finance-detail-note finance-detail-note--mono">
                      {selectedWithdrawal.accountId ?? "No linked account ID"} •{" "}
                      {selectedWithdrawal.profileId ?? "No linked profile ID"}
                    </p>
                  </div>
                  <div className="finance-detail-card finance-detail-card--full">
                    <p className="finance-detail-label">Withdrawal ID</p>
                    <p className="finance-detail-value finance-cell-mono">{selectedWithdrawal.withdrawalId}</p>
                    <div className="finance-detail-actions">
                      <button className="finance-detail-action" onClick={() => copyValue(selectedWithdrawal.withdrawalId)}>
                        Copy withdrawal ID
                      </button>
                    </div>
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
