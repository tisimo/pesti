import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import IPageGateService from "../services/IServices/IPageGateService";
import IAuditLogService from "../services/IServices/IAuditLogService";
import { respondWithServiceError } from "./utils/serviceErrorResponse";
import { getStringParam } from "./utils/requestParams";
import { extractActor } from "./utils/extractActor";
import { isSuperAdminActor, respondAdminScopeForbidden } from "./utils/adminScope";
import Logger from "../loaders/logger";

const codeStatusMap = {
  PAGE_GATE_NOT_FOUND: 404,
};

@Service()
export default class PageGateController {
  constructor(
    @Inject("pageGateService") private readonly pageGateService: IPageGateService,
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
  ) {}

  public getAll = async (req: Request, res: Response): Promise<Response> => {
    try {
      const application = typeof req.query.application === "string" ? req.query.application : undefined;
      if (application === "backoffice" && !isSuperAdminActor(req)) {
        return respondAdminScopeForbidden(
          res,
          "Only a Super Admin can view backoffice page access configuration.",
        );
      }

      const gates = await this.pageGateService.getAll(application);
      const visibleGates = isSuperAdminActor(req)
        ? gates
        : gates.filter(gate => gate.application !== "backoffice");
      return res.status(200).json(visibleGates);
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public update = async (req: Request, res: Response): Promise<Response> => {
    const gateId = getStringParam(req.params.id);
    const requiredPermissions: string[] = Array.isArray(req.body.requiredPermissions)
      ? req.body.requiredPermissions
      : [];
    try {
      const existingGate = (await this.pageGateService.getAll()).find(gate => gate.gateId === gateId) ?? null;
      if (existingGate?.application === "backoffice" && !isSuperAdminActor(req)) {
        return respondAdminScopeForbidden(
          res,
          "Only a Super Admin can update backoffice page access configuration.",
        );
      }

      const gate = await this.pageGateService.update(gateId, requiredPermissions);
      const previousPermissions = existingGate?.requiredPermissions ?? [];
      const nextPermissions = gate.requiredPermissions;
      const addedPermissions = nextPermissions.filter(permission => !previousPermissions.includes(permission));
      const removedPermissions = previousPermissions.filter(permission => !nextPermissions.includes(permission));
      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: "PAGE_GATE_UPDATED",
          targetType: "page_gate",
          targetId: gate.gateId,
          targetLabel: gate.label,
          details: {
            application: gate.application,
            pageKey: gate.pageKey,
            previousRequiredPermissions: previousPermissions,
            nextRequiredPermissions: nextPermissions,
            addedPermissions,
            removedPermissions,
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, gateId: gate.gateId }, "[PageGateController] Failed to write audit log");
        });
      return res.status(200).json(gate);
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };
}
