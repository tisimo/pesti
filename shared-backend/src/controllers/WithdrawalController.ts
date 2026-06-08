import { Inject, Service } from "typedi";
import { NextFunction, Request, Response } from "express";
import IWithdrawalController from "./IControllers/IWithdrawalController";
import WithdrawalService from "../services/WithdrawalService";
import IWithdrawalService from "../services/IServices/IWithdrawalService";
import Logger from "../loaders/logger";
import type { CreateWithdrawalRequestDTO, GenerateSessionTokenRequestDTO } from "dto/WithdrawalDTO";

@Service()
export default class WithdrawalController implements IWithdrawalController {
  constructor(@Inject(() => WithdrawalService) private withdrawalService: IWithdrawalService) {}

  public async getAllWithdrawals(req: Request, res: Response, next: NextFunction) {
    try {
      const accountId = (req as any).accountId;
      let page = req.params.page as string;

      if (!accountId) {
        res.status(403).json({ message: "Forbidden!" });
        return;
      }

      if (!page) {
        page = "1";
      }

      const result = await this.withdrawalService.getAllWithdrawals(accountId, parseInt(page));

      if (result.isFailure) {
        res.status(500).json({ message: result.error });
        return;
      }

      res.status(200).json(result.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }

  public async getWithdrawalById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const withdrawalId = req.params.withdrawalId as string;

      if (!withdrawalId) {
        res.status(400).json({ message: "Withdrawal Id Is Required!" });
        return;
      }

      const result = await this.withdrawalService.getWithdrawalById(withdrawalId);

      if (result.isFailure) {
        if (String(result.error).includes("Not Found")) {
          res.status(404).json({ message: result.error });
        } else {
          res.status(500).json({ message: "Error Finding Withdrawal!" });
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

  public async createWithdrawal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateWithdrawalRequestDTO = {
        ...req.body,
        amountFiat: 0,
        feeTx: null,
        txHash: null,
        application: "OnlyJustCauses",
      };
      const result = await this.withdrawalService.createWithdrawal(dto);

      if (result.isFailure) {
        res.status(400).json({ message: result.error });
        Logger.error(result.error);
        return;
      }

      res.status(201).json(result.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }

  public async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const withdrawalId = req.params.withdrawalId as string;

      if (!withdrawalId) {
        res.status(400).json({ message: "Withdrawal Id Is Required!" });
        return;
      }

      const { status } = req.body;

      if (!status) {
        res.status(400).json({ message: "Status Is Required!" });
        return;
      }

      const result = await this.withdrawalService.updateStatus(withdrawalId, status);

      if (result.isFailure) {
        res.status(400).json({ message: result.error });
        Logger.error(result.error);
        return;
      }

      res.status(200).json({ message: "Withdrawal Status Updated Successfully!" });
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
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
