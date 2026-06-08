import type { AdminReport, ReportAction, ReportNote, ReportStatus } from "./reportsDetail.api";
import {
  ACTION_CONFIG,
  actionToneClassName,
  actionSupportsStrike,
  getCreatorImpactSummary,
  isSuggestedDraft,
  type ActionDraft,
  formatDateTime,
} from "./reportsDetail.model";

interface ReportsDetailSidebarProps {
  report: AdminReport;
  canRespond: boolean;
  creatorStrikeCount?: number | null;
  campaignHasOpenLiveUpdate?: boolean;
  statusSelection: ReportStatus;
  resolutionDraft: string;
  statusDirty: boolean;
  updatingStatus: boolean;
  statusError: string;
  notes: ReportNote[];
  notesLoading: boolean;
  noteInput: string;
  noteSaving: boolean;
  noteError: string;
  selectedAction: ReportAction | null;
  actionDrafts: Record<ReportAction, ActionDraft>;
  actionError: string;
  actionBusy: boolean;
  onStatusChange: (status: ReportStatus) => void;
  onResolutionChange: (value: string) => void;
  onSaveStatus: () => void;
  onSelectAction: (action: ReportAction) => void;
  onActionDraftChange: <K extends keyof ActionDraft>(action: ReportAction, key: K, value: ActionDraft[K]) => void;
  onApplySuggestedDraft: (action: ReportAction) => void;
  onCancelAction: () => void;
  onReviewAction: () => void;
  onNoteInputChange: (value: string) => void;
  onSaveNote: () => void;
}

export function ReportsDetailSidebar({
  report,
  canRespond,
  creatorStrikeCount,
  campaignHasOpenLiveUpdate,
  statusSelection,
  resolutionDraft,
  statusDirty,
  updatingStatus,
  statusError,
  notes,
  notesLoading,
  noteInput,
  noteSaving,
  noteError,
  selectedAction,
  actionDrafts,
  actionError,
  actionBusy,
  onStatusChange,
  onResolutionChange,
  onSaveStatus,
  onSelectAction,
  onActionDraftChange,
  onApplySuggestedDraft,
  onCancelAction,
  onReviewAction,
  onNoteInputChange,
  onSaveNote,
}: ReportsDetailSidebarProps) {
  const activeActionConfig = selectedAction ? ACTION_CONFIG[selectedAction] : null;
  const activeActionDraft = selectedAction ? actionDrafts[selectedAction] : null;
  const actionCanApplyStrike = selectedAction ? actionSupportsStrike(selectedAction) : false;
  const creatorImpact =
    selectedAction && activeActionDraft
      ? getCreatorImpactSummary(selectedAction, creatorStrikeCount, activeActionDraft.applyStrike)
      : null;
  const suggestedDraftApplied = selectedAction && activeActionDraft ? isSuggestedDraft(selectedAction, activeActionDraft) : false;
  const creatorStrikeLabel =
    typeof creatorStrikeCount === "number" ? `${creatorStrikeCount} / 3` : "Unavailable";
  const creatorAlreadySuspended = typeof creatorStrikeCount === "number" && creatorStrikeCount >= 3;

  return (
    <aside className="report-detail__sidebar">
      <div className="report-detail__sticky">
        <section className="report-detail__card report-detail__card--soft">
          <div className="report-detail__card-header">
            <div>
              <h3 className="report-detail__card-title">Case controls</h3>
              <p className="report-detail__card-subtitle">Manage the case outcome and keep the internal record up to date.</p>
            </div>
          </div>

          <div className="report-detail__meta-grid">
            <div className="report-detail__meta-item">
              <span>Report ID</span>
              <span>{report.reportId}</span>
            </div>
            <div className="report-detail__meta-item">
              <span>Campaign ID</span>
              <span>{report.campaignId}</span>
            </div>
            <div className="report-detail__meta-item">
              <span>Creator strikes</span>
              <span>{creatorStrikeLabel}</span>
            </div>
          </div>

          {typeof creatorStrikeCount === "number" && creatorStrikeCount >= 2 ? (
            <div className="report-detail__callout report-detail__callout--danger" style={{ marginTop: 16 }}>
              <strong className="report-detail__callout-title">High-risk creator</strong>
              {creatorStrikeCount >= 3
                ? "This creator is already suspended after reaching 3 strikes. No further strikes can be recorded."
                : `This creator is already on ${creatorStrikeCount} strikes. Recording one more strike will suspend the account automatically.`}
            </div>
          ) : null}

          {canRespond ? (
            <>
              <div className="report-detail__field">
                <label className="report-detail__label" htmlFor="report-status-select">
                  Manual status
                </label>
                <select
                  id="report-status-select"
                  className="report-detail__select"
                  value={statusSelection}
                  onChange={(event) => onStatusChange(event.target.value as ReportStatus)}
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_REVIEW">In review</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
              </div>

              <div className="report-detail__field">
                <label className="report-detail__label" htmlFor="report-resolution-note">
                  Case summary
                </label>
                <textarea
                  id="report-resolution-note"
                  className="report-detail__input"
                  value={resolutionDraft}
                  onChange={(event) => onResolutionChange(event.target.value)}
                  placeholder="Capture the current moderation summary for this case."
                />
              </div>

              {statusError ? <div className="report-detail__error">{statusError}</div> : null}

              <div className="report-detail__button-row">
                <div className="report-detail__helper">Update the case status and summary when your review is complete.</div>
                <div className="report-detail__button-group">
                  <button
                    type="button"
                    className="report-detail__button report-detail__button--primary"
                    onClick={onSaveStatus}
                    disabled={!statusDirty || updatingStatus}
                  >
                    {updatingStatus ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" style={{ width: "1rem", height: "1rem" }} />
                        Saving...
                      </>
                    ) : (
                      "Save status"
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="report-detail__callout">
              You have view-only access. Status changes, internal notes, and moderation actions are restricted to
              admins with moderation permissions.
            </div>
          )}
        </section>

        <section className="report-detail__card">
          <div className="report-detail__card-header">
            <div>
              <h3 className="report-detail__card-title">Moderation actions</h3>
              <p className="report-detail__card-subtitle">Choose the outcome that best matches the evidence in this case.</p>
            </div>
          </div>

          {canRespond ? (
            <>
              {campaignHasOpenLiveUpdate && selectedAction === "REQUEST_CHANGE" ? (
                <div className="report-detail__callout report-detail__callout--warning" style={{ marginBottom: 12 }}>
                  <strong className="report-detail__callout-title">Active revision in progress</strong>
                  This campaign already has an open revision thread. Requesting changes will fail — complete the existing revision in Campaign Revisions first.
                </div>
              ) : null}

              <div className="report-detail__action-grid">
                {(Object.keys(ACTION_CONFIG) as ReportAction[]).map((action) => {
                  const config = ACTION_CONFIG[action];
                  const selected = action === selectedAction;
                  return (
                    <button
                      key={action}
                      type="button"
                      className={`report-detail__action-card ${actionToneClassName(config.tone)} ${selected ? "report-detail__action-card--selected" : ""}`}
                      onClick={() => onSelectAction(action)}
                    >
                      <span className="report-detail__action-card-title">{config.label}</span>
                      <span className="report-detail__action-card-text">{config.description}</span>
                    </button>
                  );
                })}
              </div>

              {selectedAction && activeActionConfig && activeActionDraft ? (
                <div className="report-detail__composer">
                  <div className="report-detail__card-header" style={{ marginBottom: 0 }}>
                    <div>
                      <h4 className="report-detail__card-title" style={{ fontSize: 14 }}>
                        {activeActionConfig.label}
                      </h4>
                      <p className="report-detail__card-subtitle">{activeActionConfig.impact}</p>
                    </div>
                  </div>

                  <div className="report-detail__field">
                    <label className="report-detail__label" htmlFor="report-action-message">
                      {activeActionConfig.messageLabel}
                    </label>
                    <textarea
                      id="report-action-message"
                      className="report-detail__input"
                      value={activeActionDraft.message}
                      onChange={(event) => onActionDraftChange(selectedAction, "message", event.target.value)}
                      placeholder={activeActionConfig.messagePlaceholder}
                    />
                  </div>

                  <div className="report-detail__field">
                    <label className="report-detail__label" htmlFor="report-action-summary">
                      {activeActionConfig.summaryLabel}
                    </label>
                    <textarea
                      id="report-action-summary"
                      className="report-detail__input"
                      value={activeActionDraft.resolutionNote}
                      onChange={(event) => onActionDraftChange(selectedAction, "resolutionNote", event.target.value)}
                      placeholder={activeActionConfig.summaryPlaceholder}
                    />
                  </div>

                  <div className="report-detail__chip-row">
                    <button
                      type="button"
                      className="report-detail__chip"
                      onClick={() => onApplySuggestedDraft(selectedAction)}
                      disabled={suggestedDraftApplied}
                    >
                      {suggestedDraftApplied ? "Suggested wording loaded" : "Restore suggested wording"}
                    </button>
                  </div>

                  {actionCanApplyStrike && activeActionConfig.strikeLabel ? (
                    <>
                      <label className="report-detail__checkbox">
                        <input
                          type="checkbox"
                          checked={activeActionDraft.applyStrike}
                          onChange={(event) => onActionDraftChange(selectedAction, "applyStrike", event.target.checked)}
                          disabled={creatorAlreadySuspended}
                        />
                        <span>{activeActionConfig.strikeLabel}</span>
                      </label>

                      {creatorAlreadySuspended ? (
                        <div className="report-detail__helper">
                          This creator is already suspended, so this action can still be sent but it cannot record another strike.
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  <label className="report-detail__checkbox">
                    <input
                      type="checkbox"
                      checked={activeActionDraft.resolve}
                      onChange={(event) => onActionDraftChange(selectedAction, "resolve", event.target.checked)}
                    />
                    <span>Mark this report as resolved after the action is sent.</span>
                  </label>

                  {creatorImpact ? (
                    <div className={`report-detail__callout report-detail__callout--${creatorImpact.tone}`}>
                      <strong className="report-detail__callout-title">{creatorImpact.title}</strong>
                      {typeof creatorImpact.currentStrikeCount === "number"
                        ? `Current strike count: ${creatorImpact.currentStrikeCount}. ${creatorImpact.message}`
                        : creatorImpact.message}
                    </div>
                  ) : null}

                  {actionError ? <div className="report-detail__error">{actionError}</div> : null}

                  <div className="report-detail__button-row">
                    <div className="report-detail__helper">Review the action details before confirming.</div>
                    <div className="report-detail__button-group">
                      <button type="button" className="report-detail__button report-detail__button--soft" onClick={onCancelAction} disabled={actionBusy}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={`report-detail__button ${activeActionConfig.tone === "danger" ? "report-detail__button--danger" : "report-detail__button--primary"}`}
                        onClick={onReviewAction}
                        disabled={actionBusy}
                      >
                        Review action
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="report-detail__empty" style={{ marginTop: 16 }}>
                  Pick an action to prepare the creator or reporter message and the internal case summary.
                </div>
              )}
            </>
          ) : (
            <div className="report-detail__empty">You can review this case, but you cannot perform moderation actions.</div>
          )}
        </section>

        <section className="report-detail__card">
          <div className="report-detail__card-header">
            <div>
              <h3 className="report-detail__card-title">Internal notes</h3>
              <p className="report-detail__card-subtitle">Keep investigator notes separate from creator-facing decisions.</p>
            </div>
          </div>

          {notesLoading ? (
            <div className="report-detail__spinner">
              <span className="spinner-border spinner-border-sm" role="status" style={{ width: "1rem", height: "1rem", color: "#0047AB" }} />
              Loading notes...
            </div>
          ) : notes.length > 0 ? (
            <div className="report-detail__notes">
              {notes.map((note) => (
                <div key={note.noteId} className="report-detail__note-item">
                  <div className="report-detail__note-meta">
                    {note.adminEmail || "Unknown admin"} - {formatDateTime(note.timestamp)}
                  </div>
                  <div className="report-detail__note-text">{note.note}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="report-detail__empty">No internal notes yet.</div>
          )}

          {canRespond ? (
            <div className="report-detail__composer">
              <div className="report-detail__field" style={{ marginTop: 0 }}>
                <label className="report-detail__label" htmlFor="report-note-input">
                  Add a note
                </label>
                <textarea
                  id="report-note-input"
                  className="report-detail__input"
                  value={noteInput}
                  onChange={(event) => onNoteInputChange(event.target.value)}
                  placeholder="Write an internal note for the moderation team."
                />
              </div>
              {noteError ? <div className="report-detail__error">{noteError}</div> : null}
              <div className="report-detail__button-row">
                <div className="report-detail__helper">Notes are visible to backoffice admins only.</div>
                <div className="report-detail__button-group">
                  <button type="button" className="report-detail__button report-detail__button--primary" onClick={onSaveNote} disabled={noteSaving}>
                    {noteSaving ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" style={{ width: "1rem", height: "1rem" }} />
                        Saving...
                      </>
                    ) : (
                      "Save note"
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </aside>
  );
}
