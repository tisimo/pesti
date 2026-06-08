import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import OjcOrganizationsController from "../../../controllers/ojc/OjcOrganizationsController";
import { requirePermission } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/organizations", route);

  const controller = Container.get("ojcOrganizationsController") as OjcOrganizationsController;

  route.get("", requirePermission("view_organizations", "view_kyb"), (req, res) => controller.list(req, res));
  route.get("/:profileId", requirePermission("view_organizations", "view_kyb"), (req, res) => controller.get(req, res));

  route.get("/:profileId/kyb", requirePermission("view_kyb"), (req, res) => controller.getKyb(req, res));

  route.patch(
    "/:profileId/account-status",
    requirePermission("block_suspend"),
    celebrate({
      params: Joi.object({ profileId: Joi.string().uuid().required() }),
      body: Joi.object({
        status: Joi.string().valid("ACTIVE", "INACTIVE").required(),
        message: Joi.string().max(500).allow("").optional(),
      }),
    }),
    (req, res) => controller.updateAccountStatus(req, res),
  );

  route.post(
    "/:profileId/kyb/approve",
    requirePermission("view_kyb"),
    celebrate({
      params: Joi.object({ profileId: Joi.string().uuid().required() }),
      body: Joi.object({ adminNote: Joi.string().max(1000).allow("").optional() }),
    }),
    (req, res) => controller.approveKyb(req, res),
  );

  route.post(
    "/:profileId/kyb/reject",
    requirePermission("view_kyb"),
    celebrate({
      params: Joi.object({ profileId: Joi.string().uuid().required() }),
      body: Joi.object({ adminNote: Joi.string().min(1).max(1000).required() }),
    }),
    (req, res) => controller.rejectKyb(req, res),
  );

  route.post(
    "/:profileId/kyb/reject-stale",
    requirePermission("view_kyb"),
    celebrate({
      params: Joi.object({ profileId: Joi.string().uuid().required() }),
    }),
    (req, res) => controller.rejectStaleKyb(req, res),
  );
};
