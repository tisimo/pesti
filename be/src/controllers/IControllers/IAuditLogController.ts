import { Request, Response } from "express";

export default interface IAuditLogController {
  getAll(req: Request, res: Response): Promise<Response>;
  logAccessAttempt(req: Request, res: Response): Promise<Response>;
  purgeOld(req: Request, res: Response): Promise<Response>;
  logLoginFailed(req: Request, res: Response): Promise<Response>;
  attachIpToLoginSuccess(req: Request, res: Response): Promise<Response>;
}
