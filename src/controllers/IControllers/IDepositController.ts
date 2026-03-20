import { Request, Response, NextFunction } from "express";

export default interface IDepositController {
  getAllDeposits(req: Request, res: Response, next: NextFunction): Promise<void>;
  getDepositById(req: Request, res: Response, next: NextFunction): Promise<void>;
  createDeposit(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
}
