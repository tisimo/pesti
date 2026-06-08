import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { JUSTCAUSES_URL } from "@/shared/config/env";
import { useClampPageToTotal } from "@/shared/hooks/useClampPageToTotal";
import { apiBackoffice } from "@/shared/lib/axios";
import "@/pages/FinancePages/financePages.css";

interface AdminDeposit {
  depositId: string;
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

interface DepositsPageData {
  deposits: AdminDeposit[];
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
    // Clipboard can be unavailable in restricted browser contexts.
  }
}

export default function DepositsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<DepositsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState<AdminDeposit | null>(null);
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
      .get<DepositsPageData>("/ojc/deposits", {
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

  function handleInput(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 400);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  useClampPageToTotal({ page, totalPages, setPage, disabled: loading || !data });

  return (
    <div className="finance-page">
      <div className="finance-page__header">
        <h1>Deposits</h1>
        <p>Review account funding deposits, source wallets, provider details, and processing outcomes across the shared settlement layer.</p>
      </div>

      <div className="finance-stats">
        <div className="finance-stat">
          <p className="finance-stat__label">Total deposits</p>
          <p className="finance-stat__value">{data?.overall.total ?? 0}</p>
          <p className="finance-stat__note">All account funding events</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Successful</p>
          <p className="finance-stat__value">{data?.overall.summary.completedCount ?? 0}</p>
          <p className="finance-stat__note">Completed deposit records</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Pending</p>
          <p className="finance-stat__value">{data?.overall.summary.pendingCount ?? 0}</p>
          <p className="finance-stat__note">Awaiting confirmation</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Failed</p>
          <p className="finance-stat__value">{data?.overall.summary.failedCount ?? 0}</p>
          <p className="finance-stat__note">Did not complete</p>
        </div>
        <div className="finance-stat">
          <p className="finance-stat__label">Completed deposited</p>
          <p className="finance-stat__value">{formatFiat(data?.overall.summary.totalAmountFiat ?? 0)}</p>
          <p className="finance-stat__note">Completed deposits only</p>
        </div>
      </div>

      <div className="finance-toolbar">
        <input
          className="finance-toolbar__search"
          type="text"
          placeholder="Search account email, wallet, tx hash, or app..."
          value={inputValue}
          onChange={(event) => handleInput(event.target.value)}
        />
        <select
          className="finance-toolbar__select"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
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
            {data ? `${data.total.toLocaleString()} deposit${data.total !== 1 ? "s" : ""}` : "0 deposits"}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="finance-empty">Loading...</div>
      ) : !data || data.deposits.length === 0 ? (
        <div className="finance-empty">No deposits found.</div>
      ) : (
        <>
          <div className="finance-surface">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Source wallet</th>
                  <th>Amount</th>
                  <th>Provider</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.deposits.map((deposit) => {
                  const statusCfg = STATUS_CONFIG[deposit.status];
                  return (
                    <tr key={deposit.depositId} onClick={() => setSelectedDeposit(deposit)}>
                      <td>
                        {deposit.username ? (
                          <a
                            href={`${JUSTCAUSES_URL}/profile/${encodeURIComponent(deposit.username)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            style={{ color: "#0f172a", textDecoration: "none", fontWeight: 700 }}
                          >
                            {deposit.displayName ?? deposit.username}
                          </a>
                        ) : (
                          <p className="finance-cell-title">{deposit.displayName ?? deposit.email ?? "No linked account"}</p>
                        )}
                        <p className="finance-cell-subtitle">{deposit.accountId ?? "Wallet-only deposit"}</p>
                      </td>
                      <td>
                        <p className="finance-cell-title finance-cell-mono">{shortAddress(deposit.walletAddress)}</p>
                        <p className="finance-cell-subtitle">
                          {deposit.txHash ? `Tx ${shortHash(deposit.txHash)}` : "No deposit hash yet"}
                        </p>
                      </td>
                      <td>
                        <div className="finance-amount">{formatCrypto(deposit.amount, deposit.currency)}</div>
                        <p className="finance-cell-subtitle">
                          {deposit.amountFiat > 0 ? formatFiat(deposit.amountFiat) : "No fiat conversion stored"}
                        </p>
                      </td>
                      <td>
                        <p className="finance-cell-title">{deposit.provider}</p>
                        <p className="finance-cell-subtitle">{deposit.method || deposit.application}</p>
                      </td>
                      <td>
                        <p className="finance-cell-title">{formatDate(deposit.createdAt)}</p>
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

      <div className={`finance-drawer${selectedDeposit ? " is-open" : ""}`}>
        <div className="finance-drawer__backdrop" onClick={() => setSelectedDeposit(null)} />
        <aside className="finance-drawer__panel">
          {selectedDeposit && (
            <>
              <div className="finance-drawer__header">
                <div>
                  <p className="finance-drawer__eyebrow">Deposit</p>
                  <h2 className="finance-drawer__title">{formatCrypto(selectedDeposit.amount, selectedDeposit.currency)}</h2>
                  <p className="finance-drawer__subtitle">{selectedDeposit.email ?? "Wallet-only deposit"}</p>
                </div>
                <button className="finance-drawer__close" onClick={() => setSelectedDeposit(null)} aria-label="Close">
                  x
                </button>
              </div>
              <div className="finance-drawer__body">
                <div className="finance-detail-grid">
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Status</p>
                    <p className="finance-detail-value">{selectedDeposit.status}</p>
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Received at</p>
                    <p className="finance-detail-value">{formatDateTime(selectedDeposit.createdAt)}</p>
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Fiat value</p>
                    <p className="finance-detail-value">
                      {selectedDeposit.amountFiat > 0 ? formatFiat(selectedDeposit.amountFiat) : "No fiat value stored"}
                    </p>
                  </div>
                  <div className="finance-detail-card">
                    <p className="finance-detail-label">Provider</p>
                    <p className="finance-detail-value">{selectedDeposit.provider}</p>
                    <p className="finance-detail-note">{selectedDeposit.method || selectedDeposit.application}</p>
                  </div>
                  <div className="finance-detail-card finance-detail-card--full">
                    <p className="finance-detail-label">Source wallet</p>
                    <p className="finance-detail-value finance-cell-mono">{shortAddress(selectedDeposit.walletAddress)}</p>
                    <p className="finance-detail-note">Wallet linked to this funding event.</p>
                    <p className="finance-detail-note finance-detail-note--mono">{selectedDeposit.walletAddress}</p>
                    <div className="finance-detail-actions">
                      <button className="finance-detail-action" onClick={() => copyValue(selectedDeposit.walletAddress)}>
                        Copy wallet
                      </button>
                      <a
                        className="finance-detail-action finance-detail-action--subtle"
                        href={`${BASESCAN_URL}/address/${selectedDeposit.walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View wallet on BaseScan
                      </a>
                    </div>
                  </div>
                  <div className="finance-detail-card finance-detail-card--full">
                    <p className="finance-detail-label">Deposit transaction hash</p>
                    <p className="finance-detail-value finance-cell-mono">
                      {selectedDeposit.txHash ? shortHash(selectedDeposit.txHash) : "No deposit transaction hash recorded"}
                    </p>
                    <p className="finance-detail-note">
                      {selectedDeposit.txHash
                        ? "Funding transaction recorded for this deposit."
                        : "This deposit has not been linked to an on-chain transaction yet."}
                    </p>
                    {selectedDeposit.txHash && (
                      <>
                        <p className="finance-detail-note finance-detail-note--mono">{selectedDeposit.txHash}</p>
                        <div className="finance-detail-actions">
                          <button className="finance-detail-action" onClick={() => copyValue(selectedDeposit.txHash!)}>
                            Copy hash
                          </button>
                          <a
                            className="finance-detail-action"
                            href={`${BASESCAN_URL}/tx/${selectedDeposit.txHash}`}
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
                    <p className="finance-detail-label">Account</p>
                    <div className="finance-identity">
                      <p className="finance-identity__title">
                        {selectedDeposit.username ? (
                          <a
                            href={`${JUSTCAUSES_URL}/profile/${encodeURIComponent(selectedDeposit.username)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {selectedDeposit.displayName ?? selectedDeposit.username}
                          </a>
                        ) : (
                          selectedDeposit.displayName ?? selectedDeposit.email ?? "No linked account"
                        )}
                      </p>
                      <p className="finance-identity__meta">
                        {selectedDeposit.username ? `@${selectedDeposit.username}` : selectedDeposit.email ?? "No linked email"}
                      </p>
                    </div>
                    <p className="finance-detail-note finance-detail-note--mono">
                      {selectedDeposit.accountId ?? "No linked account ID"} / {selectedDeposit.profileId ?? "No linked profile ID"}
                    </p>
                  </div>
                  <div className="finance-detail-card finance-detail-card--full">
                    <p className="finance-detail-label">Deposit ID</p>
                    <p className="finance-detail-value finance-cell-mono">{selectedDeposit.depositId}</p>
                    <div className="finance-detail-actions">
                      <button className="finance-detail-action" onClick={() => copyValue(selectedDeposit.depositId)}>
                        Copy deposit ID
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
