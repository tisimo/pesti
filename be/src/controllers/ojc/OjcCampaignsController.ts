import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcCampaignsService from "../../services/ojc/OjcCampaignsService";
import IAuditLogService from "../../services/IServices/IAuditLogService";
import { CampaignStatus } from "../../repos/ojc/OjcCampaignsRepo";
import { extractActor } from "../utils/extractActor";
import { respondWithControllerError, respondWithServiceError } from "../utils/serviceErrorResponse";
import Logger from "../../loaders/logger";

const VALID_STATUSES: CampaignStatus[] = ["PENDING", "ACTIVE", "INACTIVE", "FINISHED", "REJECTED", "REVIEWING"];
const REQUIRES_MESSAGE: CampaignStatus[] = ["REJECTED", "REVIEWING"];
const CODE_STATUS_MAP = {
  LIVE_UPDATE_CONFLICT: 409,
} as const;

@Service()
export default class OjcCampaignsController {
  constructor(
    @Inject("ojcCampaignsService") private readonly service: OjcCampaignsService,
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
  ) {}

  public list = async (req: Request, res: Response): Promise<Response> => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const result = await this.service.listCampaigns(status, category, search, page, pageSize);
      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC campaigns",
        fallbackMessage: "Unable to load campaigns. Check the OJC database connection and schema.",
      });
    }
  };

  public get = async (req: Request, res: Response): Promise<Response> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const campaign = await this.service.getCampaign(id);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      return res.status(200).json(campaign);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC campaign details",
        fallbackMessage: "Unable to load this campaign. Check the campaign record and OJC database schema.",
      });
    }
  };

  public updateStatus = async (req: Request, res: Response): Promise<Response> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, reviewMessage } = req.body as { status: CampaignStatus; reviewMessage?: string };

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid campaign status" });
    }
    if (REQUIRES_MESSAGE.includes(status) && !reviewMessage?.trim()) {
      return res.status(400).json({
        message: status === "REJECTED"
          ? "Rejection reason is required when rejecting a campaign"
          : "A message is required when requesting changes",
      });
    }

    try {
      const actor = extractActor(req);
      const result = await this.service.updateStatus(id, status, reviewMessage?.trim(), actor.adminUserId);
      if (!result) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      this.auditLogService
        .log({
          ...actor,
          action: "CAMPAIGN_STATUS_CHANGED",
          targetType: "campaign",
          targetId: id,
          targetLabel: result.title,
          details: {
            previousStatus: result.previousStatus,
            nextStatus: result.nextStatus,
            previousReviewMessage: result.previousReviewMessage,
            nextReviewMessage: result.nextReviewMessage,
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, campaignId: id }, "[OjcCampaignsController] Failed to write status audit log");
        });
      return res.status(204).send();
    } catch (error) {
      return respondWithServiceError(res, error, 500, CODE_STATUS_MAP);
    }
  };
}
