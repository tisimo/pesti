import { Request, Response, NextFunction } from "express";

export default interface ITransactionsController {
  getAllTransactions(req: Request, res: Response, next: NextFunction): Promise<void>;
  getTransactionById(req: Request, res: Response, next: NextFunction): Promise<void>;
}
