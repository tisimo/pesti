import { Request, Response, NextFunction } from "express";

export default interface IRecoveryCodesController {
  generateRecoveryCodes(req: Request, res: Response, next: NextFunction): Promise<void>;
  deleteRecoveryCode(req: Request, res: Response, next: NextFunction): Promise<void>;
}
