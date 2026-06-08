import { Router } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import IAuditLogController from "../../controllers/IControllers/IAuditLogController";

const route = Router();

export default (app: Router) => {
  app.use("/auth", route);

  const controller = Container.get("auditLogController") as IAuditLogController;

  route.post(
    "/login-failed",
    celebrate({
      body: Joi.object({
        email: Joi.string().min(1).required(),
        reason: Joi.string().min(1).required(),
        ipAddress: Joi.string().trim().optional(),
      }),
    }),
    (req, res) => controller.logLoginFailed(req, res),
  );

  route.post(
    "/login-success-ip",
    celebrate({
      body: Joi.object({
        ipAddress: Joi.string().trim().optional(),
      }),
    }),
    (req, res) => controller.attachIpToLoginSuccess(req, res),
  );
};
