import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import OjcWithdrawalsController from "../../../controllers/ojc/OjcWithdrawalsController";
import { requirePermission } from "../../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/ojc/withdrawals", route);

  const controller = Container.get("ojcWithdrawalsController") as OjcWithdrawalsController;

  route.get("", requirePermission("view_withdrawals", "process_withdrawals"), (req, res) => controller.list(req, res));

  route.patch(
    "/:id/status",
    requirePermission("process_withdrawals"),
    celebrate({
      params: Joi.object({ id: Joi.string().uuid().required() }),
      body: Joi.object({
        status: Joi.string().valid("COMPLETED", "FAILED").required(),
        note: Joi.string().max(500).optional(),
      }),
    }),
    (req, res) => controller.updateStatus(req, res),
  );
};
