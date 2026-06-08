import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcUsersService from "../../services/ojc/OjcUsersService";
import IAuditLogService from "../../services/IServices/IAuditLogService";
import { getStringParam } from "../utils/requestParams";
import { extractActor } from "../utils/extractActor";
import { respondWithControllerError } from "../utils/serviceErrorResponse";
import Logger from "../../loaders/logger";

function buildStatusAuditDetails(
  updated: {
    accountId: string;
    profileId: string | null;
    email: string | null;
    username: string | null;
    previousStatus: "ACTIVE" | "INACTIVE";
    nextStatus: "ACTIVE" | "INACTIVE";
    previousStrikeCount: number;
    nextStrikeCount: number;
    clearedStrikes: boolean;
  },
  deactivationMessage?: string,
): Record<string, unknown> {
  const trimmedMessage = deactivationMessage?.trim();
  const previewLimit = 160;

  return {
    accountId: updated.accountId,
    profileId: updated.profileId,
    email: updated.email,
    username: updated.username,
    previousStatus: updated.previousStatus,
    nextStatus: updated.nextStatus,
    previousStrikeCount: updated.previousStrikeCount,
    nextStrikeCount: updated.nextStrikeCount,
    clearedStrikes: updated.clearedStrikes,
    teamMessage: trimmedMessage || null,
    teamMessageLength: trimmedMessage?.length ?? 0,
    teamMessagePreview: trimmedMessage
      ? trimmedMessage.length > previewLimit
        ? `${trimmedMessage.slice(0, previewLimit).trimEnd()}...`
        : trimmedMessage
      : null,
  };
}

function buildStrikeAuditDetails(
  updated: {
    accountId: string;
    profileId: string | null;
    email: string | null;
    username: string | null;
    previousStatus: "ACTIVE" | "INACTIVE";
    nextStatus: "ACTIVE" | "INACTIVE";
    previousStrikeCount: number;
    nextStrikeCount: number;
    operation: "ADD_ONE" | "REMOVE_ONE" | "CLEAR_ALL";
  },
  reason?: string,
): Record<string, unknown> {
  const trimmedReason = reason?.trim();
  const previewLimit = 160;

  return {
    accountId: updated.accountId,
    profileId: updated.profileId,
    email: updated.email,
    username: updated.username,
    previousStatus: updated.previousStatus,
    nextStatus: updated.nextStatus,
    previousStrikeCount: updated.previousStrikeCount,
    nextStrikeCount: updated.nextStrikeCount,
    operation: updated.operation,
    reason: trimmedReason || null,
    reasonLength: trimmedReason?.length ?? 0,
    reasonPreview: trimmedReason
      ? trimmedReason.length > previewLimit
        ? `${trimmedReason.slice(0, previewLimit).trimEnd()}...`
        : trimmedReason
      : null,
  };
}

@Service()
export default class OjcUsersController {
  constructor(
    @Inject("ojcUsersService") private readonly service: OjcUsersService,
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
  ) {}

  public list = async (req: Request, res: Response): Promise<Response> => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const type =
        req.query.type === "DONOR" || req.query.type === "CREATOR"
          ? (req.query.type as "DONOR" | "CREATOR")
          : undefined;
      const kycStatus =
        req.query.kycStatus === "PENDING" ||
        req.query.kycStatus === "VERIFIED" ||
        req.query.kycStatus === "DECLINED" ||
        req.query.kycStatus === "NONE"
          ? (req.query.kycStatus as "PENDING" | "VERIFIED" | "DECLINED" | "NONE")
          : undefined;
      const strikedOnly = req.query.strikedOnly === "true";
      const order =
        req.query.order === "asc" || req.query.order === "desc" ? (req.query.order as "asc" | "desc") : "desc";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const result = await this.service.listUsers(search, type, kycStatus, strikedOnly, order, page, pageSize);
      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC users",
        fallbackMessage: "Unable to load users. Check the OJC/shared database connection and user profile schema.",
      });
    }
  };

  public get = async (req: Request, res: Response): Promise<Response> => {
    try {
      const profileId = getStringParam(req.params.profileId);
      if (!profileId) return res.status(400).json({ message: "Missing profileId" });
      const profile = await this.service.getUserProfile(profileId);
      if (!profile) return res.status(404).json({ message: "User not found" });
      return res.status(200).json(profile);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC user profile",
        fallbackMessage: "Unable to load this user profile. Check that the profile and account records are available.",
      });
    }
  };

  public updateStatus = async (req: Request, res: Response): Promise<Response> => {
    try {
      const profileId = getStringParam(req.params.profileId);
      if (!profileId) return res.status(400).json({ message: "Missing profileId" });
      const { accountId, status, clearStrikesOnActivate, deactivationMessage } = req.body as {
        accountId?: string;
        status?: string;
        clearStrikesOnActivate?: boolean;
        deactivationMessage?: string;
      };
      if (!accountId || (status !== "ACTIVE" && status !== "INACTIVE")) {
        return res.status(400).json({ message: "Invalid payload" });
      }
      const updated = await this.service.updateUserStatus(accountId, status, {
        clearStrikesOnActivate: status === "ACTIVE" && clearStrikesOnActivate === true,
        deactivationMessage,
      });
      if (!updated) return res.status(404).json({ message: "Account not found" });
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "OJC_USER_STATUS_CHANGED",
          targetType: "user",
          targetId: updated.profileId ?? profileId,
          targetLabel: updated.username ?? updated.email ?? profileId,
          details: buildStatusAuditDetails(
            {
              ...updated,
              accountId,
              profileId: updated.profileId ?? profileId,
            },
            deactivationMessage,
          ),
        })
        .catch((error) => {
          Logger.warn({ err: error, profileId }, "[OjcUsersController] Failed to write status audit log");
        });
      return res.status(200).json({ ok: true });
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Updating OJC user account status",
        fallbackMessage: "Unable to update this user status. Check the linked account record and database connection.",
      });
    }
  };

  public updateStrikes = async (req: Request, res: Response): Promise<Response> => {
    try {
      const profileId = getStringParam(req.params.profileId);
      if (!profileId) return res.status(400).json({ message: "Missing profileId" });

      const { accountId, operation, reason } = req.body as {
        accountId?: string;
        operation?: "ADD_ONE" | "REMOVE_ONE" | "CLEAR_ALL";
        reason?: string;
      };
      const trimmedReason = typeof reason === "string" ? reason.trim() : "";

      if (!accountId || (operation !== "ADD_ONE" && operation !== "REMOVE_ONE" && operation !== "CLEAR_ALL")) {
        return res.status(400).json({ message: "Invalid payload" });
      }
      if (operation === "ADD_ONE" && !trimmedReason) {
        return res.status(400).json({ message: "A reason is required when recording a strike." });
      }

      const updated = await this.service.updateUserStrikes(accountId, operation, trimmedReason);
      if (!updated) return res.status(404).json({ message: "Account not found" });

      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "OJC_USER_STRIKES_UPDATED",
          targetType: "user",
          targetId: updated.profileId ?? profileId,
          targetLabel: updated.username ?? updated.email ?? profileId,
          details: buildStrikeAuditDetails(
            {
              ...updated,
              accountId,
              profileId: updated.profileId ?? profileId,
            },
            trimmedReason,
          ),
        })
        .catch((error) => {
          Logger.warn({ err: error, profileId }, "[OjcUsersController] Failed to write strikes audit log");
        });

      return res.status(200).json({
        ok: true,
        strikeCount: updated.nextStrikeCount,
        accountStatus: updated.nextStatus,
      });
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Updating OJC user strikes",
        fallbackMessage: "Unable to update this user's strikes. Check that strike moderation is migrated in production.",
      });
    }
  };
}
