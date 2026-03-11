import { Request, Response, NextFunction } from "express";

export default interface IWithdrawalController {
  generateSession(req: Request, res: Response, next: NextFunction): Promise<void>;
  getTransactionStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
}
