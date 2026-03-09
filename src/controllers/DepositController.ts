import { Inject, Service } from "typedi";
import { NextFunction, Request, Response } from "express";
import IDepositController from "./IControllers/IDepositController";
import DepositService from "../services/DepositService";
import IDepositService from "../services/IServices/IDepositService";
import Logger from "../loaders/logger";
import type { CreateDepositRequestDTO } from "../dto/DepositDTO";

@Service()
export default class DepositController implements IDepositController {
  constructor(@Inject(() => DepositService) private depositService: IDepositService) {}

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
}
