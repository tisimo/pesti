import { Request, Response, NextFunction } from "express";

export default interface IDepositController {
  getDepositById(req: Request, res: Response, next: NextFunction): Promise<void>;
  createDeposit(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
}
