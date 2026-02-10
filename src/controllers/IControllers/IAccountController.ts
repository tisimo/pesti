import { Request, Response, NextFunction } from "express";

export default interface IAccountController {
  getAccountByCognitoSub(req: Request, res: Response, next: NextFunction): Promise<void>;
  getAccountByAccountId(req: Request, res: Response, next: NextFunction): Promise<void>;
  createAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
  deleteAccountByCognitoSub(req: Request, res: Response, next: NextFunction): Promise<void>;
}
