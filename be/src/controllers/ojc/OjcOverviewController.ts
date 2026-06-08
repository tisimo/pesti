import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcOverviewService from "../../services/ojc/OjcOverviewService";
import { respondWithControllerError } from "../utils/serviceErrorResponse";

@Service()
export default class OjcOverviewController {
  constructor(@Inject("ojcOverviewService") private readonly service: OjcOverviewService) {}

  public getStats = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const stats = await this.service.getStats();
      return res.status(200).json(stats);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC overview stats",
        fallbackMessage: "Unable to load overview stats. Check that all OJC production tables and migrations are available.",
      });
    }
  };
}
