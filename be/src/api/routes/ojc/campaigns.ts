import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import OjcCampaignsController from "../../../controllers/ojc/OjcCampaignsController";
import { requirePermission } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/campaigns", route);

  const controller = Container.get("ojcCampaignsController") as OjcCampaignsController;

  route.get("", requirePermission("view_campaigns", "approve_reject", "view_reports", "respond"), (req, res) => controller.list(req, res));

  route.get(
    "/:id",
    requirePermission("view_campaigns", "approve_reject", "view_reports", "respond"),
    celebrate({ params: Joi.object({ id: Joi.string().uuid().required() }) }),
    (req, res) => controller.get(req, res),
  );

  route.patch(
    "/:id/status",
    requirePermission("approve_reject"),
    celebrate({
      params: Joi.object({ id: Joi.string().uuid().required() }),
      body: Joi.object({
        status: Joi.string().valid("PENDING", "ACTIVE", "INACTIVE", "FINISHED", "REJECTED", "REVIEWING").required(),
        reviewMessage: Joi.string().max(500).optional(),
      }),
    }),
    (req, res) => controller.updateStatus(req, res),
  );
};
