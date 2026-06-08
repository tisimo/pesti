import { Request, Response, NextFunction } from "express";

export default interface IVerificationController {
  getVerificationStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
  createVerification(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateSessionId(req: Request, res: Response, next: NextFunction): Promise<void>;
  handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void>;
}
