import { apiBackoffice } from "@/shared/lib/axios";

export type ReportStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
export type ReportAction = "REJECT_REPORT" | "ACCEPT_REPORT" | "WARN_CREATOR" | "REQUEST_CHANGE";
export type CampaignStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "FINISHED" | "REJECTED" | "CHANGE" | "REVIEWING";

export interface AdminReport {
  reportId: string;
  campaignId: string;
  campaignTitle: string;
  reason: string;
  description: string;
  status: ReportStatus;
  reporterEmail: string | null;
  reporterUsername: string | null;
  resolutionNote: string | null;
  evidence?: string | null;
  evidenceText?: string | null;
  evidenceUrls?: string[] | null;
  reviewDueAt: string;
  createdAt: string;
}

export interface ReportNote {
  noteId: string;
  note: string;
  adminEmail: string;
  timestamp: string;
}

export interface CampaignDonation {
  donationId: string;
  profileId: string | null;
  donorName: string | null;
  amount: number;
  status: "COMPLETED" | "PENDING" | "FAILED";
  isAnonymous: boolean;
  createdAt: string;
}

export interface CampaignComment {
  commentId?: string | null;
  authorName?: string | null;
  username?: string | null;
  text?: string | null;
  content?: string | null;
  createdAt?: string | null;
}

export interface CampaignDetails extends Record<string, unknown> {
  campaignId: string;
  title: string;
  status: CampaignStatus;
  donations?: CampaignDonation[] | null;
  totals?: {
    amountRaised: number;
    donorCount: number;
    completedDonations: number;
  };
  creatorUsername?: string | null;
  creatorFirstName?: string | null;
  creatorLastName?: string | null;
  creatorStrikeCount?: number | null;
  comments?: CampaignComment[] | null;
  story?: string | null;
  description?: string | null;
  summary?: string | null;
  goalAmount?: number | string | null;
  goal_amount?: number | string | null;
  amountRaised?: number | string | null;
  amount_raised?: number | string | null;
  donorCount?: number | string | null;
  donor_count?: number | string | null;
  createdAt?: string | null;
  publishedAt?: string | null;
  country?: string | null;
  city?: string | null;
  thumbnailUrl?: string | null;
  media_items?: Array<string | { url?: string | null } | null> | null;
  mediaItems?: Array<string | { url?: string | null } | null> | null;
  photo_urls?: string[] | null;
  photoUrls?: string[] | null;
}

interface NotesResponse {
  items: ReportNote[];
}

export const reportsDetailService = {
  getReport(reportId: string, signal?: AbortSignal): Promise<AdminReport> {
    return apiBackoffice.get<AdminReport>(`/ojc/reports/${reportId}`, { signal }).then((response) => response.data);
  },

  getCampaign(campaignId: string, signal?: AbortSignal): Promise<CampaignDetails> {
    return apiBackoffice.get<CampaignDetails>(`/ojc/campaigns/${campaignId}`, { signal }).then((response) => response.data);
  },

  getNotes(reportId: string, signal?: AbortSignal): Promise<ReportNote[]> {
    return apiBackoffice
      .get<NotesResponse>(`/ojc/reports/${reportId}/notes`, { signal })
      .then((response) => response.data.items ?? []);
  },

  updateStatus(reportId: string, payload: { status: ReportStatus; resolutionNote?: string }): Promise<void> {
    return apiBackoffice.patch(`/ojc/reports/${reportId}/status`, payload).then(() => undefined);
  },

  performAction(reportId: string, payload: { action: ReportAction; message?: string; resolve?: boolean; applyStrike?: boolean }): Promise<void> {
    return apiBackoffice.post(`/ojc/reports/${reportId}/action`, payload).then(() => undefined);
  },

  addNote(reportId: string, note: string): Promise<ReportNote> {
    return apiBackoffice.post<ReportNote>(`/ojc/reports/${reportId}/notes`, { note }).then((response) => response.data);
  },
};
