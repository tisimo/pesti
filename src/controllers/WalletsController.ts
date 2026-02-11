import { Inject, Service } from "typedi";
import { NextFunction, Request, Response } from "express";
import IWalletsController from "./IControllers/IWalletsController";
import WalletsService from "../services/WalletsService";
import IWalletsService from "../services/IServices/IWalletsService";
import Logger from "../loaders/logger";

@Service()
export default class WalletsController implements IWalletsController {
  constructor(@Inject(() => WalletsService) private walletsService: IWalletsService) {}

  public async getWalletByAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const walletAddress = req.params.walletAddress as string;

      if (!walletAddress) {
        res.status(400).json({ message: "Wallet Address Is Required!" });
        return;
      }

      const wallet = await this.walletsService.getWalletByAddress(walletAddress);

      if (wallet.isFailure) {
        res.status(404).json({ message: "Wallet Not Found!" });
        Logger.error(wallet.error);
        return;
      }

      res.status(200).json(wallet.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }

  public async getWalletByAccountId(req: Request, res: Response, next: NextFunction) {
    try {
      const accountId = req.params.accountId as string;

      if (!accountId) {
        res.status(400).json({ message: "Account Id Is Required!" });
        return;
      }

      const wallet = await this.walletsService.getWalletByAccountId(accountId);

      if (wallet.isFailure) {
        res.status(404).json({ message: "Wallet Not Found!" });
        Logger.error(wallet.error);
        return;
      }

      res.status(200).json(wallet.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }

  public async createWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const authSub = (req as any).auth?.cognitoSub;
      const { walletAddress } = req.body;

      if (!walletAddress) {
        res.status(400).json({ message: "Missing Required Field: WalletAddress!" });
        return;
      }

      if (!authSub) {
        res.status(403).json({ message: "Forbidden!" });
        return;
      }

      const wallet = await this.walletsService.createWallet(walletAddress, authSub);

      if (wallet.isFailure) {
        if (String(wallet.error).includes("Wallet Already Exists!")) {
          res.status(409).json({ message: "Wallet Already Exists!" });
        } else {
          res.status(400).json({ message: "Error Creating Wallet!" });
        }

        Logger.error(wallet.error);
        return;
      }

      res.status(201).json(wallet.getValue());
    } catch (error) {
      Logger.error(error);
      return next(error);
    }
  }
}
