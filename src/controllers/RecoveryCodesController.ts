import { Inject, Service } from "typedi";
import { NextFunction, Request, Response } from "express";
import Logger from "../loaders/logger";
import IRecoveryCodesController from "./IControllers/IRecoveryCodesController";
import RecoveryCodesService from "../services/RecoveryCodesService";
import IRecoveryCodesService from "../services/IServices/IRecoveryCodesService";

@Service()
export default class RecoveryCodesController implements IRecoveryCodesController {
  constructor(@Inject(() => RecoveryCodesService) private recoveryCodesService: IRecoveryCodesService) {}

  public async generateRecoveryCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const authSub = (req as any).auth?.cognitoSub as string | undefined;

      if (!authSub) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const recoveryCodes = await this.recoveryCodesService.generateRecoveryCodes(authSub);

      if (recoveryCodes.isFailure) {
        Logger.error(recoveryCodes.error);
        res.status(500).json({ message: "Error Generating Recovery Codes." });
        return;
      }

      res.status(201).json(recoveryCodes.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }

  public async deleteRecoveryCode(req: Request, res: Response, next: NextFunction) {
    try {
      const authSub = (req as any).auth?.cognitoSub as string | undefined;
      const cognitoSub = req.params.cognitoSub as string;
      const recoveryCode = req.params.recoveryCode as string;

      if (!authSub) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      if (!cognitoSub || !recoveryCode) {
        res.status(400).json({ message: "Missing Required Fields: CognitoSub, RecoveryCode!" });
        return;
      }

      if (authSub !== cognitoSub) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      const deletedCode = await this.recoveryCodesService.deleteRecoveryCode(cognitoSub, recoveryCode);

      if (deletedCode.isFailure) {
        res.status(404).json({ message: "Error Deleting Recovery Code!" });
        Logger.error(deletedCode.error);
        return;
      }

      res.status(200).json(deletedCode.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }
}
