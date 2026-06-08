export interface AdminReport {
  reportId: string;
  campaignId: string;
  campaignTitle: string;
  reason: string;
  description: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
  reporterEmail: string | null;
  reporterUsername: string | null;
  resolutionNote: string | null;
  evidence?: string | null;
  evidenceText?: string | null;
  evidenceUrls?: string[] | null;
  reviewDueAt: string;
  createdAt: string;
}

export interface ReportsPageResponse {
  reports: AdminReport[];
  total: number;
}

export type ReportStatus = AdminReport["status"];

export const PAGE_SIZE = 20;

export const STATUS_CONFIG: Record<ReportStatus, { label: string; bg: string; color: string }> = {
  OPEN: { label: "Open", bg: "#fff0f0", color: "#b91c1c" },
  IN_REVIEW: { label: "In review", bg: "#fef3c7", color: "#92400e" },
  RESOLVED: { label: "Resolved", bg: "#f0fdf4", color: "#15803d" },
  DISMISSED: { label: "Dismissed", bg: "#f1f5f9", color: "#475569" },
};

export const STATUS_FILTERS: Array<{ value: "" | ReportStatus; label: string }> = [
  { value: "", label: "All cases" },
  { value: "OPEN", label: "Open" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
];

export const REASON_LABELS: Record<string, string> = {
  FRAUD_SCAM: "Fraud / Scam",
  INAPPROPRIATE_CONTENT: "Inappropriate Content",
  MISLEADING_INFORMATION: "Misleading Information",
  SPAM: "Spam",
  HATE_SPEECH: "Hate Speech",
  OTHER: "Other",
};

export interface DueMeta {
  label: string;
  tone: "danger" | "warning" | "neutral";
}

export interface EvidenceSummary {
  count: number;
  label: string;
  urls: string[];
  text: string;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatReporter(report: AdminReport) {
  return report.reporterUsername ? `@${report.reporterUsername}` : report.reporterEmail ?? "Anonymous";
}

export function getStatementPreview(report: AdminReport) {
  const value = report.description?.trim();
  return value || "No reporter statement provided.";
}

export function getDueMeta(value: string | null | undefined): DueMeta | null {
  if (!value) return null;
  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) return null;

  const deltaMs = dueDate.getTime() - Date.now();
  const hours = Math.max(1, Math.ceil(Math.abs(deltaMs) / (1000 * 60 * 60)));
  const days = Math.max(1, Math.ceil(Math.abs(deltaMs) / (1000 * 60 * 60 * 24)));

  if (deltaMs < 0) {
    return {
      label: hours < 24 ? `Overdue by ${hours}h` : `Overdue by ${days}d`,
      tone: "danger",
    };
  }

  if (deltaMs <= 1000 * 60 * 60 * 24) {
    return {
      label: `Due in ${hours}h`,
      tone: "warning",
    };
  }

  return {
    label: `Due ${formatDate(value)}`,
    tone: "neutral",
  };
}
