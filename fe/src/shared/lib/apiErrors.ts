export const API_ACCESS_DENIED_EVENT = "backoffice:api-access-denied";

export const DEFAULT_ACCESS_DENIED_MESSAGE =
  "You do not have permission to access this area or perform this action. If this access is expected, ask an Admin to update your role.";

export interface ApiAccessDeniedEventDetail {
  message: string;
  path?: string;
}

type ApiErrorLike = {
  message?: unknown;
  response?: {
    status?: number;
    data?: unknown;
  };
};

function extractMessageFromData(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") return data.trim() || null;
  if (typeof data !== "object") return null;

  const maybeMessage = (data as { message?: unknown }).message;
  return typeof maybeMessage === "string" && maybeMessage.trim()
    ? maybeMessage.trim()
    : null;
}

export function getAccessDeniedMessage(data?: unknown): string {
  const message = extractMessageFromData(data);
  if (!message) return DEFAULT_ACCESS_DENIED_MESSAGE;

  const normalized = message.toLowerCase();
  if (
    normalized === "forbidden" ||
    normalized.includes("insufficient permissions") ||
    normalized.includes("access denied")
  ) {
    return DEFAULT_ACCESS_DENIED_MESSAGE;
  }

  return message;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorLike;

  if (apiError?.response?.status === 403) {
    return getAccessDeniedMessage(apiError.response.data);
  }

  const responseMessage = extractMessageFromData(apiError?.response?.data);
  if (responseMessage) return responseMessage;

  return typeof apiError?.message === "string" && apiError.message.trim()
    ? apiError.message
    : fallback;
}

export function emitApiAccessDenied(message: string, path?: string): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<ApiAccessDeniedEventDetail>(API_ACCESS_DENIED_EVENT, {
      detail: { message, path },
    }),
  );
}
