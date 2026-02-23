import { Request, Response, NextFunction } from "express";

export default interface ITransactionsController {
  getTransactionById(req: Request, res: Response, next: NextFunction): Promise<void>;
}
