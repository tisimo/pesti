import { Inject, Service } from "typedi";
import OjcCampaignsRepo, {
  AdminCampaignDetail,
  CampaignStatus,
  CampaignsPage,
  CampaignStatusUpdateResult,
} from "../../repos/ojc/OjcCampaignsRepo";
import OjcCampaignRevisionRepo from "../../repos/ojc/OjcCampaignRevisionRepo";
import EmailService from "../EmailService";
import NotificationsService from "../NotificationsService";
import Logger from "../../loaders/logger";
import { randomUUID } from "crypto";

const NOTIFY_STATUSES: CampaignStatus[] = ["ACTIVE", "REJECTED", "REVIEWING"];

interface CampaignStatusUpdateError {
  code: "LIVE_UPDATE_CONFLICT";
  message: string;
}

@Service()
export default class OjcCampaignsService {
  constructor(
    @Inject("ojcCampaignsRepo") private readonly repo: OjcCampaignsRepo,
    @Inject("ojcCampaignRevisionRepo") private readonly campaignRevisionRepo: OjcCampaignRevisionRepo,
    @Inject("emailService") private readonly emailService: EmailService,
    @Inject("notificationsService") private readonly notificationsService: NotificationsService,
    @Inject("logger") private readonly logger: typeof Logger,
  ) {}

  public async listCampaigns(
    status: string | undefined,
    category: string | undefined,
    search: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<CampaignsPage> {
    return this.repo.listCampaigns(status, category, search, pageSize, (page - 1) * pageSize);
  }

  public async getCampaign(campaignId: string): Promise<AdminCampaignDetail | null> {
    return this.repo.getCampaign(campaignId);
  }

  public async updateStatus(
    campaignId: string,
    status: CampaignStatus,
    reviewMessage?: string,
    adminAccountId?: string,
  ): Promise<CampaignStatusUpdateResult | null> {
    if (await this.repo.hasOpenLiveUpdateThread(campaignId)) {
      throw {
        code: "LIVE_UPDATE_CONFLICT",
        message: "This campaign has a pending live update review. Use Campaign Revisions to complete that workflow first.",
      } satisfies CampaignStatusUpdateError;
    }

    const result: CampaignStatusUpdateResult | null = await this.repo.updateStatus(campaignId, status, reviewMessage);
    if (!result) return null;
    const now = new Date();
    await this.notificationsService.createNotification({
      notificationId: randomUUID(),
      profileId: result.profileId,
      type: "CAMPAIGN-STATUS",
      isRead: false,
      actorProfileId: result.profileId,
      actorUsername: "System",
      actorAvatarUrl: result.thumbnailUrl ?? null,
      relatedId: campaignId,
      createdAt: now,
      ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    });

    if (NOTIFY_STATUSES.includes(status)) {
      const email = await this.repo.getCreatorEmailByProfileId(result.profileId);
      if (email) {
        this.emailService
          .sendCampaignStatusEmail(email, result.title, status, reviewMessage)
          .catch((error) => {
            this.logger.warn(
              { err: error, campaignId, status },
              "[OjcCampaignsService] Failed to send campaign status email",
            );
          });
      }
    }

    if (status === "REVIEWING" && adminAccountId && result.creatorAccountId) {
      this.campaignRevisionRepo
        .createFromReportAction({
          campaignId,
          adminAccountId,
          creatorAccountId: result.creatorAccountId,
          message: reviewMessage ?? "",
        })
        .catch((error) => {
          this.logger.warn(
            { err: error, campaignId },
            "[OjcCampaignsService] Failed to create revision thread when requesting changes",
          );
        });
    }

    return result;
  }
}
