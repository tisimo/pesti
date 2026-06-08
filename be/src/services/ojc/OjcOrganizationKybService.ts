import { Inject, Service } from "typedi";
import { randomUUID } from "crypto";
import OjcOrganizationKybRepo, { KybSubmission } from "../../repos/ojc/OjcOrganizationKybRepo";
import EmailService from "../EmailService";
import NotificationsService from "../NotificationsService";
import IAuditLogService from "../IServices/IAuditLogService";
import Logger from "../../loaders/logger";

@Service()
export default class OjcOrganizationKybService {
  constructor(
    @Inject("ojcOrganizationKybRepo") private readonly repo: OjcOrganizationKybRepo,
    @Inject("emailService") private readonly emailService: EmailService,
    @Inject("notificationsService") private readonly notificationsService: NotificationsService,
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
    @Inject("logger") private readonly logger: typeof Logger,
  ) {}

  public async getByProfileId(profileId: string): Promise<KybSubmission | null> {
    return this.repo.getByProfileId(profileId);
  }

  public async approve(
    profileId: string,
    adminNote: string | null,
    actor: { adminUserId: string; adminEmail: string; ipAddress: string },
  ): Promise<KybSubmission | null> {
    const result = await this.repo.review(profileId, "approved", adminNote);
    if (!result) return null;

    this.auditLogService
      .log({
        ...actor,
        action: "KYB_APPROVED",
        targetType: "organization",
        targetId: profileId,
        targetLabel: result.legalName?.trim() || result.username,
        details: { adminNote: adminNote ?? null },
      })
      .catch((error) => {
        this.logger.warn({ err: error, profileId }, "[OjcOrganizationKybService] Failed to write KYB approval audit log");
      });

    this.notificationsService
      .createNotification({
        notificationId: randomUUID(),
        profileId: result.profileId,
        type: "VERIFICATION",
        isRead: false,
        actorProfileId: result.profileId,
        actorUsername: "System",
        actorAvatarUrl: null,
        relatedId: result.submissionId,
        createdAt: new Date(),
        ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      })
      .catch((error) => {
        this.logger.warn(
          { err: error, profileId },
          "[OjcOrganizationKybService] Failed to create KYB approval notification",
        );
      });

    this.repo
      .getEmailByAccountId(result.accountId)
      .then((email) => {
        if (email) {
          return this.emailService.sendKybDecisionEmail(
            email,
            result.legalName?.trim() || result.username,
            "approved",
            adminNote,
          );
        }
      })
      .catch((err) => {
        this.logger.warn({ err, profileId }, "[OjcOrganizationKybService] Failed to send KYB approval email");
      });

    return result;
  }

  public async reject(
    profileId: string,
    adminNote: string,
    actor: { adminUserId: string; adminEmail: string; ipAddress: string },
  ): Promise<KybSubmission | null> {
    const result = await this.repo.review(profileId, "rejected", adminNote);
    if (!result) return null;

    this.auditLogService
      .log({
        ...actor,
        action: "KYB_REJECTED",
        targetType: "organization",
        targetId: profileId,
        targetLabel: result.legalName?.trim() || result.username,
        details: { adminNote },
      })
      .catch((error) => {
        this.logger.warn({ err: error, profileId }, "[OjcOrganizationKybService] Failed to write KYB rejection audit log");
      });

    this.notificationsService
      .createNotification({
        notificationId: randomUUID(),
        profileId: result.profileId,
        type: "VERIFICATION",
        isRead: false,
        actorProfileId: result.profileId,
        actorUsername: "System",
        actorAvatarUrl: null,
        relatedId: result.submissionId,
        createdAt: new Date(),
        ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      })
      .catch((error) => {
        this.logger.warn(
          { err: error, profileId },
          "[OjcOrganizationKybService] Failed to create KYB rejection notification",
        );
      });

    this.repo
      .getEmailByAccountId(result.accountId)
      .then((email) => {
        if (email) {
          return this.emailService.sendKybDecisionEmail(
            email,
            result.legalName?.trim() || result.username,
            "rejected",
            adminNote,
          );
        }
      })
      .catch((err) => {
        this.logger.warn({ err, profileId }, "[OjcOrganizationKybService] Failed to send KYB rejection email");
      });

    return result;
  }

  public async rejectStalePending(
    profileId: string,
    actor: { adminUserId: string; adminEmail: string; ipAddress: string },
  ): Promise<KybSubmission | null> {
    const submission = await this.repo.getByProfileId(profileId);
    if (!submission) return null;

    if (submission.status !== "pending") {
      throw new Error("Only pending KYB submissions can be rejected from this action.");
    }

    const submittedAt = new Date(submission.submittedAt).getTime();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(submittedAt) || Date.now() - submittedAt < oneWeekMs) {
      throw new Error("This KYB submission is not older than 7 days yet.");
    }

    return this.reject(
      profileId,
      "KYB verification was declined because the submission remained pending for more than 7 days.",
      actor,
    );
  }
}
