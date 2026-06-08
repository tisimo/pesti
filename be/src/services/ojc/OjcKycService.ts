import { Inject, Service } from "typedi";
import { randomUUID } from "crypto";
import OjcKycRepo, { KycEntry, KycListFilters, KycPage } from "../../repos/ojc/OjcKycRepo";
import EmailService from "../EmailService";
import OjcUsersService from "./OjcUsersService";
import NotificationsService from "../NotificationsService";
import Logger from "../../loaders/logger";

@Service()
export default class OjcKycService {
  constructor(
    @Inject("ojcKycRepo") private readonly repo: OjcKycRepo,
    @Inject("emailService") private readonly emailService: EmailService,
    @Inject("ojcUsersService") private readonly usersService: OjcUsersService,
    @Inject("notificationsService") private readonly notificationsService: NotificationsService,
  ) {}

  public async list(filters: KycListFilters, page: number, pageSize: number): Promise<KycPage> {
    return this.repo.list(filters, pageSize, (page - 1) * pageSize);
  }

  public async sendMismatchWarningEmail(verificationId: string, message: string): Promise<KycEntry | null> {
    const entry = await this.repo.getByVerificationId(verificationId);
    if (!entry) return null;
    if (!entry.email) {
      throw new Error("This verification does not have a linked email address.");
    }

    await this.emailService.sendKycProfileMismatchWarningEmail(entry.email, message);
    return entry;
  }

  public async deactivateAccount(verificationId: string, message?: string): Promise<KycEntry | null> {
    const entry = await this.repo.getByVerificationId(verificationId);
    if (!entry) return null;

    const result = await this.usersService.updateUserStatus(entry.accountId, "INACTIVE", {
      deactivationMessage: message,
    });
    if (!result) return null;

    return { ...entry, accountStatus: result.nextStatus };
  }

  public async activateAccount(verificationId: string): Promise<KycEntry | null> {
    const entry = await this.repo.getByVerificationId(verificationId);
    if (!entry) return null;

    const result = await this.usersService.updateUserStatus(entry.accountId, "ACTIVE");
    if (!result) return null;

    return { ...entry, accountStatus: result.nextStatus };
  }

  public async resetStalePendingSubmission(verificationId: string): Promise<KycEntry | null> {
    const entry = await this.repo.resetPendingVerification(verificationId);
    if (!entry) return null;

    if (entry.profileId) {
      this.notificationsService
        .createNotification({
          notificationId: randomUUID(),
          profileId: entry.profileId,
          type: "VERIFICATION",
          isRead: false,
          actorProfileId: entry.profileId,
          actorUsername: "System",
          actorAvatarUrl: null,
          relatedId: entry.verificationId,
          createdAt: new Date(),
          ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        })
        .catch((error) => {
          Logger.warn(
            { err: error, profileId: entry.profileId, verificationId: entry.verificationId },
            "[OjcKycService] Failed to create verification notification",
          );
        });
    }

    if (entry.email) {
      this.emailService.sendKycVerificationResetEmail(entry.email).catch((error) => {
        Logger.warn(
          { err: error, verificationId: entry.verificationId },
          "[OjcKycService] Failed to send KYC verification reset email",
        );
      });
    }

    return entry;
  }
}
