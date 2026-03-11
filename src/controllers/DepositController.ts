import { Inject, Service } from "typedi";
import { NextFunction, Request, Response } from "express";
import IDepositController from "./IControllers/IDepositController";
import DepositService from "../services/DepositService";
import IDepositService from "../services/IServices/IDepositService";
import Logger from "../loaders/logger";
import type { CreateDepositRequestDTO } from "../dto/DepositRequestDTO";

@Service()
export default class DepositController implements IDepositController {
  constructor(
    @Inject(() => DepositService) private depositService: IDepositService) {}


  public async getDepositById(req: Request, res: Response, next: NextFunction) {
    try {
      const depositId = req.params.depositId as string;

      if (!depositId) {
        res.status(400).json({ message: "Deposit Id Is Required!" });
        return;
      }

      const result = await this.depositService.getDepositById(depositId);

      if (result.isFailure) {
        if (String(result.error).includes("Not Found")) {
          res.status(404).json({ message: result.error });
        } else {
          res.status(500).json({ message: "Error Finding Deposit!" });
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

  public async createDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      const depositRequest = req.body as CreateDepositRequestDTO;

      const result = await this.depositService.createOnrampSession(depositRequest);

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

  public async updateStatus(req: Request, res: Response, next: NextFunction) {
    try{
      const depositId = req.params.depositId as string;

      if (!depositId) {
        res.status(400).json({ message: "Deposit Id Is Required!" });
        return;
      }

      const { status } = req.body;

      if (!status) {
        res.status(400).json({ message: "Status Is Required!" });
        return;
      }

      const result = await this.depositService.updateStatus(depositId, status);

      if (result.isFailure) {
        res.status(400).json({ message: result.error });
        Logger.error(result.error);
        return;
      }
       
      res.status(200).json({ message: "Deposit Status Updated Successfully!" });
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }
}
