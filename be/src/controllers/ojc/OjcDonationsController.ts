import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcDonationsService from "../../services/ojc/OjcDonationsService";
import { respondWithControllerError } from "../utils/serviceErrorResponse";

@Service()
export default class OjcDonationsController {
  constructor(@Inject("ojcDonationsService") private readonly service: OjcDonationsService) {}

  public list = async (req: Request, res: Response): Promise<Response> => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));
      const result = await this.service.listDonations(status, search, page, pageSize);
      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC donations",
        fallbackMessage: "Unable to load donations. Check the donations table and OJC database connection.",
      });
    }
  };
}
