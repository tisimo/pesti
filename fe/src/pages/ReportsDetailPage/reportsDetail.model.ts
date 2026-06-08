import type { AdminReport, CampaignDetails, CampaignStatus, ReportAction, ReportStatus } from "./reportsDetail.api";

export type ActionTone = "danger" | "warning" | "neutral" | "primary";

export interface BadgeConfig {
  label: string;
  bg: string;
  color: string;
  icon: string;
}

export interface ActionConfig {
  label: string;
  description: string;
  impact: string;
  tone: ActionTone;
  messageLabel: string;
  messagePlaceholder: string;
  summaryLabel: string;
  summaryPlaceholder: string;
  suggestedMessage?: string;
  suggestedSummary: string;
  suggestedMessageWithStrike?: string;
  suggestedSummaryWithStrike?: string;
  requiresResolution: boolean;
  defaultResolve: boolean;
  confirmLabel: string;
  strikeLabel?: string;
}

export interface ActionDraft {
  message: string;
  resolutionNote: string;
  resolve: boolean;
  applyStrike: boolean;
}

export interface CreatorImpactSummary {
  tone: "neutral" | "warning" | "danger";
  title: string;
  message: string;
  currentStrikeCount: number | null;
  nextStrikeCount: number | null;
}

export const STATUS_CONFIG: Record<ReportStatus, BadgeConfig> = {
  OPEN: { label: "Open", bg: "#fff0f0", color: "#b91c1c", icon: "bi-flag" },
  IN_REVIEW: { label: "In review", bg: "#fef3c7", color: "#92400e", icon: "bi-search" },
  RESOLVED: { label: "Resolved", bg: "#f0fdf4", color: "#15803d", icon: "bi-check2-circle" },
  DISMISSED: { label: "Dismissed", bg: "#f1f5f9", color: "#475569", icon: "bi-slash-circle" },
};

export const REASON_LABELS: Record<string, string> = {
  FRAUD_SCAM: "Fraud / Scam",
  INAPPROPRIATE_CONTENT: "Inappropriate Content",
  MISLEADING_INFORMATION: "Misleading Information",
  SPAM: "Spam",
  HATE_SPEECH: "Hate Speech",
  OTHER: "Other",
};

export const CAMPAIGN_STATUS_CONFIG: Record<CampaignStatus, BadgeConfig> = {
  PENDING: { label: "Pending review", bg: "#eff6ff", color: "#1d4ed8", icon: "bi-hourglass-split" },
  ACTIVE: { label: "Active", bg: "#f0fdf4", color: "#15803d", icon: "bi-broadcast" },
  CHANGE: { label: "Changes requested", bg: "#eff6ff", color: "#1d4ed8", icon: "bi-pencil-square" },
  REVIEWING: { label: "Changes requested", bg: "#eff6ff", color: "#1d4ed8", icon: "bi-pencil-square" },
  INACTIVE: { label: "Inactive", bg: "#fef3c7", color: "#92400e", icon: "bi-pause-circle" },
  FINISHED: { label: "Finished", bg: "#f1f5f9", color: "#475569", icon: "bi-check2-square" },
  REJECTED: { label: "Rejected", bg: "#fff1f2", color: "#be123c", icon: "bi-x-octagon" },
};

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getCampaignStatusConfig(status: string | null | undefined): BadgeConfig | null {
  if (!status) return null;

  const normalized = status.toUpperCase();
  const known = CAMPAIGN_STATUS_CONFIG[normalized as CampaignStatus];
  if (known) return known;

  return {
    label: formatStatusLabel(normalized),
    bg: "#f8fafc",
    color: "#475569",
    icon: "bi-tag",
  };
}

export const ACTION_CONFIG: Record<ReportAction, ActionConfig> = {
  REJECT_REPORT: {
    label: "Dismiss report",
    description: "Close the case without taking action on the cause.",
    impact: "Best when the report lacks evidence or does not justify intervention.",
    tone: "neutral",
    messageLabel: "Reply to reporter",
    messagePlaceholder: "Optional reply explaining why the report is being dismissed.",
    summaryLabel: "Internal decision summary",
    summaryPlaceholder: "Document why this report is being dismissed.",
    suggestedSummary: "Report dismissed after review. Available evidence did not support moderation action.",
    suggestedMessage: "We reviewed your report and, based on the available evidence, we are not taking action on this campaign at this time.",
    requiresResolution: true,
    defaultResolve: true,
    confirmLabel: "Dismiss report",
  },
  ACCEPT_REPORT: {
    label: "Remove cause",
    description: "Accept the report, unpublish the cause, and notify the creator.",
    impact: "Use when the report is valid and the cause should no longer remain public. You can optionally record a strike.",
    tone: "danger",
    messageLabel: "Message to creator",
    messagePlaceholder: "Optional message explaining why the cause is being removed.",
    summaryLabel: "Internal decision summary",
    summaryPlaceholder: "Document why the cause is being removed.",
    suggestedSummary: "Report accepted. Campaign unpublished for policy violation and creator notified.",
    suggestedSummaryWithStrike: "Report accepted. Campaign unpublished and strike recorded against the creator.",
    suggestedMessage: "We removed your campaign because it violates platform policies. If you believe this was a mistake, please contact support.",
    suggestedMessageWithStrike: "We removed your campaign because it violates platform policies. A strike has also been recorded on your account. If you believe this was a mistake, please contact support.",
    requiresResolution: true,
    defaultResolve: true,
    confirmLabel: "Remove cause",
    strikeLabel: "Also record a strike for the creator.",
  },
  WARN_CREATOR: {
    label: "Warn creator",
    description: "Keep the cause live and send a formal warning to the creator.",
    impact: "Use when the issue is real but does not justify immediate removal. You can optionally record a strike.",
    tone: "warning",
    messageLabel: "Warning message to creator",
    messagePlaceholder: "Explain what the creator must stop doing or fix next.",
    summaryLabel: "Internal note",
    summaryPlaceholder: "Record what triggered the warning for future moderators.",
    suggestedSummary: "Creator warned following report review.",
    suggestedSummaryWithStrike: "Creator warned and strike recorded following report review.",
    suggestedMessage: "We identified content in your campaign that breaches platform rules. Please correct the issue immediately to avoid further enforcement.",
    suggestedMessageWithStrike: "We identified content in your campaign that breaches platform rules. This warning has been recorded as a strike. Please correct the issue immediately to avoid further enforcement.",
    requiresResolution: false,
    defaultResolve: false,
    confirmLabel: "Warn creator",
    strikeLabel: "Record this warning as a strike.",
  },
  REQUEST_CHANGE: {
    label: "Request changes",
    description: "Ask the creator to adjust the cause content and resubmit.",
    impact: "Best when the issue can be corrected without full removal.",
    tone: "primary",
    messageLabel: "Change request to creator",
    messagePlaceholder: "Tell the creator exactly what must change and why.",
    summaryLabel: "Internal decision summary",
    summaryPlaceholder: "Capture what changes were requested and the moderation rationale.",
    suggestedSummary: "Changes requested from the creator following report review.",
    suggestedMessage: "Your campaign requires changes before it can remain in good standing. Please review the reported issue and update the content accordingly.",
    requiresResolution: true,
    defaultResolve: false,
    confirmLabel: "Request changes",
  },
};

export function createInitialDrafts(): Record<ReportAction, ActionDraft> {
  return {
    REJECT_REPORT: { message: "", resolutionNote: "", resolve: ACTION_CONFIG.REJECT_REPORT.defaultResolve, applyStrike: false },
    ACCEPT_REPORT: { message: "", resolutionNote: "", resolve: ACTION_CONFIG.ACCEPT_REPORT.defaultResolve, applyStrike: false },
    WARN_CREATOR: { message: "", resolutionNote: "", resolve: ACTION_CONFIG.WARN_CREATOR.defaultResolve, applyStrike: false },
    REQUEST_CHANGE: { message: "", resolutionNote: "", resolve: ACTION_CONFIG.REQUEST_CHANGE.defaultResolve, applyStrike: false },
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
}

export function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getDueMeta(value: string | null | undefined): { label: string; className: string } | null {
  if (!value) return null;
  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) return null;

  const deltaMs = dueDate.getTime() - Date.now();
  const hours = Math.max(1, Math.ceil(Math.abs(deltaMs) / (1000 * 60 * 60)));
  const days = Math.max(1, Math.ceil(Math.abs(deltaMs) / (1000 * 60 * 60 * 24)));

  if (deltaMs < 0) {
    return {
      label: hours < 24 ? `Overdue by ${hours} hour${hours === 1 ? "" : "s"}` : `Overdue by ${days} day${days === 1 ? "" : "s"}`,
      className: "report-detail__due--danger",
    };
  }

  if (deltaMs <= 1000 * 60 * 60 * 24) {
    return {
      label: `Due in ${hours} hour${hours === 1 ? "" : "s"}`,
      className: "report-detail__due--warning",
    };
  }

  return { label: `Due ${formatDate(value)}`, className: "report-detail__due--neutral" };
}

export function getReporterName(report: AdminReport) {
  return report.reporterUsername ? `@${report.reporterUsername}` : report.reporterEmail ?? "Anonymous";
}

export function extractMediaUrls(campaign: CampaignDetails | null): string[] {
  if (!campaign) return [];

  const urls: string[] = [];
  const mediaItems = campaign.media_items ?? campaign.mediaItems;
  if (Array.isArray(mediaItems)) {
    mediaItems.forEach((item) => {
      if (!item) return;
      if (typeof item === "string") {
        urls.push(item);
        return;
      }
      if (typeof item === "object" && "url" in item && typeof item.url === "string") {
        urls.push(item.url);
      }
    });
  }

  const photoUrls = campaign.photo_urls ?? campaign.photoUrls;
  if (Array.isArray(photoUrls)) {
    photoUrls.forEach((item) => {
      if (typeof item === "string") urls.push(item);
    });
  }

  if (typeof campaign.thumbnailUrl === "string") {
    urls.push(campaign.thumbnailUrl);
  }

  return Array.from(new Set(urls.filter(Boolean)));
}

export function actionToneClassName(tone: ActionTone) {
  return `report-detail__action-card--${tone}`;
}

export function actionSupportsStrike(action: ReportAction) {
  return action === "ACCEPT_REPORT" || action === "WARN_CREATOR";
}

function getSuggestedContent(action: ReportAction, applyStrike: boolean) {
  const config = ACTION_CONFIG[action];
  return {
    message: applyStrike ? config.suggestedMessageWithStrike ?? config.suggestedMessage ?? "" : config.suggestedMessage ?? "",
    resolutionNote: applyStrike ? config.suggestedSummaryWithStrike ?? config.suggestedSummary : config.suggestedSummary,
  };
}

function hasMeaningfulText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function getCreatorImpactSummary(action: ReportAction, creatorStrikeCount?: number | null, applyStrike = false): CreatorImpactSummary | null {
  const currentStrikeCount = typeof creatorStrikeCount === "number" ? creatorStrikeCount : null;

  if (action === "WARN_CREATOR" || action === "ACCEPT_REPORT") {
    if (!applyStrike) {
      return {
        tone: "neutral",
        title: "No strike recorded",
        message:
          currentStrikeCount === null
            ? "This action does not record a strike unless you enable it."
            : `This action does not record a strike. The creator remains at ${currentStrikeCount} strike${currentStrikeCount === 1 ? "" : "s"}.`,
        currentStrikeCount,
        nextStrikeCount: currentStrikeCount,
      };
    }

    if (currentStrikeCount !== null && currentStrikeCount >= 3) {
      return {
        tone: "danger",
        title: "Creator already suspended",
        message: "This creator already has 3 strikes and cannot receive another strike.",
        currentStrikeCount,
        nextStrikeCount: currentStrikeCount,
      };
    }

    const nextStrikeCount = currentStrikeCount === null ? null : currentStrikeCount + 1;

    if (nextStrikeCount !== null && nextStrikeCount >= 3) {
      return {
        tone: "danger",
        title: "Automatic suspension warning",
        message: `This action records strike ${nextStrikeCount} of 3 and will suspend the creator account automatically.`,
        currentStrikeCount,
        nextStrikeCount,
      };
    }

    return {
      tone: "warning",
      title: "Strike will be recorded",
      message:
        nextStrikeCount === null
          ? "This action records a strike for the creator. Accounts are suspended automatically at 3 strikes."
          : `This action records strike ${nextStrikeCount} of 3 for the creator. Accounts are suspended automatically at 3 strikes.`,
      currentStrikeCount,
      nextStrikeCount,
    };
  }

  return null;
}

export function setDraftStrikePreference(action: ReportAction, draft: ActionDraft, applyStrike: boolean): ActionDraft {
  const previousSuggested = getSuggestedContent(action, draft.applyStrike);
  const nextSuggested = getSuggestedContent(action, applyStrike);
  const shouldSyncMessage = !hasMeaningfulText(draft.message) || draft.message.trim() === previousSuggested.message.trim();
  const shouldSyncResolutionNote =
    !hasMeaningfulText(draft.resolutionNote) || draft.resolutionNote.trim() === previousSuggested.resolutionNote.trim();

  return {
    ...draft,
    applyStrike,
    message: shouldSyncMessage ? nextSuggested.message : draft.message,
    resolutionNote: shouldSyncResolutionNote ? nextSuggested.resolutionNote : draft.resolutionNote,
  };
}

export function seedDraft(action: ReportAction, draft: ActionDraft): ActionDraft {
  const suggested = getSuggestedContent(action, draft.applyStrike);
  return {
    ...draft,
    message: hasMeaningfulText(draft.message) ? draft.message : suggested.message,
    resolutionNote: hasMeaningfulText(draft.resolutionNote) ? draft.resolutionNote : suggested.resolutionNote,
  };
}

export function applySuggestedDraft(action: ReportAction, draft: ActionDraft): ActionDraft {
  const suggested = getSuggestedContent(action, draft.applyStrike);
  return {
    ...draft,
    message: suggested.message,
    resolutionNote: suggested.resolutionNote,
  };
}

export function isSuggestedDraft(action: ReportAction, draft: ActionDraft): boolean {
  const suggested = getSuggestedContent(action, draft.applyStrike);
  return draft.message.trim() === suggested.message.trim() && draft.resolutionNote.trim() === suggested.resolutionNote.trim();
}
