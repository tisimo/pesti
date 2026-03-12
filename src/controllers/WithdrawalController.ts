import { Inject, Service } from "typedi";
import { NextFunction, Request, Response } from "express";
import IWithdrawalController from "./IControllers/IWithdrawalController";
import WithdrawalService from "../services/WithdrawalService";
import IWithdrawalService from "../services/IServices/IWithdrawalService";
import Logger from "../loaders/logger";
import type { GenerateSessionTokenRequestDTO } from "../dto/WithdrawalDTO";

@Service()
export default class WithdrawalController implements IWithdrawalController {
  constructor(@Inject(() => WithdrawalService) private withdrawalService: IWithdrawalService) {}

  getWithdrawalById(req: Request, res: Response, next: NextFunction): Promise<void> {
    console.log(req, res, next);
    throw new Error("Method not implemented.");
  }
  createWithdrawal(req: Request, res: Response, next: NextFunction): Promise<void> {
    console.log(req, res, next);
    throw new Error("Method not implemented.");
  }
  updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    console.log(req, res, next);
    throw new Error("Method not implemented.");
  }

  public async generateSession(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = req.body as GenerateSessionTokenRequestDTO;
      const result = await this.withdrawalService.generateSessionToken(dto);

      if (result.isFailure) {
        res.status(400).json({ message: result.error });
        Logger.error(result.error);
        return;
      }

      res.status(200).json(result.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }

  public async getTransactionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const partnerUserRef = req.params.partnerUserRef as string;
      const result = await this.withdrawalService.getOfframpTransactionStatus(partnerUserRef);

      if (result.isFailure) {
        res.status(400).json({ message: result.error });
        return;
      }

      res.status(200).json(result.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }
}
