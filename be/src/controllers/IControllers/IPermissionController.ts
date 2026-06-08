import { Request, Response } from "express";

export default interface IPermissionController {
  getAll(req: Request, res: Response): Promise<Response>;
  getAllInactive(req: Request, res: Response): Promise<Response>;
  getById(req: Request, res: Response): Promise<Response>;
  create(req: Request, res: Response): Promise<Response>;
  update(req: Request, res: Response): Promise<Response>;
  delete(req: Request, res: Response): Promise<Response>;
  reactivate(req: Request, res: Response): Promise<Response>;
  hardDelete(req: Request, res: Response): Promise<Response>;
  hardDeleteAll(req: Request, res: Response): Promise<Response>;
}
