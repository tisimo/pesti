import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import IRoleController from "./IControllers/IRoleController";
import IRoleService from "../services/IServices/IRoleService";
import IAuditLogService from "../services/IServices/IAuditLogService";
import RoleMapper from "../mappers/RoleMapper";
import { respondWithServiceError } from "./utils/serviceErrorResponse";
import { getStringParam } from "./utils/requestParams";
import { extractActor } from "./utils/extractActor";
import {
  canManageBackofficeScope,
  isBackofficeAdminRole,
  isBackofficeApplicationRole,
  isProtectedRoleName,
  isSuperAdminActor,
  isSuperAdminRole,
  respondAdminScopeForbidden,
} from "./utils/adminScope";
import type Role from "../domain/Role";
import Logger from "../loaders/logger";

const codeStatusMap = {
  ROLE_NOT_FOUND: 404,
  ROLE_ALREADY_EXISTS: 409,
  ROLE_ALREADY_INACTIVE: 409,
  ROLE_ALREADY_ACTIVE: 409,
  ROLE_PROTECTED: 403,
  INVALID_ROLE_NAME: 400,
  PERMISSION_NOT_FOUND: 404,
  PERMISSION_ALREADY_ON_ROLE: 409,
  PERMISSION_APPLICATION_MISMATCH: 400,
};

@Service()
export default class RoleController implements IRoleController {
  constructor(
    @Inject("roleService") private readonly roleService: IRoleService,
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
  ) {}

  public create = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!this.canCreateRole(req, req.body)) {
        return respondAdminScopeForbidden(
          res,
          "This role belongs to a protected backoffice scope.",
        );
      }

      const role = await this.roleService.create(req.body);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "CREATE_ROLE",
          targetType: "role",
          targetId: role.roleId,
          targetLabel: role.name,
          details: { application: role.application ?? "just_causes" },
        })
        .catch((error) => {
          Logger.warn({ err: error, roleId: role.roleId }, "[RoleController] Failed to write create role audit log");
        });
      return res.status(201).json(RoleMapper.toDTO(role));
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public getAll = async (req: Request, res: Response): Promise<Response> => {
    try {
      const roles = await this.roleService.getAll();
      const visibleRoles = roles.filter(role => this.canReadRole(req, role));
      return res.status(200).json(visibleRoles.map(role => RoleMapper.toDTO(role)));
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public getById = async (req: Request, res: Response): Promise<Response> => {
    const id = getStringParam(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "A valid Role id is required." });
    }

    try {
      const role = await this.roleService.getById(id);
      if (!this.canReadRole(req, role)) {
        return respondAdminScopeForbidden(res, "You cannot access roles in the backoffice admin scope.");
      }
      return res.status(200).json(RoleMapper.toDTO(role));
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public addPermission = async (req: Request, res: Response): Promise<Response> => {
    const id = getStringParam(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "A valid Role id is required." });
    }

    const { permissionId } = req.body;
    if (!permissionId) {
      return res.status(400).json({
        code: "PERMISSION_ID_REQUIRED",
        message: "permissionId is required",
      });
    }

    try {
      const currentRole = await this.roleService.getById(id);
      if (!this.canMutateRole(req, currentRole)) {
        return respondAdminScopeForbidden(
          res,
          "Only a Super Admin can change protected backoffice admin role permissions.",
        );
      }

      const role = await this.roleService.addPermission(id, permissionId);
      const currentPermissionNames = new Set(currentRole.permissions.map(permission => permission.name));
      const added = role.permissions
        .filter(permission => !currentPermissionNames.has(permission.name))
        .map(permission => permission.name);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "UPDATE_PERMISSIONS",
          targetType: "role",
          targetId: role.roleId,
          targetLabel: role.name,
          details: {
            added,
            addedPermissionId: permissionId,
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, roleId: role.roleId }, "[RoleController] Failed to write permissions audit log");
        });
      return res.status(200).json(RoleMapper.toDTO(role));
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public update = async (req: Request, res: Response): Promise<Response> => {
    const id = getStringParam(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "A valid Role id is required." });
    }

    try {
      const isPermissionsOnly = req.body.permissions !== undefined && !req.body.name;

      const currentRole = await this.roleService.getById(id);
      if (!this.canMutateRole(req, currentRole, req.body)) {
        return respondAdminScopeForbidden(
          res,
          "Only a Super Admin can change protected backoffice admin roles.",
        );
      }

      const role = await this.roleService.update(id, req.body);
      const actor = extractActor(req);

      let details: Record<string, any> | undefined;
      if (isPermissionsOnly && currentRole) {
        const previousPermissionNames = new Set(currentRole.permissions.map(p => p.name));
        const nextPermissionNames = new Set(role.permissions.map(p => p.name));
        const added = role.permissions
          .filter(p => !previousPermissionNames.has(p.name))
          .map(p => p.name);
        const removed = currentRole.permissions
          .filter(p => !nextPermissionNames.has(p.name))
          .map(p => p.name);
        details = { added, removed };
      } else if (req.body.name) {
        details = { name: req.body.name };
      }

      this.auditLogService
        .log({
          ...actor,
          action: isPermissionsOnly ? "UPDATE_PERMISSIONS" : "UPDATE_ROLE",
          targetType: "role",
          targetId: role.roleId,
          targetLabel: role.name,
          details,
        })
        .catch((error) => {
          Logger.warn({ err: error, roleId: role.roleId }, "[RoleController] Failed to write update role audit log");
        });
      return res.status(200).json(RoleMapper.toDTO(role));
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public delete = async (req: Request, res: Response): Promise<Response> => {
    const id = getStringParam(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "A valid Role id is required." });
    }

    try {
      const role = await this.roleService.getById(id);
      if (!this.canMutateRole(req, role)) {
        return respondAdminScopeForbidden(res, "Only a Super Admin can delete protected backoffice admin roles.");
      }

      await this.roleService.delete(id);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "DELETE_ROLE",
          targetType: "role",
          targetId: id,
          targetLabel: role.name,
        })
        .catch((error) => {
          Logger.warn({ err: error, roleId: id }, "[RoleController] Failed to write delete role audit log");
        });
      return res.status(204).send();
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public deactivate = async (req: Request, res: Response): Promise<Response> => {
    const id = getStringParam(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "A valid Role id is required." });
    }

    try {
      const role = await this.roleService.getById(id);
      if (!this.canMutateRole(req, role)) {
        return respondAdminScopeForbidden(res, "Only a Super Admin can deactivate protected backoffice admin roles.");
      }

      await this.roleService.deactivate(id);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "DEACTIVATE_ROLE",
          targetType: "role",
          targetId: id,
          targetLabel: role.name,
        })
        .catch((error) => {
          Logger.warn({ err: error, roleId: id }, "[RoleController] Failed to write deactivate role audit log");
        });
      return res.status(204).send();
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public reactivate = async (req: Request, res: Response): Promise<Response> => {
    const id = getStringParam(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "A valid Role id is required." });
    }

    try {
      const role = await this.roleService.getById(id);
      if (!this.canMutateRole(req, role)) {
        return respondAdminScopeForbidden(res, "Only a Super Admin can reactivate protected backoffice admin roles.");
      }

      await this.roleService.reactivate(id);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "REACTIVATE_ROLE",
          targetType: "role",
          targetId: id,
          targetLabel: role.name,
        })
        .catch((error) => {
          Logger.warn({ err: error, roleId: id }, "[RoleController] Failed to write reactivate role audit log");
        });
      return res.status(204).send();
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public purgeInactive = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!isSuperAdminActor(req)) {
        return respondAdminScopeForbidden(res, "Only a Super Admin can purge inactive roles.");
      }

      const deleted = await this.roleService.purgeInactive();
      return res.status(200).json({ deleted });
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  private canReadRole(req: Request, role: Role): boolean {
    if (isSuperAdminActor(req) || canManageBackofficeScope(req)) return true;
    return !isBackofficeApplicationRole(role);
  }

  private canCreateRole(req: Request, input: { name?: string; application?: string }): boolean {
    if (isSuperAdminActor(req)) return true;
    if (isProtectedRoleName(input.name)) return false;
    if ((input.application ?? "just_causes") === "backoffice") {
      return canManageBackofficeScope(req);
    }
    return true;
  }

  private canMutateRole(
    req: Request,
    role: Role,
    input?: { name?: string; application?: string },
  ): boolean {
    if (isSuperAdminActor(req)) return true;
    if (isSuperAdminRole(role) || isBackofficeAdminRole(role)) return false;
    if (input?.name !== undefined && isProtectedRoleName(input.name)) return false;
    if ((input?.application ?? role.application) === "backoffice") {
      return canManageBackofficeScope(req);
    }
    return true;
  }
}
