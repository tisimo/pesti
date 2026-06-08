import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import CampaignRevisionDetail from "./CampaignRevisionDetail";
import {
  approveCampaignRevisionThread,
  getCampaignRevisionThread,
  listCampaignRevisionCategories,
  rejectCampaignRevisionThread,
  requestCampaignRevisionChanges,
  type CampaignRevisionThreadDetail,
  type CategoryOption,
} from "./campaignRevisions.api";
import "./campaignRevisions.css";

export default function CampaignRevisionDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { threadId = "" } = useParams();
  const [detail, setDetail] = useState<CampaignRevisionThreadDetail | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    void Promise.all([
      getCampaignRevisionThread(threadId),
      listCampaignRevisionCategories().catch(() => []),
    ])
      .then(([threadDetail, categoryOptions]) => {
        setDetail(threadDetail);
        setCategories(categoryOptions);
      })
      .catch(() => {
        setDetail(null);
        setError("Failed to load the selected revision thread.");
      })
      .finally(() => setLoading(false));
  }, [threadId]);

  async function refreshDetail(successMessage?: string) {
    const nextDetail = await getCampaignRevisionThread(threadId);
    setDetail(nextDetail);

    if (successMessage) {
      setFlash(successMessage);
      window.setTimeout(() => setFlash(null), 3000);
    }
  }

  async function handleApprove(currentThreadId: string, message?: string) {
    setActing(true);
    setError(null);

    try {
      await approveCampaignRevisionThread(currentThreadId, message);
      await refreshDetail("Revision approved.");
    } catch {
      setError("Failed to approve the revision thread.");
    } finally {
      setActing(false);
    }
  }

  async function handleRequestChanges(currentThreadId: string, message: string) {
    setActing(true);
    setError(null);

    try {
      await requestCampaignRevisionChanges(currentThreadId, message);
      await refreshDetail("Changes requested.");
    } catch {
      setError("Failed to request changes for the revision thread.");
    } finally {
      setActing(false);
    }
  }

  async function handleReject(currentThreadId: string, message: string) {
    setActing(true);
    setError(null);

    try {
      await rejectCampaignRevisionThread(currentThreadId, message);
      await refreshDetail("Revision rejected.");
    } catch {
      setError("Failed to reject the revision thread.");
    } finally {
      setActing(false);
    }
  }

  return (
    <>
      <div className="admin-page-header">
        <div className="campaign-revisions__header-actions">
          <button
            type="button"
            className="campaign-revisions__back-button"
            onClick={() => navigate(`/ojc/campaign-revisions${location.search}`)}
          >
            <i className="bi bi-arrow-left" />
            Back to revision queue
          </button>
        </div>
        <h1>Revision Review</h1>
        <p>
          Inspect the full revision history and field-level differences for the selected campaign submission.
        </p>
      </div>

      {flash && <div className="campaign-revisions__flash">{flash}</div>}
      {error && <div className="campaign-revisions__error">{error}</div>}

      <CampaignRevisionDetail
        detail={detail}
        categories={categories}
        loading={loading}
        acting={acting}
        onApprove={handleApprove}
        onRequestChanges={handleRequestChanges}
        onReject={handleReject}
      />
    </>
  );
}
