import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import UserMapper from "../mappers/UserMapper";
import IUserService from "../services/IServices/IUserService";
import IAuditLogService from "../services/IServices/IAuditLogService";
import IAccountCognitoService from "../services/IServices/IAccountCognitoService";
import IRoleService from "../services/IServices/IRoleService";
import IUserController from "./IControllers/IUserController";
import { getStringParam } from "./utils/requestParams";
import { respondWithServiceError } from "./utils/serviceErrorResponse";
import { extractActor } from "./utils/extractActor";
import {
  isBackofficeApplicationRole,
  isSuperAdminActor,
  respondAdminScopeForbidden,
} from "./utils/adminScope";
import type User from "../domain/User";
import type Role from "../domain/Role";
import Logger from "../loaders/logger";

const codeStatusMap = {
  USER_NOT_FOUND: 404,
  USER_ALREADY_EXISTS: 409,
  USER_ALREADY_INACTIVE: 409,
  USER_ALREADY_ACTIVE: 409,
  INVALID_USER_EMAIL: 400,
  INVALID_USER_PASSWORD_HASH: 400,
  INVALID_USER_ROLE: 400,
  ROLE_NOT_FOUND: 404,
  ROLE_APPLICATION_DUPLICATE: 400,
  BACKOFFICE_ROLE_EXCLUSIVE: 400,
  SUPER_ADMIN_ROLE_NOT_FOUND: 404,
  SUPER_ADMIN_TRANSFER_REQUIRED: 422,
  TARGET_ALREADY_SUPER_ADMIN: 409,
  DEFAULT_ROLE_NOT_FOUND: 500,
};

@Service()
export default class UserController implements IUserController {
  constructor(
    @Inject("userService") private readonly userService: IUserService,
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
    @Inject("accountCognitoService") private readonly accountCognitoService: IAccountCognitoService,
    @Inject("roleService") private readonly roleService: IRoleService,
  ) {}

  public create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const targetRoles = await this.resolveRolesFromPayload(req.body);
      if (!this.canAssignRoles(req, targetRoles)) {
        return respondAdminScopeForbidden(
          res,
          "You can only assign roles inside your allowed admin scope.",
        );
      }

      const user = await this.userService.create(req.body);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "CREATE_USER",
          targetType: "user",
          targetId: user.userId,
          targetLabel: user.email,
          details: {
            ...(user.firstName ? { firstName: user.firstName } : {}),
            ...(user.lastName ? { lastName: user.lastName } : {}),
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, userId: user.userId }, "[UserController] Failed to write create user audit log");
        });
      return res.status(201).json(UserMapper.toDTO(user));
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public getAll = async (req: Request, res: Response): Promise<Response> => {
    try {
      const [users, cognitoUsers, roles] = await Promise.all([
        this.userService.getAll(),
        this.accountCognitoService.list().catch((error) => {
          Logger.warn({ err: error }, "[UserController] Failed to list Cognito users");
          return [] as any[];
        }),
        this.roleService.getAll().catch((error) => {
          Logger.warn({ err: error }, "[UserController] Failed to resolve roles for user metadata");
          return [] as Role[];
        }),
      ]);

      const roleById = new Map(roles.map(role => [role.roleId, role]));
      const cognitoStatusByEmail = new Map(
        cognitoUsers.map((u: any) => [u.email as string, u.userStatus as string | undefined]),
      );

      return res.status(200).json(
        users.map(user => {
          const userRoles = user.roleIds
            .map(roleId => roleById.get(roleId))
            .filter((role): role is Role => Boolean(role));
          const primaryRole = userRoles.find(role => role.application === "backoffice") ?? userRoles[0] ?? null;
          return {
            ...UserMapper.toDTO(user),
            roles: userRoles.map(role => ({
              roleId: role.roleId,
              name: role.name,
              application: role.application,
              isDefault: role.isDefault,
            })),
            roleName: primaryRole?.name,
            roleApplication: primaryRole?.application,
            cognitoStatus: cognitoStatusByEmail.get(user.email),
          };
        }),
      );
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public getById = async (req: Request, res: Response): Promise<Response> => {
    const id = this.getIdOrRespond(req, res);
    if (!id) return res;

    try {
      const user = await this.userService.getById(id);
      return res.status(200).json(UserMapper.toDTO(user));
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public update = async (req: Request, res: Response): Promise<Response> => {
    const id = this.getIdOrRespond(req, res);
    if (!id) return res;

    try {
      const profileNameKeys = ["firstName", "lastName"];
      const hasProfileNameUpdate = profileNameKeys.some((key) => Object.prototype.hasOwnProperty.call(req.body, key));
      if (hasProfileNameUpdate && !req.auth?.isSuperAdmin) {
        return res.status(403).json({
          code: "SUPER_ADMIN_REQUIRED",
          message: "Only a Super Admin can edit backoffice user names.",
        });
      }

      const hasRoleUpdate =
        Object.prototype.hasOwnProperty.call(req.body, "roleIds") ||
        Object.prototype.hasOwnProperty.call(req.body, "roleId");
      const newRoleIds: string[] | undefined = hasRoleUpdate
        ? Array.isArray(req.body.roleIds)
          ? req.body.roleIds
          : req.body.roleId
            ? [req.body.roleId]
            : []
        : undefined;
      const isRoleOnlyUpdate =
        hasRoleUpdate && Object.keys(req.body).every(key => key === "roleId" || key === "roleIds");

      // Capture old role name before updating, resolve new role name in parallel
      const [currentUser, newRoles] = await Promise.all([
        this.userService.getById(id),
        newRoleIds ? this.resolveRoles(newRoleIds) : Promise.resolve([]),
      ]);
      const oldRoles = await this.resolveRoles(currentUser.roleIds);

      if (!this.canManageTargetUser(req, currentUser, oldRoles)) {
        return respondAdminScopeForbidden(
          res,
          "Only a Super Admin can manage Super Admin or Backoffice Admin accounts.",
        );
      }

      if (newRoleIds !== undefined && !this.canAssignRoles(req, newRoles)) {
        return respondAdminScopeForbidden(
          res,
          "You can only assign roles inside your allowed admin scope.",
        );
      }

      const user = await this.userService.update(id, req.body);
      const actor = extractActor(req);
      const roleChange =
        newRoleIds !== undefined
          ? {
              from: oldRoles.map(role => role.name).join(", ") || "No access",
              to: newRoles.map(role => role.name).join(", ") || "No access",
            }
          : undefined;
      const details = isRoleOnlyUpdate
        ? roleChange
        : {
            ...(roleChange ? { role: roleChange } : {}),
            ...(req.body.email !== undefined ? { email: { from: currentUser.email, to: user.email } } : {}),
            ...(req.body.firstName !== undefined ? { firstName: { from: currentUser.firstName, to: user.firstName } } : {}),
            ...(req.body.lastName !== undefined ? { lastName: { from: currentUser.lastName, to: user.lastName } } : {}),
            ...(req.body.status !== undefined ? { status: { from: currentUser.status, to: user.status } } : {}),
          };
      this.auditLogService
        .log({
          ...actor,
          action: isRoleOnlyUpdate ? "UPDATE_USER_ROLE" : "UPDATE_USER",
          targetType: "user",
          targetId: user.userId,
          targetLabel: user.email,
          details,
        })
        .catch((error) => {
          Logger.warn({ err: error, userId: user.userId }, "[UserController] Failed to write update user audit log");
        });
      return res.status(200).json(UserMapper.toDTO(user));
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public delete = async (req: Request, res: Response): Promise<Response> => {
    const id = this.getIdOrRespond(req, res);
    if (!id) return res;

    try {
      const user = await this.userService.getById(id);
      const roles = await this.resolveRoles(user.roleIds);
      if (!this.canManageTargetUser(req, user, roles)) {
        return respondAdminScopeForbidden(
          res,
          "Only a Super Admin can delete Super Admin or Backoffice Admin accounts.",
        );
      }

      await this.userService.delete(id);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "DELETE_USER",
          targetType: "user",
          targetId: id,
          targetLabel: user.email,
        })
        .catch((error) => {
          Logger.warn({ err: error, userId: id }, "[UserController] Failed to write delete user audit log");
        });
      return res.status(204).send();
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public deactivate = async (req: Request, res: Response): Promise<Response> => {
    const id = this.getIdOrRespond(req, res);
    if (!id) return res;

    try {
      const user = await this.userService.getById(id);
      const roles = await this.resolveRoles(user.roleIds);
      if (!this.canManageTargetUser(req, user, roles)) {
        return respondAdminScopeForbidden(
          res,
          "Only a Super Admin can deactivate Super Admin or Backoffice Admin accounts.",
        );
      }

      await this.userService.deactivate(id);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "DEACTIVATE_USER",
          targetType: "user",
          targetId: id,
          targetLabel: user.email,
        })
        .catch((error) => {
          Logger.warn({ err: error, userId: id }, "[UserController] Failed to write deactivate user audit log");
        });
      return res.status(204).send();
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public reactivate = async (req: Request, res: Response): Promise<Response> => {
    const id = this.getIdOrRespond(req, res);
    if (!id) return res;

    try {
      const user = await this.userService.getById(id);
      const roles = await this.resolveRoles(user.roleIds);
      if (!this.canManageTargetUser(req, user, roles)) {
        return respondAdminScopeForbidden(
          res,
          "Only a Super Admin can reactivate Super Admin or Backoffice Admin accounts.",
        );
      }

      await this.userService.reactivate(id);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "REACTIVATE_USER",
          targetType: "user",
          targetId: id,
          targetLabel: user.email,
        })
        .catch((error) => {
          Logger.warn({ err: error, userId: id }, "[UserController] Failed to write reactivate user audit log");
        });
      return res.status(204).send();
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public transferSuperAdmin = async (req: Request, res: Response): Promise<Response> => {
    const toUserId = this.getIdOrRespond(req, res);
    if (!toUserId) return res;

    try {
      if (!isSuperAdminActor(req)) {
        return respondAdminScopeForbidden(res, "Only a Super Admin can transfer Super Admin access.");
      }

      const { promoted, demoted } = await this.userService.transferSuperAdmin(toUserId);
      const actor = extractActor(req);

      // Log the promotion
      this.auditLogService
        .log({
          ...actor,
          action: "UPDATE_USER_ROLE",
          targetType: "user",
          targetId: promoted.userId,
          targetLabel: promoted.email,
          details: { role: "Super Admin", operation: "PROMOTED_TO_SUPER_ADMIN" },
        })
        .catch((error) => {
          Logger.warn({ err: error, userId: promoted.userId }, "[UserController] Failed to write promotion audit log");
        });

      // Log the demotion (if there was a previous Super Admin)
      if (demoted) {
        this.auditLogService
          .log({
            ...actor,
            action: "UPDATE_USER_ROLE",
            targetType: "user",
            targetId: demoted.userId,
            targetLabel: demoted.email,
            details: { role: "Default", operation: "DEMOTED_FROM_SUPER_ADMIN" },
          })
          .catch((error) => {
            Logger.warn({ err: error, userId: demoted.userId }, "[UserController] Failed to write demotion audit log");
          });
      }

      return res.status(200).json({
        promoted: UserMapper.toDTO(promoted),
        demoted: demoted ? UserMapper.toDTO(demoted) : null,
      });
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public me = async (req: Request, res: Response): Promise<Response> => {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const {
        user,
        roleName,
        roleApplication,
        roleIsDefault,
        permissions,
        permissionsByApplication,
        appsAccessible,
        roles,
      } = await this.userService.getMe(userId);
      return res.status(200).json({
        ...UserMapper.toDTO(user),
        roleName,
        roleApplication,
        roleIsDefault,
        permissions,
        permissionsByApplication,
        appsAccessible,
        roles,
      });
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public purgeInactive = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!isSuperAdminActor(req)) {
        return respondAdminScopeForbidden(res, "Only a Super Admin can purge inactive backoffice users.");
      }

      const deleted = await this.userService.purgeInactive();
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "PURGE_INACTIVE_USERS",
          targetType: "user",
          details: { deletedCount: deleted },
        })
        .catch((error) => {
          Logger.warn({ err: error }, "[UserController] Failed to write purge users audit log");
        });
      return res.status(200).json({ deleted });
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public resetPassword = async (req: Request, res: Response): Promise<Response> => {
    const id = this.getIdOrRespond(req, res);
    if (!id) return res;

    try {
      const user = await this.userService.getById(id);
      const roles = await this.resolveRoles(user.roleIds);
      if (!this.canManageTargetUser(req, user, roles)) {
        return respondAdminScopeForbidden(
          res,
          "Only a Super Admin can reset passwords for Super Admin or Backoffice Admin accounts.",
        );
      }

      await this.accountCognitoService.resetPassword(user.email);
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "RESET_USER_PASSWORD",
          targetType: "user",
          targetId: id,
          targetLabel: user.email,
        })
        .catch((error) => {
          Logger.warn({ err: error, userId: id }, "[UserController] Failed to write reset password audit log");
        });
      return res.status(204).send();
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  private getIdOrRespond(req: Request, res: Response): string | null {
    const id = getStringParam(req.params.id);
    if (!id) {
      res.status(400).json({ message: "A valid user id is required." });
      return null;
    }
    return id;
  }

  private async resolveRolesFromPayload(body: { roleId?: string; roleIds?: string[] }): Promise<Role[]> {
    if (Array.isArray(body.roleIds)) return this.resolveRoles(body.roleIds);
    if (body.roleId) return this.resolveRoles([body.roleId]);
    return [];
  }

  private async resolveRoles(roleIds: string[]): Promise<Role[]> {
    const roles = await Promise.all(
      roleIds.map(roleId =>
        this.roleService.getById(roleId).catch((error) => {
          Logger.warn({ err: error, roleId }, "[UserController] Failed to resolve role for admin-scope guard");
          return null;
        }),
      ),
    );
    return roles.filter((role): role is Role => Boolean(role) && !role.isDefault);
  }

  private canManageTargetUser(req: Request, user: User, roles: Role[]): boolean {
    if (isSuperAdminActor(req)) return true;
    if (user.userId === req.auth?.userId) return false;
    return !roles.some(role => isBackofficeApplicationRole(role));
  }

  private canAssignRoles(req: Request, roles: Role[]): boolean {
    if (isSuperAdminActor(req)) return true;
    return roles.every(role => !isBackofficeApplicationRole(role));
  }
}
