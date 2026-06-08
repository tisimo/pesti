export type AccessibleApp = "backoffice" | "only_just_causes";

const ACCESS_ORDER: AccessibleApp[] = ["backoffice", "only_just_causes"];

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function splitApplications(input?: string | null): string[] {
  if (!input) return [];
  return input
    .split(/[\s,;|]+/)
    .map(normalizeToken)
    .filter(Boolean);
}

export function deriveAppsAccessibleFromRole(
  roleApplication?: string | null,
  isSuperAdmin = false,
): AccessibleApp[] {
  if (isSuperAdmin) return [...ACCESS_ORDER];

  const tokens = splitApplications(roleApplication);
  let hasBackoffice = false;
  let hasPanel = false;

  for (const token of tokens) {
    if (token === "backoffice") {
      hasBackoffice = true;
      continue;
    }

    if (
      token === "just_causes" ||
      token === "only_just_causes" ||
      token === "panel"
    ) {
      hasPanel = true;
      continue;
    }

    if (token === "both" || token === "all") {
      hasBackoffice = true;
      hasPanel = true;
    }
  }

  // Backoffice roles currently access both admin and panel areas.
  if (hasBackoffice) hasPanel = true;

  return ACCESS_ORDER.filter((app) => {
    if (app === "backoffice") return hasBackoffice;
    return hasPanel;
  });
}

