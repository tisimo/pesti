import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { resolveEvidenceUrls } from "@/shared/lib/evidence";
import { useAnyPermission } from "@/shared/hooks/usePermission";
import {
  reportsDetailService,
  type AdminReport,
  type CampaignComment,
  type CampaignDetails,
  type CampaignDonation,
  type ReportAction,
  type ReportNote,
  type ReportStatus,
} from "./reportsDetail.api";
import {
  ACTION_CONFIG,
  REASON_LABELS,
  STATUS_CONFIG,
  applySuggestedDraft,
  actionSupportsStrike,
  createInitialDrafts,
  extractMediaUrls,
  formatDateTime,
  getCampaignStatusConfig,
  getCreatorImpactSummary,
  getDueMeta,
  getErrorMessage,
  getReporterName,
  setDraftStrikePreference,
  seedDraft,
  toNumber,
} from "./reportsDetail.model";
import { ReportsDetailCampaignContext } from "./ReportsDetailCampaignContext";
import { ReportsDetailHero } from "./ReportsDetailHero";
import { ConfirmationModal, EmptyState, LoadingState } from "./ReportsDetailModals";
import { ReportsDetailSidebar } from "./ReportsDetailSidebar";
import "./reportsDetail.css";

export default function ReportsDetailPage() {
  const navigate = useNavigate();
  const canModerateReports = useAnyPermission(["respond", "approve_reject", "block_suspend"]);
  const { reportId } = useParams();
  const location = useLocation();
  const reportFromState = (location.state as { report?: AdminReport } | null)?.report;

  const [reportState, setReportState] = useState<AdminReport | null>(reportFromState ?? null);
  const [reportLoading, setReportLoading] = useState(!reportFromState && Boolean(reportId));
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [notes, setNotes] = useState<ReportNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [activeEvidenceUrl, setActiveEvidenceUrl] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [statusSelection, setStatusSelection] = useState<ReportStatus>("OPEN");
  const [resolutionDraft, setResolutionDraft] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [selectedAction, setSelectedAction] = useState<ReportAction | null>(null);
  const [actionDrafts, setActionDrafts] = useState(createInitialDrafts);
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState(false);

  useEffect(() => {
    if (reportFromState) {
      setReportState(reportFromState);
      setReportLoading(false);
      return;
    }

    if (!reportId) {
      setReportLoading(false);
      setReportState(null);
      return;
    }

    const controller = new AbortController();
    setReportLoading(true);
    reportsDetailService
      .getReport(reportId, controller.signal)
      .then((item) => setReportState(item))
      .catch(() => {
        if (!controller.signal.aborted) setReportState(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setReportLoading(false);
      });

    return () => controller.abort();
  }, [reportFromState, reportId]);

  useEffect(() => {
    if (!reportState?.campaignId) {
      setCampaign(null);
      return;
    }

    const controller = new AbortController();
    setCampaignLoading(true);
    reportsDetailService
      .getCampaign(reportState.campaignId, controller.signal)
      .then((item) => setCampaign(item))
      .catch(() => {
        if (!controller.signal.aborted) setCampaign(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCampaignLoading(false);
      });

    return () => controller.abort();
  }, [reportState?.campaignId]);

  useEffect(() => {
    if (!reportState?.reportId) {
      setNotes([]);
      return;
    }

    const controller = new AbortController();
    setNotesLoading(true);
    reportsDetailService
      .getNotes(reportState.reportId, controller.signal)
      .then((items) => setNotes(items))
      .catch(() => {
        if (!controller.signal.aborted) setNotes([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setNotesLoading(false);
      });

    return () => controller.abort();
  }, [reportState?.reportId]);

  useEffect(() => {
    setStatusSelection(reportState?.status ?? "OPEN");
    setResolutionDraft(reportState?.resolutionNote ?? "");
  }, [reportState?.status, reportState?.resolutionNote]);

  const evidenceUrls = useMemo(
    () => resolveEvidenceUrls(reportState?.evidenceUrls, reportState?.evidence, reportState?.evidenceText),
    [reportState?.evidenceUrls, reportState?.evidence, reportState?.evidenceText],
  );
  const mediaUrls = useMemo(() => extractMediaUrls(campaign), [campaign]);
  const comments = useMemo(() => (Array.isArray(campaign?.comments) ? campaign.comments : []) as CampaignComment[], [campaign?.comments]);
  const donations = useMemo(() => (Array.isArray(campaign?.donations) ? campaign.donations : []) as CampaignDonation[], [campaign?.donations]);
  const dueMeta = useMemo(() => getDueMeta(reportState?.reviewDueAt), [reportState?.reviewDueAt]);

  if (reportLoading) return <LoadingState />;
  if (!reportState) return <EmptyState reportId={reportId} onBack={() => navigate("/ojc/reports")} />;

  const currentReport = reportState;
  const reporterName = getReporterName(currentReport);
  const reasonLabel = REASON_LABELS[currentReport.reason] ?? currentReport.reason;
  const reportStatusConfig = STATUS_CONFIG[currentReport.status];
  const campaignStatusConfig = getCampaignStatusConfig(campaign?.status);
  const story = campaign?.story ?? campaign?.description ?? campaign?.summary ?? "";
  const goalAmount = toNumber(campaign?.goalAmount ?? campaign?.goal_amount);
  const amountRaised = toNumber(campaign?.amountRaised ?? campaign?.amount_raised ?? campaign?.totals?.amountRaised ?? 0);
  const donorCount = toNumber(campaign?.donorCount ?? campaign?.donor_count ?? campaign?.totals?.donorCount ?? 0);
  const progress = goalAmount > 0 ? Math.min(100, (amountRaised / goalAmount) * 100) : 0;
  const statusDirty =
    statusSelection !== currentReport.status || resolutionDraft.trim() !== (currentReport.resolutionNote ?? "").trim();
  const campaignWorkflowState = (campaign as unknown as { workflow?: { approvalState?: string } | null })?.workflow?.approvalState;
  const campaignHasOpenLiveUpdate =
    campaignWorkflowState === "pending_new_version_approval" ||
    campaignWorkflowState === "changes_requested_new_version";
  const activeActionDraft = selectedAction ? actionDrafts[selectedAction] : null;
  const confirmationSummary = selectedAction && activeActionDraft
    ? activeActionDraft.resolutionNote.trim() || activeActionDraft.message.trim()
    : "";

  async function handleSaveStatus() {
    setUpdatingStatus(true);
    setStatusError("");
    const trimmedSummary = resolutionDraft.trim();

    try {
      await reportsDetailService.updateStatus(currentReport.reportId, {
        status: statusSelection,
        resolutionNote: trimmedSummary || undefined,
      });
      setReportState({ ...currentReport, status: statusSelection, resolutionNote: trimmedSummary || null });
    } catch (error) {
      setStatusError(getErrorMessage(error, "Failed to update report status."));
    } finally {
      setUpdatingStatus(false);
    }
  }

  function handleActionDraftChange<K extends keyof typeof actionDrafts.REJECT_REPORT>(
    action: ReportAction,
    key: K,
    value: (typeof actionDrafts.REJECT_REPORT)[K],
  ) {
    setActionDrafts((previous) => ({
      ...previous,
      [action]:
        key === "applyStrike"
          ? setDraftStrikePreference(action, previous[action], value as boolean)
          : {
              ...previous[action],
              [key]: value,
            },
    }));
  }

  function handleApplySuggestedDraft(action: ReportAction) {
    setActionDrafts((previous) => ({
      ...previous,
      [action]: applySuggestedDraft(action, previous[action]),
    }));
    setActionError("");
  }

  function handleReviewAction() {
    if (!selectedAction || !activeActionDraft) return;
    if (actionSupportsStrike(selectedAction) && activeActionDraft.applyStrike && (campaign?.creatorStrikeCount ?? 0) >= 3) {
      const creatorImpact = getCreatorImpactSummary(selectedAction, campaign?.creatorStrikeCount ?? null, true);
      setActionError(creatorImpact?.message ?? "This creator already has 3 strikes and cannot receive another strike.");
      return;
    }

    const summary = activeActionDraft.resolutionNote.trim() || activeActionDraft.message.trim();
    if (summary.length === 0 && ACTION_CONFIG[selectedAction].requiresResolution) {
      setActionError("An internal decision summary is required for this action.");
      return;
    }
    setActionError("");
    setConfirmingAction(true);
  }

  function handleSelectAction(action: ReportAction) {
    setActionDrafts((previous) => ({
      ...previous,
      [action]: seedDraft(action, previous[action]),
    }));
    setSelectedAction(action);
    setActionError("");
  }

  function handleCancelAction() {
    setSelectedAction(null);
    setActionError("");
    setConfirmingAction(false);
  }

  function handleCloseConfirmation() {
    setConfirmingAction(false);
  }

  async function handleConfirmAction() {
    if (!selectedAction || !activeActionDraft) return;
    const trimmedMessage = activeActionDraft.message.trim();
    const summary = activeActionDraft.resolutionNote.trim() || trimmedMessage;
    const selectedActionType = selectedAction;

    setActionBusy(true);
    setActionError("");
    try {
      await reportsDetailService.performAction(currentReport.reportId, {
        action: selectedActionType,
        message: trimmedMessage || undefined,
        resolve: activeActionDraft.resolve,
        applyStrike: activeActionDraft.applyStrike,
      });

      const nextStatus = activeActionDraft.resolve ? "RESOLVED" : currentReport.status;
      if (summary) {
        await reportsDetailService.updateStatus(currentReport.reportId, {
          status: nextStatus,
          resolutionNote: summary,
        });
      }

      setReportState({ ...currentReport, status: nextStatus, resolutionNote: summary || currentReport.resolutionNote });
      setStatusSelection(nextStatus);
      setResolutionDraft(summary || currentReport.resolutionNote || "");
      setSelectedAction(null);
      setConfirmingAction(false);

      if (currentReport.campaignId) {
        void reportsDetailService
          .getCampaign(currentReport.campaignId)
          .then((item) => setCampaign(item))
          .catch(() => {});
      }
    } catch (error) {
      setActionError(getErrorMessage(error, "Failed to perform action."));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSaveNote() {
    const trimmedNote = noteInput.trim();
    if (!trimmedNote) {
      setNoteError("Note cannot be empty.");
      return;
    }

    setNoteSaving(true);
    setNoteError("");
    try {
      await reportsDetailService.addNote(currentReport.reportId, trimmedNote);
      const items = await reportsDetailService.getNotes(currentReport.reportId);
      setNotes(items);
      setNoteInput("");
    } catch (error) {
      setNoteError(getErrorMessage(error, "Failed to save note."));
    } finally {
      setNoteSaving(false);
    }
  }

  return (
    <>
      <div className="report-detail">
        <ReportsDetailHero
          report={currentReport}
          campaignTitle={campaign?.title ?? currentReport.campaignTitle}
          reasonLabel={reasonLabel}
          evidenceCount={evidenceUrls.length}
          dueMeta={dueMeta}
          reportStatusConfig={reportStatusConfig}
          campaignStatusConfig={campaignStatusConfig}
          onBack={() => navigate("/ojc/reports")}
        />

        <div className="report-detail__layout">
          <div className="report-detail__main">
            <section className="report-detail__card">
              <div className="report-detail__card-header">
                <div>
                  <h3 className="report-detail__card-title">Reporter statement</h3>
                  <p className="report-detail__card-subtitle">
                    This is the main accusation and supporting evidence the moderator should evaluate first.
                  </p>
                </div>
              </div>

              <div className="report-detail__meta-grid">
                <div className="report-detail__meta-item">
                  <span>Reporter</span>
                  <span>{reporterName}</span>
                </div>
                <div className="report-detail__meta-item">
                  <span>Contact</span>
                  <span>{currentReport.reporterEmail ?? "No email provided"}</span>
                </div>
                <div className="report-detail__meta-item">
                  <span>Submitted</span>
                  <span>{formatDateTime(currentReport.createdAt)}</span>
                </div>
              </div>

              <div className="report-detail__section-stack" style={{ marginTop: 16 }}>
                <div className="report-detail__statement">
                  <p className="report-detail__statement-text">{currentReport.description || "No report comment provided."}</p>
                </div>

                <div>
                  <div className="report-detail__card-header" style={{ marginBottom: 12 }}>
                    <div>
                      <h4 className="report-detail__card-title" style={{ fontSize: 14 }}>
                        Evidence
                      </h4>
                      <p className="report-detail__card-subtitle">
                        Review uploaded proof and any extra reporter context before taking action.
                      </p>
                    </div>
                  </div>

                  {evidenceUrls.length > 0 ? (
                    <div className="report-detail__evidence-grid">
                      {evidenceUrls.map((url, index) => (
                        <button
                          key={`${url}-${index}`}
                          type="button"
                          className="report-detail__thumb-btn"
                          onClick={() => setActiveEvidenceUrl(url)}
                          aria-label={`Open evidence ${index + 1}`}
                        >
                          <img className="report-detail__thumb" src={url} alt={`Evidence ${index + 1}`} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="report-detail__callout">
                      {currentReport.evidenceText || currentReport.evidence || "No evidence provided."}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {!canModerateReports && currentReport.resolutionNote ? (
              <section className="report-detail__resolution">
                <p className="report-detail__resolution-title">Current decision summary</p>
                <p className="report-detail__resolution-text">{currentReport.resolutionNote}</p>
              </section>
            ) : null}

            <ReportsDetailCampaignContext
              campaign={campaign}
              campaignLoading={campaignLoading}
              mediaUrls={mediaUrls}
              activeImage={activeImage}
              onSelectImage={setActiveImage}
              story={story}
              goalAmount={goalAmount}
              amountRaised={amountRaised}
              donorCount={donorCount}
              progress={progress}
              comments={comments}
              donations={donations}
            />
          </div>

          <ReportsDetailSidebar
            report={currentReport}
            canRespond={canModerateReports}
            creatorStrikeCount={campaign?.creatorStrikeCount ?? null}
            campaignHasOpenLiveUpdate={campaignHasOpenLiveUpdate}
            statusSelection={statusSelection}
            resolutionDraft={resolutionDraft}
            statusDirty={statusDirty}
            updatingStatus={updatingStatus}
            statusError={statusError}
            notes={notes}
            notesLoading={notesLoading}
            noteInput={noteInput}
            noteSaving={noteSaving}
            noteError={noteError}
            selectedAction={selectedAction}
            actionDrafts={actionDrafts}
            actionError={actionError}
            actionBusy={actionBusy}
            onStatusChange={setStatusSelection}
            onResolutionChange={setResolutionDraft}
            onSaveStatus={handleSaveStatus}
            onSelectAction={handleSelectAction}
            onActionDraftChange={handleActionDraftChange}
            onApplySuggestedDraft={handleApplySuggestedDraft}
            onCancelAction={handleCancelAction}
            onReviewAction={handleReviewAction}
            onNoteInputChange={setNoteInput}
            onSaveNote={handleSaveNote}
          />
        </div>
      </div>

      {activeEvidenceUrl ? (
        <div className="report-detail__modal-backdrop" role="presentation" onClick={() => setActiveEvidenceUrl(null)}>
          <div className="report-detail__modal report-detail__modal--image" role="dialog" aria-modal="true" aria-label="Evidence preview" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="report-detail__modal-close" onClick={() => setActiveEvidenceUrl(null)} aria-label="Close evidence">
              x
            </button>
            <img className="report-detail__modal-image" src={activeEvidenceUrl} alt="Evidence preview" />
          </div>
        </div>
      ) : null}

      {confirmingAction && selectedAction && activeActionDraft ? (
        <ConfirmationModal
          action={selectedAction}
          draft={activeActionDraft}
          summary={confirmationSummary}
          creatorStrikeCount={campaign?.creatorStrikeCount ?? null}
          busy={actionBusy}
          onClose={handleCloseConfirmation}
          onConfirm={handleConfirmAction}
        />
      ) : null}
    </>
  );
}
