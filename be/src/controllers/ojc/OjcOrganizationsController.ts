import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcOrganizationsService from "../../services/ojc/OjcOrganizationsService";
import OjcOrganizationKybService from "../../services/ojc/OjcOrganizationKybService";
import IAuditLogService from "../../services/IServices/IAuditLogService";
import EmailService from "../../services/EmailService";
import { getStringParam } from "../utils/requestParams";
import { extractActor } from "../utils/extractActor";
import { respondWithControllerError } from "../utils/serviceErrorResponse";
import Logger from "../../loaders/logger";

@Service()
export default class OjcOrganizationsController {
  constructor(
    @Inject("ojcOrganizationsService") private readonly service: OjcOrganizationsService,
    @Inject("ojcOrganizationKybService") private readonly kybService: OjcOrganizationKybService,
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
    @Inject("emailService") private readonly emailService: EmailService,
  ) {}

  public list = async (req: Request, res: Response): Promise<Response> => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const organizationType =
        typeof req.query.organizationType === "string" ? req.query.organizationType : undefined;
      const accountStatus =
        typeof req.query.accountStatus === "string" ? req.query.accountStatus : undefined;
      const order =
        req.query.order === "asc" || req.query.order === "desc"
          ? (req.query.order as "asc" | "desc")
          : "desc";
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 18));

      const result = await this.service.listOrganizations(
        search,
        organizationType,
        accountStatus,
        order,
        page,
        pageSize,
      );

      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC organizations",
        fallbackMessage: "Unable to load organizations. Check organization profile columns and shared account data.",
      });
    }
  };

  public get = async (req: Request, res: Response): Promise<Response> => {
    try {
      const profileId = getStringParam(req.params.profileId);
      if (!profileId) return res.status(400).json({ message: "Missing profileId" });

      const organization = await this.service.getOrganizationProfile(profileId);
      if (!organization) return res.status(404).json({ message: "Organization not found" });

      return res.status(200).json(organization);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC organization profile",
        fallbackMessage: "Unable to load this organization profile. Check the profile record and organization schema.",
      });
    }
  };

  public getKyb = async (req: Request, res: Response): Promise<Response> => {
    try {
      const profileId = getStringParam(req.params.profileId);
      if (!profileId) return res.status(400).json({ message: "Missing profileId" });

      const submission = await this.kybService.getByProfileId(profileId);
      if (!submission) return res.status(404).json({ message: "No KYB submission found" });

      return res.status(200).json(submission);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC KYB submission",
        fallbackMessage: "Unable to load this KYB submission. Check that the organization KYB table exists.",
      });
    }
  };

  public approveKyb = async (req: Request, res: Response): Promise<Response> => {
    try {
      const profileId = getStringParam(req.params.profileId);
      if (!profileId) return res.status(400).json({ message: "Missing profileId" });

      const adminNote = typeof req.body.adminNote === "string" ? req.body.adminNote.trim() || null : null;
      const result = await this.kybService.approve(profileId, adminNote, extractActor(req));
      if (!result) return res.status(404).json({ message: "No KYB submission found" });

      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Approving OJC KYB submission",
        fallbackMessage: "Unable to approve this KYB submission. Check the submission record and organization account data.",
      });
    }
  };

  public rejectKyb = async (req: Request, res: Response): Promise<Response> => {
    try {
      const profileId = getStringParam(req.params.profileId);
      if (!profileId) return res.status(400).json({ message: "Missing profileId" });

      const adminNote = typeof req.body.adminNote === "string" ? req.body.adminNote.trim() : "";
      if (!adminNote) return res.status(400).json({ message: "A rejection reason is required" });

      const result = await this.kybService.reject(profileId, adminNote, extractActor(req));
      if (!result) return res.status(404).json({ message: "No KYB submission found" });

      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Rejecting OJC KYB submission",
        fallbackMessage: "Unable to reject this KYB submission. Check the submission record and organization account data.",
      });
    }
  };

  public rejectStaleKyb = async (req: Request, res: Response): Promise<Response> => {
    try {
      const profileId = getStringParam(req.params.profileId);
      if (!profileId) return res.status(400).json({ message: "Missing profileId" });

      const result = await this.kybService.rejectStalePending(profileId, extractActor(req));
      if (!result) return res.status(404).json({ message: "No KYB submission found" });

      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Rejecting stale OJC KYB submission",
        fallbackMessage: "Unable to reject this stale KYB submission. Check the submission status and age.",
      });
    }
  };

  public updateAccountStatus = async (req: Request, res: Response): Promise<Response> => {
    try {
      const profileId = getStringParam(req.params.profileId);
      if (!profileId) return res.status(400).json({ message: "Missing profileId" });

      const { status, message } = req.body as { status?: string; message?: string };
      if (status !== "ACTIVE" && status !== "INACTIVE") {
        return res.status(400).json({ message: "Invalid status" });
      }

      const result = await this.service.updateAccountStatus(profileId, status);
      if (!result) return res.status(404).json({ message: "Organization not found" });

      const actor = extractActor(req);
      const orgLabel = result.legalName?.trim() || result.username;

      this.auditLogService
        .log({
          ...actor,
          action: status === "ACTIVE" ? "ORG_ACCOUNT_ACTIVATED" : "ORG_ACCOUNT_DEACTIVATED",
          targetType: "organization",
          targetId: profileId,
          targetLabel: orgLabel,
          details: { accountId: result.accountId, previousStatus: result.previousStatus, nextStatus: status, message: message?.trim() || null },
        })
        .catch((error) => {
          Logger.warn({ err: error, profileId }, "[OjcOrganizationsController] Failed to write status audit log");
        });

      if (result.email) {
        this.emailService
          .sendOrgAccountStatusEmail(result.email, orgLabel, status, message?.trim())
          .catch((error) => {
            Logger.warn({ err: error, profileId }, "[OjcOrganizationsController] Failed to send org status email");
          });
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Updating OJC organization account status",
        fallbackMessage: "Unable to update organization account status. Check the linked account record.",
      });
    }
  };
}
