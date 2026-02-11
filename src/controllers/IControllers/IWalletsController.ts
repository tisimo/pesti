import { Request, Response, NextFunction } from "express";

export default interface IWalletsController {
  getWalletByAddress(req: Request, res: Response, next: NextFunction): Promise<void>;
  getWalletByAccountId(req: Request, res: Response, next: NextFunction): Promise<void>;
  createWallet(req: Request, res: Response, next: NextFunction): Promise<void>;
}
