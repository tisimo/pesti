import { Request, Response } from "express";

export default interface IUserController {
  create(req: Request, res: Response): Promise<Response>;
  getAll(req: Request, res: Response): Promise<Response>;
  getById(req: Request, res: Response): Promise<Response>;
  update(req: Request, res: Response): Promise<Response>;
  delete(req: Request, res: Response): Promise<Response>;
  deactivate(req: Request, res: Response): Promise<Response>;
  reactivate(req: Request, res: Response): Promise<Response>;
  purgeInactive(req: Request, res: Response): Promise<Response>;
  transferSuperAdmin(req: Request, res: Response): Promise<Response>;
  me(req: Request, res: Response): Promise<Response>;
  resetPassword(req: Request, res: Response): Promise<Response>;
}
