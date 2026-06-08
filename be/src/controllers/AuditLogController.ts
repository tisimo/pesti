import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import IAuditLogService from "../services/IServices/IAuditLogService";
import AuditLogMapper from "../mappers/AuditLogMapper";
import IAuditLogController from "./IControllers/IAuditLogController";
import { extractActor } from "./utils/extractActor";
import type IUserRepo from "../repos/IRepos/IUserRepo";
import type IRoleRepo from "../repos/IRepos/IRoleRepo";
import type IPermissionRepo from "../repos/IRepos/IPermissionRepo";
import { buildEffectiveAccess } from "../utils/accessControl";
import { resolveClientIp } from "../utils/clientIp";
import AuditLog from "../domain/AuditLog";
import Logger from "../loaders/logger";

@Service()
export default class AuditLogController implements IAuditLogController {
  constructor(
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
    @Inject("userRepo") private readonly userRepo: IUserRepo,
    @Inject("roleRepo") private readonly roleRepo: IRoleRepo,
    @Inject("permissionRepo") private readonly permissionRepo: IPermissionRepo,
  ) {}

  private readonly unknownUsers = new Set(["", "unknown", "unauthenticated"]);

  private normalizeAppId(appId: string): string {
    const trimmed = (appId ?? "").trim();
    if (!trimmed) return trimmed;
    const key = trimmed.toLowerCase();
    if (key === "ojc" || key === "just_causes" || key === "only just causes" || key === "only_just_causes") {
      return "only_just_causes";
    }
    if (key === "backoffice") return "backoffice";
    return trimmed;
  }

  private async resolveAppsAccessible(adminUserId?: string, adminEmail?: string): Promise<string[]> {
    const normalizedUserId = (adminUserId ?? "").trim();
    const normalizedEmail = (adminEmail ?? "").trim().toLowerCase();

    let user = null;
    if (!this.unknownUsers.has(normalizedUserId.toLowerCase())) {
      user = await this.userRepo.findById(normalizedUserId);
    }

    if (!user && normalizedEmail && !this.unknownUsers.has(normalizedEmail)) {
      user = await this.userRepo.findByEmail(normalizedEmail);
    }

    if (!user) return [];

    const [roles, permissions] = await Promise.all([
      Promise.all(user.roleIds.map(roleId => this.roleRepo.findById(roleId))),
      this.permissionRepo.findAll(),
    ]);

    return buildEffectiveAccess(
      roles.filter((role): role is NonNullable<typeof role> => Boolean(role)),
      permissions,
    ).appsAccessible;
  }

  private async enrichWithAppsAccessible(
    logDto: ReturnType<typeof AuditLogMapper.toDTO>,
    cache: Map<string, string[]>,
  ): Promise<ReturnType<typeof AuditLogMapper.toDTO>> {
    const details = (logDto.details ?? {}) as Record<string, unknown>;
    const existing =
      (details.appsAccessible as string[] | undefined) ??
      (details.accessibleApps as string[] | undefined);

    if (Array.isArray(existing) && existing.length > 0) {
      return logDto;
    }

    const cacheKey = `${logDto.adminUserId ?? ""}|${(logDto.adminEmail ?? "").toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return {
        ...logDto,
        details: {
          ...details,
          appsAccessible: cached,
        },
      };
    }

    const appsAccessible = await this.resolveAppsAccessible(logDto.adminUserId, logDto.adminEmail);
    if (!appsAccessible.length) return logDto;

    cache.set(cacheKey, appsAccessible);

    return {
      ...logDto,
      details: {
        ...details,
        appsAccessible,
      },
    };
  }

  private hasKnownIp(log: AuditLog): boolean {
    const ip = (log.ipAddress ?? (log.details?.ipAddress as string | undefined) ?? "").trim();
    return !!ip && ip !== "unknown";
  }

  private dedupeImmediateLoginSuccess(logs: AuditLog[]): AuditLog[] {
    const deduped: AuditLog[] = [];

    for (const current of logs) {
      if (current.action !== "LOGIN_SUCCESS") {
        deduped.push(current);
        continue;
      }

      const previous = deduped[deduped.length - 1];
      if (!previous || previous.action !== "LOGIN_SUCCESS") {
        deduped.push(current);
        continue;
      }

      const sameActor =
        previous.adminUserId === current.adminUserId &&
        previous.adminEmail === current.adminEmail;
      const sameTarget = (previous.targetId ?? previous.targetLabel ?? "") === (current.targetId ?? current.targetLabel ?? "");
      const previousTs = Date.parse(previous.timestamp);
      const currentTs = Date.parse(current.timestamp);
      const closeInTime =
        Number.isFinite(previousTs) &&
        Number.isFinite(currentTs) &&
        Math.abs(previousTs - currentTs) <= 10_000;

      if (!(sameActor && sameTarget && closeInTime)) {
        deduped.push(current);
        continue;
      }

      const previousKnownIp = this.hasKnownIp(previous);
      const currentKnownIp = this.hasKnownIp(current);

      // Keep the richer entry when a duplicate pair is emitted by upstream login triggers.
      if (!previousKnownIp && currentKnownIp) {
        deduped[deduped.length - 1] = current;
      }
    }

    return deduped;
  }

  public getAll = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { adminUserId, adminEmail, fromDate, toDate, action, actionIn, app, limit, page, sortDir, lastKey } =
        req.query as Record<string, string>;
      const parsedActionIn = actionIn
        ? actionIn
            .split(",")
            .map(a => a.trim())
            .filter(Boolean)
        : undefined;
      const defaultAuditTrailActions =
        req.path === "/audit-trail" && !action && !parsedActionIn?.length
          ? ["LOGIN_SUCCESS", "LOGIN_FAILED", "APP_ACCESS_SUCCESS", "APP_ACCESS_FAILED"]
          : undefined;

      const normalizedAdminEmail = adminEmail?.trim();
      const normalizedApp = app ? this.normalizeAppId(app) : undefined;

      const result = await this.auditLogService.getAll({
        adminUserId: adminUserId || undefined,
        adminEmail: normalizedAdminEmail || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        action: action || undefined,
        actionIn: parsedActionIn?.length ? parsedActionIn : defaultAuditTrailActions,
        app: normalizedApp || undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        page: page ? parseInt(page, 10) : undefined,
        sortDir: sortDir === "asc" ? "asc" : "desc",
        lastKey: lastKey ? JSON.parse(lastKey) : undefined,
      });

      const visibleItems = this.dedupeImmediateLoginSuccess(result.items);

      const appAccessCache = new Map<string, string[]>();
      const enrichedItems = await Promise.all(
        visibleItems.map(async (log) =>
          this.enrichWithAppsAccessible(AuditLogMapper.toDTO(log), appAccessCache),
        ),
      );

      return res.status(200).json({
        items: enrichedItems,
        lastKey: result.lastKey ?? null,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "AUDIT_SCAN_LIMIT_EXCEEDED") {
        return res.status(422).json({
          message: "Audit trail query is too broad. Please narrow filters (date range/email/app) and try again.",
        });
      }
      Logger.error({ err: error }, "[AuditLogController] Failed to retrieve audit logs");
      return res.status(500).json({ message: "Failed to retrieve audit logs." });
    }
  };

  public logAccessAttempt = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { app, result, reason, ipAddress: bodyIpAddress } = req.body as {
        app: string;
        result: "success" | "failed";
        reason?: string;
        ipAddress?: string;
      };
      const actor = extractActor(req);
      const ipAddress = resolveClientIp(req, bodyIpAddress);
      const action = result === "success" ? "APP_ACCESS_SUCCESS" : "APP_ACCESS_FAILED";
      const normalizedApp = this.normalizeAppId(app);
      const trimmedReason = typeof reason === "string" ? reason.trim() : "";
      const details: Record<string, unknown> = {
        app: normalizedApp,
        result,
        reason: trimmedReason || (result === "success" ? "access_granted" : "access_denied"),
        ipAddress,
      };

      if (req.auth?.userId) {
        details.userId = req.auth.userId;
      }

      if (req.auth?.appsAccessible?.length) {
        details.appsAccessible = req.auth.appsAccessible;
      }

      await this.auditLogService.log({
        ...actor,
        ipAddress,
        action,
        targetType: "app",
        targetId: normalizedApp,
        targetLabel: normalizedApp,
        details,
      });

      return res.status(201).json({ success: true });
    } catch (error) {
      Logger.error({ err: error }, "[AuditLogController] Failed to register app access attempt");
      return res.status(500).json({ message: "Failed to register app access attempt." });
    }
  };

  public logLoginFailed = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { email, reason, ipAddress: bodyIpAddress } = req.body as {
        email?: string;
        reason?: string;
        ipAddress?: string;
      };

      const normalizedEmail = (email ?? "unknown").trim() || "unknown";
      const normalizedReason = (reason ?? "Unknown error").trim() || "Unknown error";
      const ipAddress = resolveClientIp(req, bodyIpAddress);

      let adminUserId = "unauthenticated";
      if (normalizedEmail !== "unknown") {
        const user = await this.userRepo.findByEmail(normalizedEmail);
        if (user) adminUserId = user.userId;
      }

      await this.auditLogService.log({
        adminUserId,
        adminEmail: normalizedEmail,
        ipAddress,
        action: "LOGIN_FAILED",
        targetType: "auth",
        targetId: adminUserId,
        targetLabel: normalizedEmail,
        details: { reason: normalizedReason },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      Logger.error({ err: error }, "[AuditLogController] Failed to log login failure");
      return res.status(500).json({ message: "Failed to log login failure." });
    }
  };

  public attachIpToLoginSuccess = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.auth?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { ipAddress: bodyIpAddress } = req.body as { ipAddress?: string };
      const ipAddress = resolveClientIp(req, bodyIpAddress);

      if (ipAddress === "unknown") {
        return res.status(200).json({ success: true, updated: false });
      }

      const updated = await this.auditLogService.attachIpToLoginSuccess(req.auth.userId, ipAddress);
      return res.status(200).json({ success: true, updated });
    } catch (error) {
      Logger.error({ err: error }, "[AuditLogController] Failed to attach IP to login success");
      return res.status(500).json({ message: "Failed to attach IP to login success." });
    }
  };

  public purgeOld = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { beforeDate, confirm } = req.body as { beforeDate: string; confirm: boolean };

      if (!confirm) {
        return res.status(400).json({ message: "Confirmation is required to clear old logs." });
      }

      const deletedCount = await this.auditLogService.purgeOlderThan(beforeDate);

      return res.status(200).json({
        success: true,
        deletedCount,
      });
    } catch (error) {
      Logger.error({ err: error }, "[AuditLogController] Failed to clear old logs");
      return res.status(500).json({ message: "Failed to clear old logs." });
    }
  };
}
