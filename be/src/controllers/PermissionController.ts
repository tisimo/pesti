import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import IPermissionController from "./IControllers/IPermissionController";
import IPermissionService from "../services/IServices/IPermissionService";
import IAuditLogService from "../services/IServices/IAuditLogService";
import { respondWithServiceError } from "./utils/serviceErrorResponse";
import { extractActor } from "./utils/extractActor";
import Logger from "../loaders/logger";

const codeStatusMap = {
  PERMISSION_ALREADY_EXISTS: 409,
  INVALID_PERMISSION_NAME: 400,
  PERMISSION_NOT_FOUND: 404,
  PERMISSION_ALREADY_INACTIVE: 409,
  PERMISSION_ALREADY_ACTIVE: 409,
};

@Service()
export default class PermissionController implements IPermissionController {
  constructor(
    @Inject("permissionService") private readonly permissionService: IPermissionService,
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
  ) {}

  public getAll = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const permissions = await this.permissionService.getAll();
      return res.status(200).json(permissions);
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public getAllInactive = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const permissions = await this.permissionService.getAllInactive();
      return res.status(200).json(permissions);
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public getById = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const permission = await this.permissionService.getById(id);
      return res.status(200).json(permission);
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const categoryMap = ["view", "action", "admin"] as const;
      const category = categoryMap[req.body.category as 0 | 1 | 2];
      const permission = await this.permissionService.create(req.body.name, category, req.body.application);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "CREATE_PERMISSION",
          targetType: "permission",
          targetId: permission.id,
          targetLabel: permission.name,
          details: {
            name: permission.name,
            category: permission.category,
            application: permission.application,
            status: permission.status,
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, permissionId: permission.id }, "[PermissionController] Failed to write create audit log");
        });
      return res.status(201).json(permission);
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public update = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const currentPermission = await this.permissionService.getById(id);
      const categoryMap = ["view", "action", "admin"] as const;
      const input: { name?: string; category?: "view" | "action" | "admin"; application?: "backoffice" | "just_causes" } = {};
      if (typeof req.body.name !== "undefined") input.name = req.body.name;
      if (typeof req.body.category !== "undefined") input.category = categoryMap[req.body.category as 0 | 1 | 2];
      if (typeof req.body.application !== "undefined") input.application = req.body.application;
      const permission = await this.permissionService.update(id, input);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "UPDATE_PERMISSION",
          targetType: "permission",
          targetId: permission.id,
          targetLabel: permission.name,
          details: {
            previousName: currentPermission.name,
            nextName: permission.name,
            previousCategory: currentPermission.category,
            nextCategory: permission.category,
            previousApplication: currentPermission.application,
            nextApplication: permission.application,
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, permissionId: permission.id }, "[PermissionController] Failed to write update audit log");
        });
      return res.status(200).json(permission);
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public delete = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const permission = await this.permissionService.getById(id);
      await this.permissionService.delete(id);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "DEACTIVATE_PERMISSION",
          targetType: "permission",
          targetId: id,
          targetLabel: permission.name,
          details: {
            name: permission.name,
            category: permission.category,
            application: permission.application,
            previousStatus: permission.status,
            nextStatus: "INACTIVE",
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, permissionId: id }, "[PermissionController] Failed to write deactivate audit log");
        });
      return res.status(204).send();
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public reactivate = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const permission = await this.permissionService.reactivate(id);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "REACTIVATE_PERMISSION",
          targetType: "permission",
          targetId: permission.id,
          targetLabel: permission.name,
          details: {
            name: permission.name,
            category: permission.category,
            application: permission.application,
            previousStatus: "INACTIVE",
            nextStatus: permission.status,
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, permissionId: permission.id }, "[PermissionController] Failed to write reactivate audit log");
        });
      return res.status(200).json(permission);
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public hardDelete = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const permission = await this.permissionService.getById(id);
      await this.permissionService.hardDelete(id);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "DELETE_PERMISSION",
          targetType: "permission",
          targetId: id,
          targetLabel: permission.name,
          details: {
            name: permission.name,
            category: permission.category,
            application: permission.application,
            permanent: true,
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, permissionId: id }, "[PermissionController] Failed to write hard delete audit log");
        });
      return res.status(204).send();
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public hardDeleteAll = async (req: Request, res: Response): Promise<Response> => {
    try {
      const deleted = await this.permissionService.hardDeleteAll();
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "PURGE_INACTIVE_PERMISSIONS",
          targetType: "permission",
          details: { deletedCount: deleted },
        })
        .catch((error) => {
          Logger.warn({ err: error }, "[PermissionController] Failed to write purge audit log");
        });
      return res.status(200).json({ deleted });
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };
}
