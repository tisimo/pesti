import { Request, Response, NextFunction } from "express";

export default interface IWithdrawalController {
  getWithdrawalById(req: Request, res: Response, next: NextFunction): Promise<void>;
  generateSession(req: Request, res: Response, next: NextFunction): Promise<void>;
  getTransactionStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
  createWithdrawal(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
}
