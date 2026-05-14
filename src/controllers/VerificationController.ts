import { Inject, Service } from "typedi";
import { NextFunction, Request, Response } from "express";
import IVerificationController from "./IControllers/IVerificationController";
import VerificationService from "../services/VerificationService";
import IVerificationService from "../services/IServices/IVerificationService";
import { VerificationDataDTO } from "../dto/VerificationDataDTO";
import Logger from "../loaders/logger";

@Service()
export default class VerificationController implements IVerificationController {
  constructor(@Inject(() => VerificationService) private verificationService: IVerificationService) {}

  public async getVerificationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = req.params.accountId as string;

      const result = await this.verificationService.getVerificationByAccountId(accountId);

      if (result.isFailure) {
        Logger.error(result.error);
        res.status(500).json({ message: "Error Getting Verification!" });
        return;
      }

      const verification = result.getValue();

      if (!verification) {
        res.status(404).json({ message: "Verification Not Found!" });
        return;
      }

      res.status(200).json(verification);
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

  public async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: validate x-hmac-signature header using VERIFF_SECRET
      Logger.info("[Veriff Webhook] Body: " + JSON.stringify(req.body, null, 2));

      const sessionId = req.body?.sessionId as string | undefined;
      const veriffStatus = req.body?.data?.verification?.decision as string | undefined;

      if (!sessionId || !veriffStatus) {
        res.status(200).json({ message: "Acknowledged." });
        return;
      }

      const verificationData = req.body.data.verification;

      const firstName = verificationData.person?.firstName?.value;
      const lastName = verificationData.person?.lastName?.value;
      const birthDate = verificationData.person?.dateOfBirth?.value;
      const gender = verificationData.person?.gender?.value;
      const country = verificationData.document?.country?.value;
      const documentType = verificationData.document?.type?.value;

      const result = await this.verificationService.handleWebhook(sessionId, veriffStatus);

      if (result.isFailure) {
        Logger.error(result.error);
      }

      if (veriffStatus === "approved") {
        const dataDTO: VerificationDataDTO = { firstName, lastName, birthDate, gender, country, documentType };
        const dataResult = await this.verificationService.saveVerificationData(sessionId, dataDTO);
        if (dataResult.isFailure) Logger.error(dataResult.error);
      }

      res.status(200).json({ message: "Acknowledged." });
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }
}
