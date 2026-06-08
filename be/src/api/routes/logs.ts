import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import { Container } from "typedi";
import IAuditLogController from "../../controllers/IControllers/IAuditLogController";
import { requirePermission } from "../middlewares/requirePermission";

const route = Router();

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth?.isSuperAdmin) {
    res.status(403).json({ message: "Forbidden: super admin only" });
    return;
  }
  next();
}

export default (app: Router) => {
  app.use("/logs", route);

  const controller = Container.get("auditLogController") as IAuditLogController;

  route.get(
    "",
    requirePermission("view_audit_logs", "view_admin_logs", "export"),
    celebrate({
      query: Joi.object({
        adminUserId: Joi.string().min(1).optional(),
        adminEmail: Joi.string().min(1).optional(),
        fromDate: Joi.string()
          .pattern(/^\d{4}-\d{2}-\d{2}$/)
          .allow("")
          .optional(),
        toDate: Joi.string()
          .pattern(/^\d{4}-\d{2}-\d{2}$/)
          .allow("")
          .optional(),
        action: Joi.string().min(1).optional(),
        actionIn: Joi.string().min(1).optional(),
        app: Joi.string().min(1).optional(),
        limit: Joi.number().integer().min(1).max(200).optional(),
        page: Joi.number().integer().min(1).optional(),
        sortDir: Joi.string().valid("asc", "desc").optional(),
        lastKey: Joi.string().optional(),
      }),
    }),
    (req, res) => controller.getAll(req, res),
  );

  route.get(
    "/audit-trail",
    requirePermission("view_admin_logs"),
    celebrate({
      query: Joi.object({
        adminUserId: Joi.string().min(1).optional(),
        adminEmail: Joi.string().min(1).optional(),
        fromDate: Joi.string()
          .pattern(/^\d{4}-\d{2}-\d{2}$/)
          .allow("")
          .optional(),
        toDate: Joi.string()
          .pattern(/^\d{4}-\d{2}-\d{2}$/)
          .allow("")
          .optional(),
        actionIn: Joi.string().min(1).optional(),
        app: Joi.string().min(1).optional(),
        limit: Joi.number().integer().valid(10, 25, 50, 100, 500).optional(),
        page: Joi.number().integer().min(1).optional(),
        sortDir: Joi.string().valid("asc", "desc").optional(),
        lastKey: Joi.string().optional(),
      }),
    }),
    (req, res) => controller.getAll(req, res),
  );

  route.post(
    "/audit-trail/purge-old",
    requireSuperAdmin,
    celebrate({
      body: Joi.object({
        beforeDate: Joi.string()
          .pattern(/^\d{4}-\d{2}-\d{2}$/)
          .required(),
        confirm: Joi.boolean().valid(true).required(),
      }),
    }),
    (req, res) => controller.purgeOld(req, res),
  );

  route.post(
    "/access-attempt",
    celebrate({
      body: Joi.object({
        app: Joi.string().min(1).required(),
        result: Joi.string().valid("success", "failed").required(),
        reason: Joi.string().allow("").optional(),
        ipAddress: Joi.string().trim().optional(),
      }),
    }),
    (req, res) => controller.logAccessAttempt(req, res),
  );
};
