import type { Request } from "express";

const IPV4_CANDIDATE_REGEX = /(\d{1,3}(?:\.\d{1,3}){3})/;

function isValidIpv4(ip: string): boolean {
  const octets = ip.split(".");
  if (octets.length !== 4) return false;

  return octets.every(part => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const value = Number(part);
    return value >= 0 && value <= 255;
  });
}

export function normalizeToIpv4(rawIp: string): string {
  const input = rawIp.trim();
  if (!input) return "unknown";

  if (input === "::1") return "127.0.0.1";

  const mappedIpv4Match = input.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})/i);
  if (mappedIpv4Match && isValidIpv4(mappedIpv4Match[1])) {
    return mappedIpv4Match[1];
  }

  const directMatch = input.match(IPV4_CANDIDATE_REGEX);
  if (directMatch && isValidIpv4(directMatch[1])) {
    return directMatch[1];
  }

  return "unknown";
}

function pushHeaderCandidates(candidates: string[], value: string | string[] | undefined) {
  if (!value) return;

  if (typeof value === "string" && value.trim()) {
    candidates.push(...value.split(",").map(part => part.trim()));
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      candidates.push(
        ...String(item)
          .split(",")
          .map(part => part.trim()),
      );
    }
  }
}

function pushCandidate(candidates: string[], value: unknown) {
  if (typeof value !== "string") return;
  const normalizedValue = value.trim();
  if (!normalizedValue || normalizedValue.toLowerCase() === "unknown") return;
  candidates.push(normalizedValue);
}

export function resolveClientIp(req: Request, fallbackIp?: string): string {
  const candidates: string[] = [];

  pushHeaderCandidates(candidates, req.headers["x-forwarded-for"]);
  pushHeaderCandidates(candidates, req.headers["x-real-ip"]);
  pushHeaderCandidates(candidates, req.headers["cf-connecting-ip"]);
  pushHeaderCandidates(candidates, req.headers["true-client-ip"]);

  // Trusted fallback captured by frontend when proxy headers are unavailable.
  pushCandidate(candidates, fallbackIp);

  pushCandidate(candidates, req.ip);
  pushCandidate(candidates, req.socket?.remoteAddress);

  for (const candidate of candidates) {
    const normalized = normalizeToIpv4(candidate);
    if (normalized !== "unknown") return normalized;
  }

  return "unknown";
}
