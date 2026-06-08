import { apiBackoffice } from "@/shared/lib/axios";

let resolvedIpPromise: Promise<string> | null = null;

async function resolveIpAddress(): Promise<string> {
  if (!resolvedIpPromise) {
    resolvedIpPromise = (async () => {
      try {
        const timeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("ip-timeout")), 1500);
        });
        const ipReq = fetch("https://api.ipify.org?format=json").then(r => r.json() as Promise<{ ip?: string }>);
        const ipResp = await Promise.race([ipReq, timeout]);
        const candidate = (ipResp.ip ?? "").trim();
        return /^\d{1,3}(\.\d{1,3}){3}$/.test(candidate) ? candidate : "unknown";
      } catch {
        return "unknown";
      }
    })();
  }

  return resolvedIpPromise;
}

function normalizeAppId(appId: string): string {
  const trimmed = String(appId ?? "").trim();
  if (!trimmed) return trimmed;
  const key = trimmed.toLowerCase();
  if (key === "ojc" || key === "just_causes" || key === "only just causes" || key === "only_just_causes") {
    return "only_just_causes";
  }
  if (key === "backoffice") return "backoffice";
  return trimmed;
}

export async function logAppAccessAttempt(
  app: string,
  result: "success" | "failed",
  reason?: string,
): Promise<void> {
  try {
    const ipAddress = await resolveIpAddress();
    const normalizedApp = normalizeAppId(app);
    await apiBackoffice.post("/logs/access-attempt", {
      app: normalizedApp,
      result,
      reason,
      ipAddress: ipAddress === "unknown" ? undefined : ipAddress,
    });
  } catch {
    // Best effort: audit logging should never block user navigation.
  }
}
