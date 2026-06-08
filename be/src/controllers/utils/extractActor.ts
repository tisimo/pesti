import { Request } from "express";
import { resolveClientIp } from "../../utils/clientIp";

export interface Actor {
  adminUserId: string;
  adminEmail: string;
  ipAddress: string;
}

export function extractActor(req: Request): Actor {
  const ipAddress = resolveClientIp(req);

  if (req.auth?.userId) {
    return {
      adminUserId: req.auth.userId,
      adminEmail: req.auth.email,
      ipAddress,
    };
  }

  return { adminUserId: "unknown", adminEmail: "unknown", ipAddress };
}
