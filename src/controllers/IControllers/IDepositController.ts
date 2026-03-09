import { Request, Response, NextFunction } from "express";

export default interface IDepositController {
  createDeposit(req: Request, res: Response, next: NextFunction): Promise<void>;
}
