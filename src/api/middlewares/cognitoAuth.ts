import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { Container } from "typedi";
import config from "../../../config";
import type IAccountService from "../../services/IServices/IAccountService";

type CognitoAuthContext = {
  cognitoSub: string;
  tokenUse: string;
  payload: JwtPayload;
};

const region = process.env.COGNITO_REGION || config.awsRegion;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;
const issuer =
  region && userPoolId ? `https://cognito-idp.${region}.amazonaws.com/${userPoolId}` : null;
const jwks =
  issuer &&
  jwksClient({
    jwksUri: `${issuer}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

const getBearerToken = (req: Request) => {
  const header = req.header("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") return null;
  return token;
};

const verifyToken = (token: string): Promise<JwtPayload> => {
  if (!issuer || !jwks) {
    return Promise.reject(new Error("Cognito configuration missing."));
  }

  return new Promise((resolve, reject) => {
    const getKey = (header: jwt.JwtHeader, callback: (err: Error | null, key?: string) => void) => {
      if (!header.kid) {
        callback(new Error("Missing token kid."));
        return;
      }
      jwks.getSigningKey(header.kid, (err, key) => {
        if (err) {
          callback(err);
          return;
        }
        const signingKey = key?.getPublicKey();
        if (!signingKey) {
          callback(new Error("Missing signing key."));
          return;
        }
        callback(null, signingKey);
      });
    };

    jwt.verify(token, getKey, { issuer, algorithms: ["RS256"] }, (err, decoded) => {
      if (err) {
        reject(err);
        return;
      }
      if (!decoded || typeof decoded === "string") {
        reject(new Error("Invalid token payload."));
        return;
      }
      resolve(decoded as JwtPayload);
    });
  });
};

const parseAuthContext = async (req: Request): Promise<CognitoAuthContext> => {
  const token = getBearerToken(req);
  if (!token) {
    throw new Error("Missing authorization token.");
  }

  const payload = await verifyToken(token);
  const tokenUse = payload.token_use;
  if (tokenUse !== "access" && tokenUse !== "id") {
    throw new Error("Invalid token type.");
  }

  const cognitoSub = typeof payload.sub === "string" ? payload.sub : null;
  if (!cognitoSub) {
    throw new Error("Missing user identifier.");
  }

  return { cognitoSub, tokenUse, payload };
};

export const requireCognitoAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!issuer || !jwks) {
    res.status(500).json({ message: "Cognito configuration missing." });
    return;
  }
  try {
    const auth = await parseAuthContext(req);
    (req as any).auth = auth;
    next();
  } catch (error) {
    res.status(401).json({ message: (error as Error).message || "Unauthorized" });
  }
};

export const requireCognitoAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!issuer || !jwks) {
    res.status(500).json({ message: "Cognito configuration missing." });
    return;
  }
  try {
    const auth = await parseAuthContext(req);
    const accountService = Container.get(config.services.account.name) as IAccountService;
    const accountResult = await accountService.getAccountByCognitoSub(auth.cognitoSub);
    if (accountResult.isFailure) {
      res.status(401).json({ message: "Account not found." });
      return;
    }

    const account = accountResult.getValue();
    (req as any).auth = auth;
    (req as any).accountId = account.accountId;
    (req as any).user = { ...(req as any).user, accountId: account.accountId };
    next();
  } catch (error) {
    res.status(401).json({ message: (error as Error).message || "Unauthorized" });
  }
};

export const optionalCognitoAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = getBearerToken(req);
  if (!token) {
    next();
    return;
  }
  if (!issuer || !jwks) {
    next();
    return;
  }
  try {
    const auth = await parseAuthContext(req);
    const accountService = Container.get(config.services.account.name) as IAccountService;
    const accountResult = await accountService.getAccountByCognitoSub(auth.cognitoSub);
    if (accountResult.isSuccess) {
      const account = accountResult.getValue();
      (req as any).auth = auth;
      (req as any).accountId = account.accountId;
      (req as any).user = { ...(req as any).user, accountId: account.accountId };
    }
  } catch (error) {
    // Ignore auth errors for optional context.
  }
  next();
};
