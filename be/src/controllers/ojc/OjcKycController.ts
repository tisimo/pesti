import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcKycService from "../../services/ojc/OjcKycService";
import IAuditLogService from "../../services/IServices/IAuditLogService";
import { extractActor } from "../utils/extractActor";
import { respondWithControllerError } from "../utils/serviceErrorResponse";
import Logger from "../../loaders/logger";

@Service()
export default class OjcKycController {
  constructor(
    @Inject("ojcKycService") private readonly service: OjcKycService,
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
  ) {}

  public list = async (req: Request, res: Response): Promise<Response> => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
      const comparison = typeof req.query.comparison === "string" ? req.query.comparison : undefined;
      const documentType = typeof req.query.documentType === "string" ? req.query.documentType : undefined;
      const country = typeof req.query.country === "string" ? req.query.country : undefined;
      const overdue = req.query.overdue === "true";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const result = await this.service.list({
        status,
        search: search || undefined,
        comparison: comparison === "mismatch" || comparison === "match" || comparison === "no_provider" ? comparison : undefined,
        documentType,
        country,
        overdue,
      }, page, pageSize);
      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC KYC queue",
        fallbackMessage: "Unable to load KYC queue. Check shared verification tables and OJC profile links.",
      });
    }
  };

  public sendMismatchWarning = async (req: Request, res: Response): Promise<Response> => {
    try {
      const verificationId = typeof req.params.verificationId === "string" ? req.params.verificationId : "";
      const { message } = req.body as { message?: string };
      const trimmedMessage = message?.trim();

      if (!verificationId) return res.status(400).json({ message: "Verification ID is required" });
      if (!trimmedMessage) return res.status(400).json({ message: "A warning message is required" });

      const entry = await this.service.sendMismatchWarningEmail(verificationId, trimmedMessage);
      if (!entry) return res.status(404).json({ message: "Verification not found" });

      this.auditLogService
        .log({
          ...extractActor(req),
          action: "KYC_MISMATCH_WARNING_SENT",
          targetType: "kyc",
          targetId: entry.verificationId,
          targetLabel: entry.email ?? entry.username ?? entry.accountId,
          details: {
            accountId: entry.accountId,
            email: entry.email,
            username: entry.username,
            mismatchCount: entry.comparison.mismatchCount,
            messageLength: trimmedMessage.length,
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, verificationId }, "[OjcKycController] Failed to write mismatch audit log");
        });

      return res.status(200).json({ ok: true, entry });
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Sending KYC profile mismatch warning email",
        fallbackMessage: "Unable to send the KYC warning email. Check the linked email address and email provider configuration.",
      });
    }
  };

  public deactivateAccount = async (req: Request, res: Response): Promise<Response> => {
    try {
      const verificationId = typeof req.params.verificationId === "string" ? req.params.verificationId : "";
      const { message } = req.body as { message?: string };
      const trimmedMessage = message?.trim();

      if (!verificationId) return res.status(400).json({ message: "Verification ID is required" });

      const entry = await this.service.deactivateAccount(verificationId, trimmedMessage);
      if (!entry) return res.status(404).json({ message: "Verification not found" });

      this.auditLogService
        .log({
          ...extractActor(req),
          action: "KYC_ACCOUNT_DEACTIVATED",
          targetType: "kyc",
          targetId: entry.verificationId,
          targetLabel: entry.email ?? entry.username ?? entry.accountId,
          details: {
            accountId: entry.accountId,
            email: entry.email,
            username: entry.username,
            mismatchCount: entry.comparison.mismatchCount,
            teamMessage: trimmedMessage || null,
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, verificationId }, "[OjcKycController] Failed to write deactivation audit log");
        });

      return res.status(200).json({ ok: true, entry });
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Deactivating account from KYC review",
        fallbackMessage: "Unable to deactivate this account from KYC review. Check the linked account record.",
      });
    }
  };

  public activateAccount = async (req: Request, res: Response): Promise<Response> => {
    try {
      const verificationId = typeof req.params.verificationId === "string" ? req.params.verificationId : "";

      if (!verificationId) return res.status(400).json({ message: "Verification ID is required" });

      const entry = await this.service.activateAccount(verificationId);
      if (!entry) return res.status(404).json({ message: "Verification not found" });

      this.auditLogService
        .log({
          ...extractActor(req),
          action: "KYC_ACCOUNT_ACTIVATED",
          targetType: "kyc",
          targetId: entry.verificationId,
          targetLabel: entry.email ?? entry.username ?? entry.accountId,
          details: {
            accountId: entry.accountId,
            email: entry.email,
            username: entry.username,
            mismatchCount: entry.comparison.mismatchCount,
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, verificationId }, "[OjcKycController] Failed to write activation audit log");
        });

      return res.status(200).json({ ok: true, entry });
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Activating account from KYC review",
        fallbackMessage: "Unable to activate this account from KYC review. Check the linked account record.",
      });
    }
  };

  public resetStaleSubmission = async (req: Request, res: Response): Promise<Response> => {
    try {
      const verificationId = typeof req.params.verificationId === "string" ? req.params.verificationId : "";

      if (!verificationId) return res.status(400).json({ message: "Verification ID is required" });

      const entry = await this.service.resetStalePendingSubmission(verificationId);
      if (!entry) return res.status(404).json({ message: "Verification not found" });

      this.auditLogService
        .log({
          ...extractActor(req),
          action: "KYC_VERIFICATION_RESET",
          targetType: "kyc",
          targetId: entry.verificationId,
          targetLabel: entry.email ?? entry.username ?? entry.accountId,
          details: {
            accountId: entry.accountId,
            profileId: entry.profileId,
            email: entry.email,
            username: entry.username,
            submittedAt: entry.createdAt,
            previousStatus: entry.status,
            resetReason: "Pending submission older than 7 days",
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, verificationId }, "[OjcKycController] Failed to write stale reset audit log");
        });

      return res.status(200).json({ ok: true, removedVerificationId: entry.verificationId, entry });
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Resetting stale KYC submission",
        fallbackMessage: "Unable to reset this KYC submission. Check the verification status and submission age.",
      });
    }
  };
}
