import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import PageGateController from "../../controllers/PageGateController";
import { requirePermission } from "../middlewares/requirePermission";

const route = Router();

export default (app: Router) => {
  app.use("/page-gates", route);

  const controller = Container.get("pageGateController") as PageGateController;

  // GET /api/page-gates?application=just_causes
  route.get(
    "",
    celebrate({
      query: Joi.object({
        application: Joi.string().valid("backoffice", "just_causes").optional(),
      }),
    }),
    (req, res) => controller.getAll(req, res),
  );

  // PUT /api/page-gates/:id
  route.put(
    "/:id",
    requirePermission("configure_roles"),
    celebrate({
      params: Joi.object({ id: Joi.string().min(1).required() }),
      body: Joi.object({
        requiredPermissions: Joi.array().items(Joi.string()).default([]),
      }),
    }),
    (req, res) => controller.update(req, res),
  );
};
