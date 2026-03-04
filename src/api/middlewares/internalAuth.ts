import { Request, Response, NextFunction } from "express";

export function internalAuth(req: Request, res: Response, next: NextFunction) {
  const headerSecret = req.headers["x-service-auth"];

  if (!headerSecret) {
    return res.status(401).json({
      error: "Missing internal service auth header"
    });
  }

  if (headerSecret !== process.env.INTERNAL_KEY) {
    return res.status(403).json({
      error: "Invalid internal service secret"
    });
  }

  next();
}