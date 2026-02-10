import { Request, Response, NextFunction } from "express";

export default interface IFollowersController {
  followAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
  unfollowAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
  getFollowersCount(req: Request, res: Response, next: NextFunction): Promise<void>;
  getFollowingCount(req: Request, res: Response, next: NextFunction): Promise<void>;
}
