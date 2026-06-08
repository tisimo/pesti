import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { Container } from "typedi";
import config from "../../../config";
import type IUserRepo from "../../repos/IRepos/IUserRepo";
import type IRoleRepo from "../../repos/IRepos/IRoleRepo";
import type IPermissionRepo from "../../repos/IRepos/IPermissionRepo";
import { buildEffectiveAccess, type RoleSummary } from "../../utils/accessControl";
import Logger from "../../loaders/logger";

export type CognitoAuthContext = {
  cognitoSub: string;
  userId: string;
  email: string;
  payload: JwtPayload;
  permissions: string[];
  permissionsByApplication: Record<string, string[]>;
  isSuperAdmin: boolean;
  roleName: string | null;
  roleApplication: string | null;
  roleIds: string[];
  roles: RoleSummary[];
  appsAccessible: string[];
};

const region = process.env.COGNITO_REGION || config.awsRegion;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

const issuer = region && userPoolId ? `https://cognito-idp.${region}.amazonaws.com/${userPoolId}` : null;

const jwks =
  issuer &&
  jwksClient({
    jwksUri: `${issuer}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

function getBearerToken(req: Request): string | null {
  const header = req.header("authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") return null;

  return token;
}

function verifyToken(token: string): Promise<JwtPayload> {
  if (!issuer || !jwks) {
    return Promise.reject(new Error("Cognito configuration missing"));
  }

  return new Promise((resolve, reject) => {
    const getKey = (header: jwt.JwtHeader, callback: (err: Error | null, key?: string) => void) => {
      if (!header.kid) {
        return callback(new Error("Missing token kid"));
      }

      jwks.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);

        const signingKey = key?.getPublicKey();
        if (!signingKey) {
          return callback(new Error("Missing signing key"));
        }

        callback(null, signingKey);
      });
    };

    jwt.verify(
      token,
      getKey,
      {
        issuer,
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) return reject(err);

        if (!decoded || typeof decoded === "string") {
          return reject(new Error("Invalid token payload"));
        }

        resolve(decoded as JwtPayload);
      },
    );
  });
}

async function parseAuthContext(req: Request): Promise<CognitoAuthContext> {
  const token = getBearerToken(req);

  if (!token) {
    throw new Error("Missing authorization token");
  }

  const payload = await verifyToken(token);

  if (payload.token_use !== "access") {
    throw new Error("Invalid token type");
  }

  if (!clientId || payload.client_id !== clientId) {
    throw new Error("Invalid client");
  }

  const cognitoSub = typeof payload.sub === "string" ? payload.sub : null;

  if (!cognitoSub) {
    throw new Error("Missing user identifier");
  }

  // Resolve the BO_Users record by Cognito sub to enforce registration + status
  const userRepo = Container.get("userRepo") as IUserRepo;
  const user = await userRepo.findByCognitoSub(cognitoSub);

  if (!user) {
    throw new Error("Account not registered in backoffice");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Account is deactivated");
  }

  let permissions: string[] = [];
  let permissionsByApplication: Record<string, string[]> = {};
  let isSuperAdmin = false;
  let roleName: string | null = null;
  let roleApplication: string | null = null;
  let rolesSummary: RoleSummary[] = [];
  let appsAccessible: string[] = [];

  try {
    const roleRepo = Container.get("roleRepo") as IRoleRepo;
    const permissionRepo = Container.get("permissionRepo") as IPermissionRepo;
    const [roles, allPermissions] = await Promise.all([
      Promise.all(user.roleIds.map(roleId => roleRepo.findById(roleId))),
      permissionRepo.findAll(),
    ]);
    const access = buildEffectiveAccess(
      roles.filter((role): role is NonNullable<typeof role> => Boolean(role)),
      allPermissions,
    );
    roleName = access.primaryRole?.name ?? null;
    isSuperAdmin = access.isSuperAdmin;
    roleApplication = access.primaryRole?.application ?? null;
    permissions = access.permissions;
    permissionsByApplication = access.permissionsByApplication;
    rolesSummary = access.roles;
    appsAccessible = access.appsAccessible;
  } catch (error) {
    Logger.warn({ err: error, userId: user.userId }, "[cognitoAuth] Failed to resolve role permissions");
  }

  return {
    cognitoSub,
    userId: user.userId,
    email: user.email,
    payload,
    permissions,
    permissionsByApplication,
    isSuperAdmin,
    roleName,
    roleApplication,
    roleIds: user.roleIds,
    roles: rolesSummary,
    appsAccessible,
  };
}

const PUBLIC_ENDPOINTS = [
  { method: "GET", path: "/status" },
  { method: "POST", path: "/auth/login-failed" },
  { method: "POST", path: "/logs/access-attempt" },
];

function normalizePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function isPublicEndpoint(req: Request): boolean {
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") {
    return true;
  }

  const path = normalizePath(req.path);
  const originalPath = normalizePath(req.originalUrl.split("?")[0]);

  return PUBLIC_ENDPOINTS.some(endpoint => {
    const endpointMethod = endpoint.method.toUpperCase();
    const endpointPath = normalizePath(endpoint.path);
    return endpointMethod === method && (path === endpointPath || originalPath.endsWith(endpointPath));
  });
}

async function tryAttachOptionalAuth(req: Request): Promise<void> {
  if (!getBearerToken(req)) return;

  try {
    req.auth = await parseAuthContext(req);
  } catch (error) {
    Logger.warn({ err: error, path: req.originalUrl }, "[cognitoAuth] Optional auth parse failed");
    // Public endpoints should not fail when auth is missing/invalid.
  }
}

export async function requireCognitoAuth(req: Request, res: Response, next: NextFunction) {
  if (isPublicEndpoint(req)) {
    await tryAttachOptionalAuth(req);
    next();
    return;
  }

  try {
    req.auth = await parseAuthContext(req);
    next();
  } catch (error) {
    Logger.warn({ err: error, path: req.originalUrl }, "[cognitoAuth] Unauthorized request");
    res.status(401).json({
      message: (error as Error).message || "Unauthorized",
    });
  }
}
