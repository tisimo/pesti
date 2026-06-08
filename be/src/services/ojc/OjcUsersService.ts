import { Inject, Service } from "typedi";
import OjcUsersRepo, { UsersPage, UserProfile, UserStatusUpdateResult, UserStrikeUpdateResult } from "../../repos/ojc/OjcUsersRepo";
import EmailService from "../EmailService";
import Logger from "../../loaders/logger";

@Service()
export default class OjcUsersService {
  constructor(
    @Inject("ojcUsersRepo") private readonly repo: OjcUsersRepo,
    @Inject("emailService") private readonly emailService: EmailService,
  ) {}

  public async listUsers(
    search: string | undefined,
    type: "DONOR" | "CREATOR" | undefined,
    kycStatus: "PENDING" | "VERIFIED" | "DECLINED" | "NONE" | undefined,
    strikedOnly: boolean,
    order: "asc" | "desc",
    page: number,
    pageSize: number,
  ): Promise<UsersPage> {
    const limit = pageSize;
    const offset = (page - 1) * pageSize;
    return this.repo.listUsers(search, type, kycStatus, strikedOnly, order, limit, offset);
  }

  public async getUserProfile(profileId: string): Promise<UserProfile | null> {
    return this.repo.getUserProfile(profileId);
  }

  public async updateUserStatus(
    accountId: string,
    status: "ACTIVE" | "INACTIVE",
    options?: { clearStrikesOnActivate?: boolean; deactivationMessage?: string },
  ): Promise<UserStatusUpdateResult | null> {
    const clearStrikesOnActivate = options?.clearStrikesOnActivate === true;
    const result = await this.repo.updateUserStatus(accountId, status, clearStrikesOnActivate);
    if (!result) return null;

    if (result.previousStatus !== result.nextStatus && result.email) {
      if (result.nextStatus === "ACTIVE") {
        this.emailService.sendAccountActivatedEmail(result.email, result.clearedStrikes).catch((error) => {
          Logger.warn({ err: error, accountId }, "[OjcUsersService] Failed to send account activated email");
        });
      } else {
        this.emailService
          .sendAccountDeactivatedEmail(result.email, options?.deactivationMessage)
          .catch((error) => {
            Logger.warn({ err: error, accountId }, "[OjcUsersService] Failed to send account deactivated email");
          });
      }
    }

    return result;
  }

  public async updateUserStrikes(
    accountId: string,
    operation: "ADD_ONE" | "REMOVE_ONE" | "CLEAR_ALL",
    reason?: string,
  ): Promise<UserStrikeUpdateResult | null> {
    const result = await this.repo.updateUserStrikes(accountId, operation);
    if (!result) return null;

    const strikeCountChanged = result.previousStrikeCount !== result.nextStrikeCount;
    if (strikeCountChanged && result.email) {
      if (operation === "CLEAR_ALL") {
        this.emailService.sendAllStrikesClearedEmail(result.email).catch((error) => {
          Logger.warn({ err: error, accountId }, "[OjcUsersService] Failed to send strikes cleared email");
        });
      } else if (operation === "ADD_ONE") {
        this.emailService
          .sendAccountStrikeRecordedEmail(
            result.email,
            result.nextStrikeCount,
            result.nextStatus === "INACTIVE",
            reason,
          )
          .catch((error) => {
            Logger.warn({ err: error, accountId }, "[OjcUsersService] Failed to send strike recorded email");
          });
      } else {
        this.emailService.sendSingleStrikeClearedEmail(result.email, result.nextStrikeCount).catch((error) => {
          Logger.warn({ err: error, accountId }, "[OjcUsersService] Failed to send strike cleared email");
        });
      }
    }

    return result;
  }
}
