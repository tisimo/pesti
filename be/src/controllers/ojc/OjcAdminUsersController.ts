import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcAdminUsersService from "../../services/ojc/OjcAdminUsersService";
import { respondWithControllerError } from "../utils/serviceErrorResponse";

@Service()
export default class OjcAdminUsersController {
  constructor(@Inject("ojcAdminUsersService") private readonly service: OjcAdminUsersService) {}

  public list = async (req: Request, res: Response): Promise<Response> => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const result = await this.service.listAdmins(search, page, pageSize);
      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC admin users",
        fallbackMessage: "Unable to load admin users. Check shared account data and admin role records.",
      });
    }
  };
}
