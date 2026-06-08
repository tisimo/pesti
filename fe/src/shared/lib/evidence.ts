function isLikelyUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/")
  );
}

function parseEvidenceUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      // Fall through to best-effort token parsing.
    }
  }

  return trimmed
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && isLikelyUrl(item));
}

export function resolveEvidenceUrls(...values: unknown[]): string[] {
  const urls: string[] = [];
  values.forEach((value) => {
    urls.push(...parseEvidenceUrls(value));
  });
  return Array.from(new Set(urls));
}
