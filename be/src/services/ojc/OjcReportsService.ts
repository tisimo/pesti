import { Inject, Service } from "typedi";
import { v4 as uuidv4 } from "uuid";
import OjcReportsRepo, {
  ReportNotificationData,
  ReportsPage,
  ReportStatusUpdateResult,
} from "../../repos/ojc/OjcReportsRepo";
import OjcCampaignRevisionRepo from "../../repos/ojc/OjcCampaignRevisionRepo";
import OjcCampaignsService from "./OjcCampaignsService";
import EmailService, { ReportAction } from "../EmailService";
import SupportEmailService from "../SupportEmailService";
import NotificationsService from "../NotificationsService";
import Logger from "../../loaders/logger";

export interface OjcReportsServiceError {
  code: string;
  message: string;
}

@Service()
export default class OjcReportsService {
  constructor(
    @Inject("ojcReportsRepo") private readonly repo: OjcReportsRepo,
    @Inject("emailService") private readonly emailService: EmailService,
    @Inject("supportEmailService") private readonly supportEmailService: SupportEmailService,
    @Inject("ojcCampaignsService") private readonly campaignsService: OjcCampaignsService,
    @Inject("ojcCampaignRevisionRepo") private readonly campaignRevisionRepo: OjcCampaignRevisionRepo,
    @Inject("notificationsService") private readonly notificationsService: NotificationsService,
    @Inject("logger") private readonly logger: typeof Logger,
  ) {}

  public async getById(reportId: string) {
    return this.repo.getById(reportId);
  }

  public async listReports(status: string | undefined, page: number, pageSize: number): Promise<ReportsPage> {
    return this.repo.listReports(status, pageSize, (page - 1) * pageSize);
  }

  public async updateStatus(
    reportId: string,
    status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED",
    resolutionNote?: string,
  ): Promise<ReportStatusUpdateResult | null> {
    const result = await this.repo.updateStatus(reportId, status, resolutionNote);
    if (!result) return null;

    const statusChanged = result.previousStatus !== result.nextStatus;

    if (statusChanged && result.reporterEmail) {
      this.supportEmailService
        .sendReportActionEmail(
          result.reporterEmail,
          result.campaignTitle ?? "your campaign",
          "STATUS_CHANGED",
          resolutionNote,
          result.nextStatus,
        )
        .catch((error) => {
          this.logger.warn({ err: error, reportId }, "[OjcReportsService] Failed to send status change email");
        });
    }

    return result;
  }

  public async notifyReporter(
    reportId: string,
    action: ReportAction,
    adminAccountId: string,
    message?: string,
    resolve?: boolean,
    applyStrike?: boolean,
  ): Promise<ReportNotificationData | null> {
    const data = await this.repo.getReportNotificationData(reportId);
    if (!data) return null;

    let campaignTitle = data.campaignTitle ?? "your campaign";

    if (action === "ACCEPT_REPORT") {
      const campaignUpdate = await this.campaignsService.updateStatus(data.campaignId, "INACTIVE");
      if (!campaignUpdate) return null;
      campaignTitle = campaignUpdate.title;

      if (applyStrike && data.creatorProfileId) {
        const newStrikeCount = await this.applyCreatorStrike(data.creatorProfileId, data.creatorAccountId);
        await this.notifyCreatorOfStrike(
          data.creatorProfileId,
          data.creatorAccountId,
          data.campaignId,
          data.campaignAvatarUrl,
          campaignTitle,
          newStrikeCount,
          "ACCEPT_REPORT",
          message,
        );
      }
    }

    if (action === "REQUEST_CHANGE") {
      const campaignUpdate = await this.campaignsService.updateStatus(data.campaignId, "REVIEWING", message);
      if (!campaignUpdate) return null;
      campaignTitle = campaignUpdate.title;

      if (data.creatorAccountId) {
        this.campaignRevisionRepo
          .createFromReportAction({
            campaignId: data.campaignId,
            adminAccountId,
            creatorAccountId: data.creatorAccountId,
            message: message ?? "",
          })
          .catch(error => {
            this.logger.warn(
              { err: error, campaignId: data.campaignId, reportId },
              "[OjcReportsService] Failed to create revision thread for REQUEST_CHANGE action",
            );
          });
      }
    }

    if (action === "WARN_CREATOR" && data.creatorProfileId) {
      if (applyStrike) {
        const newStrikeCount = await this.applyCreatorStrike(data.creatorProfileId, data.creatorAccountId);
        await this.notifyCreatorOfStrike(
          data.creatorProfileId,
          data.creatorAccountId,
          data.campaignId,
          data.campaignAvatarUrl,
          campaignTitle,
          newStrikeCount,
          "WARN_CREATOR",
          message,
        );
      } else {
        this.createReportNotification(data.creatorProfileId, data.campaignId, data.campaignAvatarUrl);

        if (data.creatorAccountId) {
          const creatorEmail = await this.repo.getAccountEmail(data.creatorAccountId);
          if (creatorEmail) {
            this.emailService
              .sendCreatorWarningEmail(creatorEmail, campaignTitle, message)
              .catch((error) => {
                this.logger.warn(
                  { err: error, reportId, accountId: data.creatorAccountId },
                  "[OjcReportsService] Failed to send creator warning email",
                );
              });
          }
        }
      }
    }

    if (resolve) {
      await this.repo.setStatus(reportId, "RESOLVED");
    }

    if (data.reporterEmail) {
      this.supportEmailService
        .sendReportActionEmail(data.reporterEmail, campaignTitle, action, message)
        .catch((error) => {
          this.logger.warn({ err: error, reportId }, "[OjcReportsService] Failed to send report action email");
        });
    }

    if (data.reporterProfileId) {
      this.createReportNotification(data.reporterProfileId, data.campaignId, data.campaignAvatarUrl);
    }

    return data;
  }

  private buildError(code: string, message: string): OjcReportsServiceError {
    return { code, message };
  }

  private async applyCreatorStrike(profileId: string, accountId: string | null): Promise<number> {
    const newStrikeCount = await this.repo.incrementStrikeCount(profileId);
    if (newStrikeCount === null) {
      const currentStrikeCount = await this.repo.getStrikeCount(profileId);
      if (currentStrikeCount !== null && currentStrikeCount >= 3) {
        throw this.buildError(
          "CREATOR_ALREADY_SUSPENDED",
          "This creator already has 3 strikes and is already suspended. Additional strikes cannot be applied.",
        );
      }
      throw this.buildError("STRIKE_UPDATE_FAILED", "Failed to record the creator strike.");
    }

    if (newStrikeCount >= 3 && accountId) {
      await this.repo.suspendAccount(accountId);
    }

    return newStrikeCount;
  }

  private createReportNotification(profileId: string, campaignId: string, campaignAvatarUrl: string | null): void {
    const ttlSeconds = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;
    this.notificationsService
      .createNotification({
        notificationId: uuidv4(),
        profileId,
        type: "REPORT",
        isRead: false,
        actorProfileId: "system",
        actorUsername: "JustCauses Team",
        actorAvatarUrl: campaignAvatarUrl,
        relatedId: campaignId,
        createdAt: new Date(),
        ttl: ttlSeconds,
      })
      .catch((error) => {
        this.logger.warn(
          { err: error, profileId, campaignId },
          "[OjcReportsService] Failed to create report notification",
        );
      });
  }

  private async notifyCreatorOfStrike(
    profileId: string,
    accountId: string | null,
    campaignId: string,
    campaignAvatarUrl: string | null,
    campaignTitle: string,
    strikeCount: number,
    action: "ACCEPT_REPORT" | "WARN_CREATOR",
    message?: string,
  ): Promise<void> {
    this.createReportNotification(profileId, campaignId, campaignAvatarUrl);

    if (!accountId) return;

    const creatorEmail = await this.repo.getAccountEmail(accountId);
    if (creatorEmail) {
      this.emailService
        .sendCreatorStrikeEmail(creatorEmail, campaignTitle, strikeCount, action, message)
        .catch((error) => {
          this.logger.warn({ err: error, reportId: campaignId }, "[OjcReportsService] Failed to send creator strike email");
        });
    }
  }
}
