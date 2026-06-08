import { Container } from "typedi";
import type IAuditLogService from "../../services/IServices/IAuditLogService";
import type { NextFunction, Request, Response } from "express";
import { resolveClientIp } from "../../utils/clientIp";
import Logger from "../../loaders/logger";

function inferAppFromPath(path: string): string {
  const normalizedPath = path.split("?")[0].toLowerCase();

  // OJC routes are grouped under /ojc, everything else in this backend is backoffice.
  if (normalizedPath.includes("/ojc/")) return "just_causes";

  return "backoffice";
}

const DENIED_AUDIT_COOLDOWN_MS = 15_000;
const deniedAuditCache = new Map<string, number>();

function buildDeniedAuditKey(req: Request, required: string[], app: string): string {
  const auth = req.auth;
  const requiredPermissions = [...required].sort().join("|");
  return [
    auth?.userId ?? "unknown",
    (auth?.email ?? "unknown").toLowerCase(),
    req.method,
    req.originalUrl,
    app,
    requiredPermissions,
  ].join("::");
}

function shouldLogDeniedAttempt(req: Request, required: string[], app: string): boolean {
  const now = Date.now();
  const key = buildDeniedAuditKey(req, required, app);
  const previousAt = deniedAuditCache.get(key);

  if (previousAt && now - previousAt < DENIED_AUDIT_COOLDOWN_MS) {
    return false;
  }

  deniedAuditCache.set(key, now);

  // Keep the in-memory cache bounded when access-denied bursts happen.
  if (deniedAuditCache.size > 2000) {
    for (const [cacheKey, timestamp] of deniedAuditCache.entries()) {
      if (now - timestamp > DENIED_AUDIT_COOLDOWN_MS) {
        deniedAuditCache.delete(cacheKey);
      }
    }
  }

  return true;
}

/**
 * Middleware factory that enforces at least one of the required permissions.
 * Super Admin always bypasses. Other users must hold at least one required
 * effective permission.
 * Must run after requireCognitoAuth.
 *
 * Usage: route.get("/path", requirePermission("view_campaigns"), handler)
 */
export function requirePermission(...required: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (!auth) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (auth.isSuperAdmin) {
      next();
      return;
    }

    const hasPermission = required.some(p => auth.permissions.includes(p));
    if (!hasPermission) {
      const failedApp = inferAppFromPath(req.originalUrl);

      if (shouldLogDeniedAttempt(req, required, failedApp)) {
        const auditLogService = Container.get("auditLogService") as IAuditLogService;
        const ipAddress = resolveClientIp(req);

        auditLogService
          .log({
            adminUserId: auth.userId,
            adminEmail: auth.email,
            action: "APP_ACCESS_FAILED",
            targetType: "app",
            targetId: failedApp,
            targetLabel: failedApp,
            ipAddress,
            details: {
              app: failedApp,
              failedApp,
              ipAddress,
              result: "failed",
              reason: "insufficient_permissions",
              requiredPermissions: required,
              userPermissions: auth.permissions,
              route: req.originalUrl,
              method: req.method,
              userId: auth.userId,
              appsAccessible: auth.appsAccessible,
            },
          })
          .catch((error) => {
            Logger.warn(
              { err: error, userId: auth.userId, failedApp },
              "[requirePermission] Failed to write denied access audit log",
            );
          });
      }

      res.status(403).json({
        code: "INSUFFICIENT_PERMISSIONS",
        message:
          "You do not have permission to access this area or perform this action. If this access is expected, ask an Admin to update your role.",
        requiredPermissions: required,
      });
      return;
    }

    next();
  };
}

export function requireApplicationAccess(application: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (!auth) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (auth.isSuperAdmin || auth.appsAccessible.includes(application)) {
      next();
      return;
    }

    res.status(403).json({
      code: "APP_ACCESS_FORBIDDEN",
      message:
        "You do not have access to this application. If this access is expected, ask an Admin to update your role.",
    });
  };
}
