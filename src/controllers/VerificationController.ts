import { Inject, Service } from "typedi";
import { NextFunction, Request, Response } from "express";
import IVerificationController from "./IControllers/IVerificationController";
import VerificationService from "../services/VerificationService";
import IVerificationService from "../services/IServices/IVerificationService";
import Logger from "../loaders/logger";

@Service()
export default class VerificationController implements IVerificationController {
  constructor(@Inject(() => VerificationService) private verificationService: IVerificationService) {}

  public async getVerificationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = req.params.accountId as string;

      const result = await this.verificationService.createVerification(accountId);

      if (result.isFailure) {
        Logger.error(result.error);
        res.status(404).json({ message: "Verification Not Found!" });
        return;
      }

      res.status(200).json(result.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }

  public async createVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = (req as any).accountId;

      if (!accountId) {
        res.status(400).json({ message: "AccountId Is Required!" });
        return;
      }

      const result = await this.verificationService.createVerification(accountId);

      if (result.isFailure) {
        Logger.error(result.error);
        res.status(400).json({ message: "Error Creating Verification!" });
        return;
      }

      res.status(201).json(result.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }

  public async updateSessionId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = (req as any).accountId;
      const { sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json({ message: "sessionId Is Required!" });
        return;
      }

      const result = await this.verificationService.updateSessionId(accountId, sessionId);

      if (result.isFailure) {
        Logger.error(result.error);
        res.status(404).json({ message: "Verification Not Found!" });
        return;
      }

      res.status(200).json(result.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }

  public async markVerified(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const accountId = (req as any).accountId;

      const result = await this.verificationService.markVerified(sessionId, accountId);

      if (result.isFailure) {
        if (result.error === "Forbidden!") {
          res.status(403).json({ message: "Forbidden!" });
          return;
        }

        res.status(404).json({ message: "Verification Not Found For Session!" });
        Logger.error(result.error);
        return;
      }

      res.status(200).json(result.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }

  public async markDeclined(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const accountId = (req as any).accountId;

      const result = await this.verificationService.markDeclined(sessionId, accountId);

      if (result.isFailure) {
        if (result.error === "Forbidden!") {
          res.status(403).json({ message: "Forbidden!" });
          return;
        }

        Logger.error(result.error);
        res.status(404).json({ message: "Verification Not Found For Session!" });
        return;
      }

      res.status(200).json(result.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }
}
