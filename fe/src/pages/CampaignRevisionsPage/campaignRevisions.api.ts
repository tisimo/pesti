import { apiBackoffice } from "@/shared/lib/axios";

export type CampaignRevisionThreadType = "initial_approval" | "live_update";
export type CampaignRevisionThreadStatus =
  | "pending"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "cancelled";
export type CampaignRevisionReviewAction = "approved" | "changes_requested" | "rejected";
export type CampaignRevisionLiveCampaignStatus =
  | "active"
  | "inactive"
  | "finished"
  | "pending"
  | "reviewing"
  | "rejected"
  | "deleted";

export interface CampaignRevisionSnapshotMediaItem {
  url: string;
  type: "image" | "video";
  processingStatus?: "ready" | "processing" | "error";
  processingJobId?: string | null;
  processingMessage?: string | null;
}

export interface CampaignRevisionSnapshotBudgetItem {
  label: string;
  amount: number | null;
}

export interface CampaignRevisionSnapshot {
  title?: string;
  story?: string;
  categoryId?: string | null;
  country?: string;
  city?: string;
  goalAmount?: number;
  durationDays?: number | null;
  mediaItems?: CampaignRevisionSnapshotMediaItem[];
  photoUrls?: string[];
  videoUrl?: string | null;
  acceptUSDC?: boolean;
  budgetItems?: CampaignRevisionSnapshotBudgetItem[];
}

export interface CampaignRevisionCampaignSummary {
  campaignId: string;
  title: string;
  creatorName: string;
  creatorUsername: string | null;
  categoryName: string | null;
  country: string;
  city: string | null;
  liveCampaignStatus: CampaignRevisionLiveCampaignStatus;
  amountRaised: number;
  goalAmount: number;
  thumbnailUrl: string | null;
  reviewMessage: string | null;
}

export interface CampaignRevisionSubmission {
  submissionId: string;
  threadId: string;
  submissionNumber: number;
  submittedByAccountId: string;
  beforeSnapshot: CampaignRevisionSnapshot | null;
  afterSnapshot: CampaignRevisionSnapshot;
  createdAt: string;
}

export interface CampaignRevisionReview {
  reviewId: string;
  submissionId: string;
  action: CampaignRevisionReviewAction;
  message: string;
  reviewedByAccountId: string;
  reviewedByEmail?: string | null;
  createdAt: string;
}

export interface CampaignRevisionThreadSummary {
  threadId: string;
  campaignId: string;
  type: CampaignRevisionThreadType;
  status: CampaignRevisionThreadStatus;
  liveCampaignStatus: CampaignRevisionLiveCampaignStatus;
  latestSubmissionId: string;
  latestSubmissionNumber: number;
  latestSubmittedAt: string;
  lastAdminMessage: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  campaign: CampaignRevisionCampaignSummary;
}

export interface CampaignRevisionThreadDetail extends CampaignRevisionThreadSummary {
  submissions: CampaignRevisionSubmission[];
  reviews: CampaignRevisionReview[];
}

export interface CampaignRevisionThreadPage {
  items: CampaignRevisionThreadSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CampaignRevisionFilters {
  status?: CampaignRevisionThreadStatus | "";
  type?: CampaignRevisionThreadType | "";
  campaignId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CategoryOption {
  categoryId: string;
  name: string;
}

export async function listCampaignRevisionThreads(filters: CampaignRevisionFilters) {
  const { data } = await apiBackoffice.get<CampaignRevisionThreadPage>("/ojc/campaign-revision-threads", {
    params: {
      status: filters.status || undefined,
      type: filters.type || undefined,
      campaignId: filters.campaignId || undefined,
      search: filters.search?.trim() || undefined,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
    },
  });
  return data;
}

export async function getCampaignRevisionThread(threadId: string) {
  const { data } = await apiBackoffice.get<CampaignRevisionThreadDetail>(`/ojc/campaign-revision-threads/${threadId}`);
  return data;
}

export async function approveCampaignRevisionThread(threadId: string, message?: string) {
  const { data } = await apiBackoffice.post<CampaignRevisionThreadDetail>(
    `/ojc/campaign-revision-threads/${threadId}/approve`,
    message?.trim() ? { message: message.trim() } : {},
  );
  return data;
}

export async function requestCampaignRevisionChanges(threadId: string, message: string) {
  const { data } = await apiBackoffice.post<CampaignRevisionThreadDetail>(
    `/ojc/campaign-revision-threads/${threadId}/request-changes`,
    { message: message.trim() },
  );
  return data;
}

export async function rejectCampaignRevisionThread(threadId: string, message: string) {
  const { data } = await apiBackoffice.post<CampaignRevisionThreadDetail>(
    `/ojc/campaign-revision-threads/${threadId}/reject`,
    { message: message.trim() },
  );
  return data;
}

export async function listCampaignRevisionCategories() {
  const { data } = await apiBackoffice.get<{ categories: CategoryOption[] }>("/ojc/categories");
  return data.categories;
}
