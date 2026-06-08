import { Request, Response } from "express";

export default interface IAccountCognitoController {
  create(req: Request, res: Response): Promise<Response>;
  list(req: Request, res: Response): Promise<Response>;
}
