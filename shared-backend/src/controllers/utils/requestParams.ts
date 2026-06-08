import { Request } from "express";

export const getAccountIdFromRequest = (req: Request): string | null => {
  const fromAuth = (req as any).accountId || (req as any).user?.accountId || null;
  return fromAuth || null;
};

export const getStringParam = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
};

export const getNumberParam = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
  }
  const raw = getStringParam(value);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export const getBooleanParam = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  const raw = getStringParam(value);
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

export const getListParam = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => (typeof entry === "string" ? entry.split(",") : []))
      .map((entry) => entry.trim())
      .filter((entry) => Boolean(entry));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => Boolean(entry));
  }
  return [];
};
