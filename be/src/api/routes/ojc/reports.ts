import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import OjcReportsController from "../../../controllers/ojc/OjcReportsController";
import { requirePermission } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/reports", route);

  const controller = Container.get("ojcReportsController") as OjcReportsController;

  route.get("", requirePermission("view_reports", "respond", "flag_escalate", "block_suspend"), (req, res) => controller.list(req, res));

  route.get(
    "/:id",
    requirePermission("view_reports", "respond", "flag_escalate", "block_suspend"),
    celebrate({ params: Joi.object({ id: Joi.string().uuid().required() }) }),
    (req, res) => controller.getById(req, res),
  );

  route.patch(
    "/:id/status",
    requirePermission("approve_reject", "block_suspend", "respond"),
    celebrate({
      params: Joi.object({ id: Joi.string().uuid().required() }),
      body: Joi.object({
        status: Joi.string().valid("OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED").required(),
        resolutionNote: Joi.string().max(500).optional(),
      }),
    }),
    (req, res) => controller.updateStatus(req, res),
  );

  route.post(
    "/:id/action",
    celebrate({
      params: Joi.object({ id: Joi.string().uuid().required() }),
      body: Joi.object({
        action: Joi.string().valid("REJECT_REPORT", "ACCEPT_REPORT", "WARN_CREATOR", "REQUEST_CHANGE").required(),
        message: Joi.string().max(1000).optional(),
        resolve: Joi.boolean().optional(),
        applyStrike: Joi.boolean().optional(),
      }),
    }),
    requirePermission("approve_reject", "block_suspend", "respond"),
    (req, res) => controller.notifyReporter(req, res),
  );

  route.get(
    "/:id/notes",
    requirePermission("view_reports", "respond", "flag_escalate", "block_suspend"),
    celebrate({ params: Joi.object({ id: Joi.string().uuid().required() }) }),
    (req, res) => controller.getNotes(req, res),
  );

  route.post(
    "/:id/notes",
    requirePermission("approve_reject", "block_suspend", "respond"),
    celebrate({
      params: Joi.object({ id: Joi.string().uuid().required() }),
      body: Joi.object({ note: Joi.string().min(1).max(2000).required() }),
    }),
    (req, res) => controller.addNote(req, res),
  );
};
