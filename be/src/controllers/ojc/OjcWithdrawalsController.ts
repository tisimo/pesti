import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcWithdrawalsService from "../../services/ojc/OjcWithdrawalsService";
import IAuditLogService from "../../services/IServices/IAuditLogService";
import { extractActor } from "../utils/extractActor";
import { getStringParam } from "../utils/requestParams";
import { respondWithControllerError } from "../utils/serviceErrorResponse";
import Logger from "../../loaders/logger";

@Service()
export default class OjcWithdrawalsController {
  constructor(
    @Inject("ojcWithdrawalsService") private readonly service: OjcWithdrawalsService,
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
  ) {}

  public list = async (req: Request, res: Response): Promise<Response> => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const onlyJustCauses = req.query.onlyJustCauses === "true";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const result = await this.service.listWithdrawals(status, search, onlyJustCauses, page, pageSize);
      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC withdrawals",
        fallbackMessage: "Unable to load withdrawals. Check the shared withdrawals table and database connection.",
      });
    }
  };

  public updateStatus = async (req: Request, res: Response): Promise<Response> => {
    const id = getStringParam(req.params.id);
    if (!id) return res.status(400).json({ message: "Withdrawal ID is required" });

    const { status, note } = req.body as { status: "COMPLETED" | "FAILED"; note?: string };
    try {
      const updated = await this.service.updateStatus(id, status);
      if (!updated) return res.status(404).json({ message: "Withdrawal not found" });

      const actor = extractActor(req);
      this.auditLogService
        .log({
          ...actor,
          action: status === "COMPLETED" ? "WITHDRAWAL_APPROVED" : "WITHDRAWAL_REJECTED",
          targetType: "withdrawal",
          targetId: id,
          details: {
            previousStatus: updated.previousStatus,
            nextStatus: updated.nextStatus,
            ...(note?.trim() ? { note: note.trim() } : {}),
          },
        })
        .catch((error) => {
          Logger.warn({ err: error, withdrawalId: id }, "[OjcWithdrawalsController] Failed to write audit log");
        });

      return res.status(204).send();
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Updating OJC withdrawal status",
        fallbackMessage: "Unable to update withdrawal status. Check the withdrawal record and shared database connection.",
      });
    }
  };
}
