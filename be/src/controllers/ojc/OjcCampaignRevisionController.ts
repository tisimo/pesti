import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcCampaignRevisionService from "../../services/ojc/OjcCampaignRevisionService";
import IAuditLogService from "../../services/IServices/IAuditLogService";
import { extractActor } from "../utils/extractActor";
import { respondWithControllerError, respondWithServiceError } from "../utils/serviceErrorResponse";
import Logger from "../../loaders/logger";

const codeStatusMap = {
  INVALID_STATE: 409,
} as const;

type CampaignRevisionReviewAction = "approved" | "changes_requested" | "rejected";

function buildRevisionAuditAction(action: CampaignRevisionReviewAction) {
  if (action === "changes_requested") return "CAMPAIGN_REVISION_CHANGES_REQUESTED" as const;
  if (action === "rejected") return "CAMPAIGN_REVISION_REJECTED" as const;
  return "CAMPAIGN_REVISION_APPROVED" as const;
}

function buildRevisionAuditDetails(
  action: CampaignRevisionReviewAction,
  detail: Awaited<ReturnType<OjcCampaignRevisionService["getThreadDetail"]>>,
  message?: string,
) {
  if (!detail) return {};

  const reviewMessage = message?.trim() || detail.lastAdminMessage || undefined;
  const statusLabel = action === "changes_requested" ? "changes_requested" : action;

  return {
    threadId: detail.threadId,
    campaignId: detail.campaignId,
    threadType: detail.type,
    previousThreadStatus: "pending",
    nextThreadStatus: statusLabel,
    submissionId: detail.latestSubmissionId,
    submissionNumber: detail.latestSubmissionNumber,
    moderationMessage: reviewMessage,
  };
}

@Service()
export default class OjcCampaignRevisionController {
  constructor(
    @Inject("ojcCampaignRevisionService") private readonly service: OjcCampaignRevisionService,
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
  ) {}

  public list = async (req: Request, res: Response): Promise<Response> => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const type = typeof req.query.type === "string" ? req.query.type : undefined;
      const campaignId = typeof req.query.campaignId === "string" ? req.query.campaignId : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));

      const result = await this.service.listThreads({
        status: status as Parameters<OjcCampaignRevisionService["listThreads"]>[0]["status"],
        type: type as Parameters<OjcCampaignRevisionService["listThreads"]>[0]["type"],
        campaignId,
        search,
        page,
        pageSize,
      });

      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading campaign revision threads",
        fallbackMessage: "Unable to load campaign revision threads. Check that revision tables exist in the OJC database.",
      });
    }
  };

  public getById = async (req: Request, res: Response): Promise<Response> => {
    const threadId = Array.isArray(req.params.threadId) ? req.params.threadId[0] : req.params.threadId;

    try {
      const detail = await this.service.getThreadDetail(threadId);
      if (!detail) return res.status(404).json({ message: "Campaign revision thread not found" });
      return res.status(200).json(detail);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading campaign revision thread detail",
        fallbackMessage: "Unable to load this revision thread. Check that revision tables and campaign records are available.",
      });
    }
  };

  public approve = async (req: Request, res: Response): Promise<Response> => {
    return this.handleModeration(req, res, "approved");
  };

  public requestChanges = async (req: Request, res: Response): Promise<Response> => {
    return this.handleModeration(req, res, "changes_requested");
  };

  public reject = async (req: Request, res: Response): Promise<Response> => {
    return this.handleModeration(req, res, "rejected");
  };

  private async handleModeration(
    req: Request,
    res: Response,
    action: CampaignRevisionReviewAction,
  ): Promise<Response> {
    const threadId = Array.isArray(req.params.threadId) ? req.params.threadId[0] : req.params.threadId;
    const bodyMessage = typeof req.body?.message === "string" ? req.body.message.trim() : undefined;

    try {
      const actor = extractActor(req);
      const detail = await this.service.moderateThread(threadId, action, actor.adminUserId, bodyMessage);
      if (!detail) return res.status(404).json({ message: "Campaign revision thread not found" });

      this.auditLogService
        .log({
          ...actor,
          action: buildRevisionAuditAction(action),
          targetType: "campaign",
          targetId: detail.campaignId,
          targetLabel: detail.campaign.title,
          details: buildRevisionAuditDetails(action, detail, bodyMessage),
        })
        .catch((error) => {
          Logger.warn(
            { err: error, threadId: detail.threadId },
            "[OjcCampaignRevisionController] Failed to write moderation audit log",
          );
        });

      return res.status(200).json(detail);
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  }
}
