import type { Response } from "express";
import Logger from "../../loaders/logger";

export type ServiceErrorLike = {
  code: string;
  message: string;
};

export const isServiceErrorLike = (error: unknown): error is ServiceErrorLike => {
  if (!error || typeof error !== "object") return false;
  return "code" in error && "message" in error;
};

export const respondWithServiceError = (
  res: Response,
  error: unknown,
  fallbackStatus: number,
  codeStatusMap: Record<string, number>
): Response => {
  if (isServiceErrorLike(error)) {
    const status = codeStatusMap[error.code] ?? fallbackStatus;
    const logPayload = { err: error, status, code: error.code };
    if (status >= 500) {
      Logger.error(logPayload, "Service error response");
    } else {
      Logger.warn(logPayload, "Service error response");
    }
    return res.status(status).json({ message: error.message });
  }
  if (typeof error === "string") {
    Logger.error({ err: error, status: fallbackStatus }, "Service error response");
    return res.status(fallbackStatus).json({ message: error });
  }
  if (error instanceof Error) {
    Logger.error({ err: error, status: fallbackStatus }, "Service error response");
    return res.status(fallbackStatus).json({ message: error.message });
  }
  Logger.error({ err: error, status: fallbackStatus }, "Service error response");
  return res
    .status(fallbackStatus)
    .json({ message: "An unexpected error occurred." });
};

type ControllerErrorOptions = {
  operation: string;
  fallbackMessage: string;
  fallbackStatus?: number;
};

type DatabaseErrorLike = {
  code?: string;
  message?: string;
  table?: string;
  column?: string;
  constraint?: string;
};

const getErrorMessage = (error: unknown): string | null => {
  if (error && typeof error === "object" && Array.isArray((error as { errors?: unknown[] }).errors)) {
    const aggregate = error as { errors: unknown[]; message?: unknown };
    const messages = aggregate.errors
      .map((entry) => getErrorMessage(entry))
      .filter((message): message is string => Boolean(message));
    return messages.length > 0 ? messages.join("; ") : typeof aggregate.message === "string" ? aggregate.message : null;
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }
  return null;
};

const getDatabaseCode = (error: unknown): string | null => {
  if (!error || typeof error !== "object") return null;
  const code = (error as DatabaseErrorLike).code;
  return typeof code === "string" ? code : null;
};

const parseMissingIdentifier = (message: string | null, kind: "column" | "relation"): string | null => {
  if (!message) return null;
  const match = message.match(new RegExp(`${kind} "([^"]+)" does not exist`, "i"));
  return match?.[1] ?? null;
};

const buildOperationalErrorPayload = (
  error: unknown,
  operation: string,
  fallbackMessage: string,
  fallbackStatus: number,
): { status: number; body: { message: string; code: string } } => {
  const dbError = (error && typeof error === "object" ? error : {}) as DatabaseErrorLike;
  const message = getErrorMessage(error);
  const dbCode = getDatabaseCode(error);
  const normalizedMessage = message?.toLowerCase() ?? "";

  if (dbCode === "42703") {
    const missingColumn = dbError.column ?? parseMissingIdentifier(message, "column");
    return {
      status: 500,
      body: {
        code: "DATABASE_SCHEMA_MISMATCH",
        message: missingColumn
          ? `${operation} failed because the production database is missing column "${missingColumn}". Run the latest OJC database migration, then retry.`
          : `${operation} failed because the production database schema is missing a required column. Run the latest OJC database migration, then retry.`,
      },
    };
  }

  if (dbCode === "42P01") {
    const missingTable = dbError.table ?? parseMissingIdentifier(message, "relation");
    return {
      status: 500,
      body: {
        code: "DATABASE_SCHEMA_MISMATCH",
        message: missingTable
          ? `${operation} failed because the production database is missing table "${missingTable}". Run the latest OJC database migration, then retry.`
          : `${operation} failed because the production database schema is missing a required table. Run the latest OJC database migration, then retry.`,
      },
    };
  }

  if (dbCode === "22P02") {
    return {
      status: 400,
      body: {
        code: "INVALID_IDENTIFIER",
        message: `${operation} failed because one of the provided IDs is not valid.`,
      },
    };
  }

  if (dbCode === "23505") {
    return {
      status: 409,
      body: {
        code: "DUPLICATE_RECORD",
        message: dbError.constraint
          ? `${operation} failed because it would duplicate an existing record (${dbError.constraint}).`
          : `${operation} failed because it would duplicate an existing record.`,
      },
    };
  }

  if (dbCode === "23503") {
    return {
      status: 409,
      body: {
        code: "RELATED_RECORD_MISSING",
        message: `${operation} failed because a related record no longer exists or is not available in this environment.`,
      },
    };
  }

  if (
    dbCode?.startsWith("08") ||
    dbCode === "ECONNREFUSED" ||
    dbCode === "ETIMEDOUT" ||
    dbCode === "ENOTFOUND" ||
    dbCode === "EHOSTUNREACH" ||
    dbCode === "57P01" ||
    normalizedMessage.includes("connection terminated") ||
    normalizedMessage.includes("timeout") ||
    normalizedMessage.includes("connect econnrefused")
  ) {
    return {
      status: 503,
      body: {
        code: "DATABASE_UNAVAILABLE",
        message: `${operation} failed because the database is currently unreachable. Check the production database connection and retry.`,
      },
    };
  }

  const shouldExposeMessage = process.env.NODE_ENV !== "production" && message;
  return {
    status: fallbackStatus,
    body: {
      code: "UNEXPECTED_ERROR",
      message: shouldExposeMessage ? `${fallbackMessage}: ${message}` : fallbackMessage,
    },
  };
};

export const respondWithControllerError = (
  res: Response,
  error: unknown,
  options: ControllerErrorOptions,
): Response => {
  const fallbackStatus = options.fallbackStatus ?? 500;
  const payload = buildOperationalErrorPayload(
    error,
    options.operation,
    options.fallbackMessage,
    fallbackStatus,
  );

  Logger.error(
    {
      err: error,
      operation: options.operation,
      responseStatus: payload.status,
      responseCode: payload.body.code,
    },
    "OJC controller error",
  );

  return res.status(payload.status).json(payload.body);
};
