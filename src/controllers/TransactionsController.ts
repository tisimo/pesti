import { Inject, Service } from "typedi";
import { NextFunction, Request, Response } from "express";
import ITransactionsController from "./IControllers/ITransactionsController";
import TransactionsService from "../services/TransactionsService";
import ITransactionsService from "../services/IServices/ITransactionsService";
import Logger from "../loaders/logger";

@Service()
export default class TransactionsController implements ITransactionsController {
  constructor(@Inject(() => TransactionsService) private transactionsService: ITransactionsService) {}

  public async getTransactionById(req: Request, res: Response, next: NextFunction) {
    try {
      const transactionId = req.params.transactionId as string;

      if (!transactionId) {
        res.status(400).json({ message: "Transaction Id Is Required!" });
        return;
      }

      const result = await this.transactionsService.getTransactionById(transactionId);

      if (result.isFailure) {
        if (String(result.error).includes("Not Found")) {
          res.status(404).json({ message: result.error });
        } else {
          res.status(500).json({ message: "Error Finding Transaction!" });
        }

        Logger.error(result.error);
        return;
      }

      res.status(200).json(result.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }
}
