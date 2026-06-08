import type { Request, Response } from "express";
import { Inject, Service } from "typedi";
import IAccountCognitoController from "./IControllers/IAccountCognitoController";
import { respondWithServiceError } from "./utils/serviceErrorResponse";
import type IAccountCognitoService from "../services/IServices/IAccountCognitoService";
import type IAuditLogService from "../services/IServices/IAuditLogService";
import { extractActor } from "./utils/extractActor";
import { canManageBackofficeScope, isSuperAdminActor, respondAdminScopeForbidden } from "./utils/adminScope";
import Logger from "../loaders/logger";

const codeStatusMap: Record<string, number> = {
  INVALID_ACCOUNT_EMAIL: 400,
  ACCOUNT_ALREADY_EXISTS: 409,
  BACKOFFICE_USER_ALREADY_EXISTS: 409,
  COGNITO_CONFIG_MISSING: 500,
  DEFAULT_ROLE_NOT_FOUND: 500,
};

@Service()
export default class AccountCognitoController implements IAccountCognitoController {
  constructor(
    @Inject("accountCognitoService")
    private readonly accountCognitoService: IAccountCognitoService,
    @Inject("auditLogService")
    private readonly auditLogService: IAuditLogService,
  ) {}
  public create = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!isSuperAdminActor(req)) {
        return respondAdminScopeForbidden(
          res,
          "Only a Super Admin can create default backoffice accounts.",
        );
      }

      const { email, firstName, lastName } = req.body as { email?: string; firstName?: string; lastName?: string };

      const result = await this.accountCognitoService.create({ email, firstName, lastName });
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "CREATE_ADMIN_ACCOUNT",
          targetType: "user",
          targetId: result.userId,
          targetLabel: result.email,
          details: {
            email: result.email,
            firstName: result.firstName,
            lastName: result.lastName,
            roleId: result.roleId,
            roleIds: result.roleIds,
            status: result.status,
            cognitoSub: result.cognitoSub,
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, userId: result.userId }, "[AccountCognitoController] Failed to write audit log");
        });

      return res.status(201).json(result);
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public list = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!canManageBackofficeScope(req)) {
        return respondAdminScopeForbidden(
          res,
          "Only a Super Admin or Backoffice Admin can list Cognito backoffice accounts.",
        );
      }

      const users = await this.accountCognitoService.list();

      return res.status(200).json(users);
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };
}
