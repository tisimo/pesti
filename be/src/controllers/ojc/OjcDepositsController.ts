import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcDepositsService from "../../services/ojc/OjcDepositsService";
import { respondWithControllerError } from "../utils/serviceErrorResponse";

@Service()
export default class OjcDepositsController {
  constructor(
    @Inject("ojcDepositsService") private readonly service: OjcDepositsService,
  ) {}

  public list = async (req: Request, res: Response): Promise<Response> => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const onlyJustCauses = req.query.onlyJustCauses === "true";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const result = await this.service.listDeposits(status, search, onlyJustCauses, page, pageSize);
      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC deposits",
        fallbackMessage: "Unable to load deposits. Check the shared deposits table and database connection.",
      });
    }
  };
}
