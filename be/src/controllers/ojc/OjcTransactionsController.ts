import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcTransactionsService from "../../services/ojc/OjcTransactionsService";
import { respondWithControllerError } from "../utils/serviceErrorResponse";

@Service()
export default class OjcTransactionsController {
  constructor(@Inject("ojcTransactionsService") private readonly service: OjcTransactionsService) {}

  public list = async (req: Request, res: Response): Promise<Response> => {
    try {
      const type = typeof req.query.type === "string" ? req.query.type : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const result = await this.service.listTransactions(type, status, search, page, pageSize);
      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC transactions",
        fallbackMessage: "Unable to load transactions. Check shared transaction data and donation links.",
      });
    }
  };
}
