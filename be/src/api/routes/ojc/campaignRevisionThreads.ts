import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import OjcCampaignRevisionController from "../../../controllers/ojc/OjcCampaignRevisionController";
import { requirePermission } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/campaign-revision-threads", route);

  const controller = Container.get("ojcCampaignRevisionController") as OjcCampaignRevisionController;

  route.get(
    "",
    requirePermission("approve_reject", "respond", "flag_escalate", "block_suspend"),
    celebrate({
      query: Joi.object({
        status: Joi.string()
          .valid("pending", "changes_requested", "approved", "rejected", "cancelled")
          .optional(),
        type: Joi.string().valid("initial_approval", "live_update").optional(),
        campaignId: Joi.string().uuid().optional(),
        search: Joi.string().trim().max(120).optional(),
        page: Joi.number().integer().min(1).optional(),
        pageSize: Joi.number().integer().min(1).max(100).optional(),
      }),
    }),
    (req, res) => controller.list(req, res),
  );

  route.get(
    "/:threadId",
    requirePermission("approve_reject", "respond", "flag_escalate", "block_suspend"),
    celebrate({
      params: Joi.object({ threadId: Joi.string().uuid().required() }),
    }),
    (req, res) => controller.getById(req, res),
  );

  route.post(
    "/:threadId/approve",
    requirePermission("approve_reject"),
    celebrate({
      params: Joi.object({ threadId: Joi.string().uuid().required() }),
      body: Joi.object({
        message: Joi.string().trim().max(1000).allow("").optional(),
      }),
    }),
    (req, res) => controller.approve(req, res),
  );

  route.post(
    "/:threadId/request-changes",
    requirePermission("approve_reject"),
    celebrate({
      params: Joi.object({ threadId: Joi.string().uuid().required() }),
      body: Joi.object({
        message: Joi.string().trim().max(1000).required(),
      }),
    }),
    (req, res) => controller.requestChanges(req, res),
  );

  route.post(
    "/:threadId/reject",
    requirePermission("approve_reject"),
    celebrate({
      params: Joi.object({ threadId: Joi.string().uuid().required() }),
      body: Joi.object({
        message: Joi.string().trim().max(1000).required(),
      }),
    }),
    (req, res) => controller.reject(req, res),
  );
};
