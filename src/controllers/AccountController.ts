import { Inject, Service } from "typedi";
import { NextFunction, Request, Response } from "express";
import IAccountController from "./IControllers/IAccountController";
import AccountService from "../services/AccountService";
import IAccountService from "../services/IServices/IAccountService";
import Logger from "../loaders/logger";

@Service()
export default class AccountController implements IAccountController {
  constructor(@Inject(() => AccountService) private accountService: IAccountService) {}

  public async getAccountByCognitoSub(req: Request, res: Response, next: NextFunction) {
    try {
      const cognitoSub = req.params.cognitoSub as string;
      console.log("CognitoSub: " + cognitoSub);
      const authSub = (req as any).auth?.cognitoSub;
      console.log("AuthSub: " + authSub);

      if (!cognitoSub) {
        res.status(400).json({ message: "CognitoSub Is Required!" });
        return;
      }
      if (authSub && authSub !== cognitoSub) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      const account = await this.accountService.getAccountByCognitoSub(cognitoSub);
      if (account.isFailure) {
        res.status(404).json({ message: "Error Fetching Account!" });
        Logger.error(account.error);
        return;
      }

      res.status(200).json(account.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }

  public async getAccountByAccountId(req: Request, res: Response, next: NextFunction) {
    try {
      const accountId = req.params.accountId as string;
      const authAccountId = (req as any).accountId;

      if (!accountId) {
        res.status(400).json({ message: "AccountID Is Required!" });
        return;
      }
      if (authAccountId && authAccountId !== accountId) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      const account = await this.accountService.getAccountByAccountId(accountId);

      if (account.isFailure) {
        res.status(404).json({ message: "Error Fetching Account!" });
        Logger.error(account.error);
        return;
      }

      res.status(200).json(account.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }

  public async createAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { cognitoSub, email } = req.body;

      if (!cognitoSub || !email) {
        res.status(400).json({ message: "Missing Required Fields: CognitoSub, Email!" });
        return;
      }

      const account = await this.accountService.createAccount(cognitoSub, email, "MEMBER");

      if (account.isFailure) {
        if (String(account.error).includes("Account Already Exists!")) {
          res.status(409).json({ message: "Account Already Exists!" });
        } else {
          res.status(400).json({ message: "Error Creating Account!" });
        }

        Logger.error(account.error);
        return;
      }

      res.status(201).json(account.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }

  public async deleteAccountByCognitoSub(req: Request, res: Response, next: NextFunction) {
    try {
      const cognitoSub = req.params.cognitoSub as string;
      const authSub = (req as any).auth?.cognitoSub;

      if (!cognitoSub) {
        res.status(400).json({ message: "CognitoSub Is Required!" });
        return;
      }
      if (authSub && authSub !== cognitoSub) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      const account = await this.accountService.deleteAccountByCognitoSub(cognitoSub);

      if (account.isFailure) {
        res.status(404).json({ message: "Error Deleting Account!" });
        Logger.error(account.error);
        return;
      }

      res.status(200).json(account.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }
}
