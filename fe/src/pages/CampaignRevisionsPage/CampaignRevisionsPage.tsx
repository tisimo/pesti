import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useClampPageToTotal } from "@/shared/hooks/useClampPageToTotal";
import CampaignRevisionQueue from "./CampaignRevisionQueue";
import {
  listCampaignRevisionThreads,
  type CampaignRevisionThreadPage,
  type CampaignRevisionThreadStatus,
  type CampaignRevisionThreadType,
} from "./campaignRevisions.api";
import "./campaignRevisions.css";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: CampaignRevisionThreadStatus | ""; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "", label: "All statuses" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const TYPE_OPTIONS: Array<{ value: CampaignRevisionThreadType | ""; label: string }> = [
  { value: "", label: "All thread types" },
  { value: "initial_approval", label: "Initial approval" },
  { value: "live_update", label: "Live update" },
];

export default function CampaignRevisionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaignId, setCampaignId] = useState(searchParams.get("campaignId") || "");
  const [status, setStatus] = useState<CampaignRevisionThreadStatus | "">(
    (searchParams.get("status") as CampaignRevisionThreadStatus | "") ||
      (searchParams.get("campaignId") ? "" : "pending"),
  );
  const [type, setType] = useState<CampaignRevisionThreadType | "">(
    (searchParams.get("type") as CampaignRevisionThreadType | "") || "",
  );
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [inputValue, setInputValue] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1));
  const [threadPage, setThreadPage] = useState<CampaignRevisionThreadPage | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (campaignId) params.set("campaignId", campaignId);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (search.trim()) params.set("search", search.trim());
    if (page > 1) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [campaignId, page, search, setSearchParams, status, type]);

  useEffect(() => {
    setLoadingList(true);
    setError(null);

    void listCampaignRevisionThreads({
      status,
      type,
      campaignId: campaignId || undefined,
      search,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        setThreadPage(result);
      })
      .catch(() => {
        setThreadPage(null);
        setError("Failed to load campaign revision threads.");
      })
      .finally(() => setLoadingList(false));
  }, [campaignId, page, search, status, type]);

  function handleSearchInput(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 350);
  }

  function handleOpenThread(threadId: string) {
    const params = new URLSearchParams();
    if (campaignId) params.set("campaignId", campaignId);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (search.trim()) params.set("search", search.trim());
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    navigate(`/ojc/campaign-revisions/${threadId}${query ? `?${query}` : ""}`);
  }

  const totalPages = Math.max(1, Math.ceil((threadPage?.total ?? 0) / PAGE_SIZE));
  useClampPageToTotal({ page, totalPages, setPage, disabled: loadingList || !threadPage });

  return (
    <>
      <div className="admin-page-header">
        <h1>Campaign Revisions</h1>
        <p>
          Review initial approvals and proposed live updates, then open a dedicated revision page to inspect the full diff.
        </p>
      </div>

      {error && <div className="campaign-revisions__error">{error}</div>}

      <div className="campaign-revisions__toolbar">
        <div className="campaign-revisions__search">
          <i className="bi bi-search" />
          <input
            type="text"
            placeholder="Search campaign or creator"
            value={inputValue}
            onChange={(event) => handleSearchInput(event.target.value)}
          />
        </div>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as CampaignRevisionThreadStatus | "");
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={type}
          onChange={(event) => {
            setType(event.target.value as CampaignRevisionThreadType | "");
            setPage(1);
          }}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="campaign-revisions__toolbar-total">
          {threadPage?.total ?? 0} thread{threadPage?.total === 1 ? "" : "s"}
        </div>
      </div>

      {campaignId && (
        <div className="campaign-revisions__active-filter">
          <span>Showing revision threads for the selected campaign.</span>
          <button
            type="button"
            onClick={() => {
              setCampaignId("");
              setPage(1);
            }}
          >
            Clear campaign filter
          </button>
        </div>
      )}

      <div className="campaign-revisions__list-shell">
        <CampaignRevisionQueue
          items={threadPage?.items ?? []}
          loading={loadingList}
          onOpen={handleOpenThread}
        />

        {threadPage && threadPage.total > PAGE_SIZE && (
          <div className="campaign-revisions__pagination">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
