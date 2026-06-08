import type { Request, Response } from "express";
import type Role from "../../domain/Role";

export const SUPER_ADMIN_ROLE_NAME = "Super Admin";
export const BACKOFFICE_ADMIN_ROLE_NAME = "Backoffice Admin";

export function isSuperAdminActor(req: Request): boolean {
  return req.auth?.isSuperAdmin === true;
}

export function isBackofficeAdminActor(req: Request): boolean {
  return req.auth?.roleName === BACKOFFICE_ADMIN_ROLE_NAME;
}

export function canManageBackofficeScope(req: Request): boolean {
  return isSuperAdminActor(req) || isBackofficeAdminActor(req);
}

export function isSuperAdminRole(role: Role | null | undefined): boolean {
  return role?.name === SUPER_ADMIN_ROLE_NAME;
}

export function isBackofficeAdminRole(role: Role | null | undefined): boolean {
  return role?.name === BACKOFFICE_ADMIN_ROLE_NAME;
}

export function isProtectedBackofficeAdminRole(role: Role | null | undefined): boolean {
  return isSuperAdminRole(role) || isBackofficeAdminRole(role);
}

export function isBackofficeApplicationRole(role: Role | null | undefined): boolean {
  return role?.application === "backoffice";
}

export function isProtectedRoleName(name: unknown): boolean {
  if (typeof name !== "string") return false;
  const normalized = name.trim().toLowerCase();
  return (
    normalized === SUPER_ADMIN_ROLE_NAME.toLowerCase() ||
    normalized === BACKOFFICE_ADMIN_ROLE_NAME.toLowerCase()
  );
}

export function respondAdminScopeForbidden(res: Response, message: string): Response {
  return res.status(403).json({
    code: "ADMIN_SCOPE_FORBIDDEN",
    message,
  });
}
