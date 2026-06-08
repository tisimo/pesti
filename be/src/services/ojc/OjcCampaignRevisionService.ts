import { randomUUID } from "crypto";
import { Inject, Service } from "typedi";
import Logger from "../../loaders/logger";
import UserRepo from "../../repos/UserRepo";
import OjcCampaignRevisionRepo, {
  CampaignRevisionModerationContext,
  CampaignRevisionReviewAction,
  CampaignRevisionThreadDetail,
  CampaignRevisionThreadPage,
  CampaignRevisionThreadStatus,
  CampaignRevisionThreadType,
} from "../../repos/ojc/OjcCampaignRevisionRepo";
import EmailService from "../EmailService";
import NotificationsService from "../NotificationsService";

type CampaignRevisionServiceErrorCode = "INVALID_STATE";

interface CampaignRevisionServiceError {
  code: CampaignRevisionServiceErrorCode;
  message: string;
}

@Service()
export default class OjcCampaignRevisionService {
  constructor(
    @Inject("ojcCampaignRevisionRepo") private readonly repo: OjcCampaignRevisionRepo,
    @Inject("userRepo") private readonly userRepo: UserRepo,
    @Inject("emailService") private readonly emailService: EmailService,
    @Inject("notificationsService") private readonly notificationsService: NotificationsService,
    @Inject("logger") private readonly logger: typeof Logger,
  ) {}

  public async listThreads(
    filters: {
      status?: CampaignRevisionThreadStatus;
      type?: CampaignRevisionThreadType;
      campaignId?: string;
      search?: string;
      page: number;
      pageSize: number;
    },
  ): Promise<CampaignRevisionThreadPage> {
    return this.repo.listThreads(filters);
  }

  public async getThreadDetail(threadId: string): Promise<CampaignRevisionThreadDetail | null> {
    const detail = await this.repo.getThreadDetail(threadId);
    if (!detail) return null;
    return this.enrichReviewActors(detail);
  }

  public async moderateThread(
    threadId: string,
    action: CampaignRevisionReviewAction,
    reviewedByAccountId: string,
    message?: string,
  ): Promise<CampaignRevisionThreadDetail | null> {
    const context = await this.repo.getModerationContext(threadId);
    if (!context) return null;

    if (context.status !== "PENDING") {
      throw {
        code: "INVALID_STATE",
        message: "Only pending revision threads can be moderated.",
      } satisfies CampaignRevisionServiceError;
    }

    await this.repo.applyModerationAction({
      context,
      action,
      message,
      reviewedByAccountId,
    });

    await this.notifyCreator(context, action, message);

    return this.getThreadDetail(threadId);
  }

  private async notifyCreator(
    context: CampaignRevisionModerationContext,
    action: CampaignRevisionReviewAction,
    message?: string,
  ): Promise<void> {
    const normalizedMessage = typeof message === "string" ? message.trim() : "";
    const now = new Date();
    const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

    if (context.creatorProfileId) {
      const notificationResult = await this.notificationsService.createNotification({
        notificationId: randomUUID(),
        profileId: context.creatorProfileId,
        type: "CAMPAIGN-STATUS",
        isRead: false,
        actorProfileId: context.creatorProfileId,
        actorUsername: "JustCauses Team",
        actorAvatarUrl: context.thumbnailUrl ?? null,
        relatedId: context.campaignId,
        createdAt: now,
        ttl,
      });

      if (notificationResult.isFailure) {
        this.logger.warn(
          { campaignId: context.campaignId, threadId: context.threadId, action },
          "[OjcCampaignRevisionService] Failed to create creator notification for campaign revision action",
        );
      }
    }

    if (!context.creatorEmail) {
      return;
    }

    this.emailService
      .sendCampaignRevisionOutcomeEmail(
        context.creatorEmail,
        context.campaignTitle,
        action,
        context.type === "LIVE_UPDATE" ? "live_update" : "initial_approval",
        normalizedMessage || undefined,
      )
      .catch((error) => {
        this.logger.warn(
          { err: error, campaignId: context.campaignId, threadId: context.threadId, action },
          "[OjcCampaignRevisionService] Failed to send creator email for campaign revision action",
        );
      });
  }

  private async enrichReviewActors(detail: CampaignRevisionThreadDetail): Promise<CampaignRevisionThreadDetail> {
    const ids = [...new Set(detail.reviews.map((review) => review.reviewedByAccountId).filter(Boolean))];
    if (ids.length === 0) return detail;

    const users = await Promise.all(
      ids.map(async (userId) => {
        try {
          const user = await this.userRepo.findById(userId);
          return [userId, user?.email ?? null] as const;
        } catch (error) {
          this.logger.warn({ err: error, userId }, "[OjcCampaignRevisionService] Failed to resolve review actor");
          return [userId, null] as const;
        }
      }),
    );

    const emailById = new Map(users);

    return {
      ...detail,
      reviews: detail.reviews.map((review) => ({
        ...review,
        reviewedByEmail: emailById.get(review.reviewedByAccountId) ?? null,
      })),
    };
  }
}
