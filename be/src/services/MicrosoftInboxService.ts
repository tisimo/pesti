import axios from "axios";
import { Service } from "typedi";
import config from "../../config";
import type IAdminInboxService from "./IServices/IAdminInboxService";
import type { AdminEmailThread } from "./IServices/IAdminInboxService";

type GraphTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type GraphListResponse<T> = {
  value?: T[];
};

type GraphEmailAddress = {
  address?: string;
};

type GraphRecipient = {
  emailAddress?: GraphEmailAddress;
};

type GraphMessageBody = {
  contentType?: string;
  content?: string;
};

type GraphMessage = {
  id?: string;
  conversationId?: string;
  from?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  subject?: string;
  receivedDateTime?: string;
  sentDateTime?: string;
  body?: GraphMessageBody;
  bodyPreview?: string;
  isRead?: boolean;
  hasAttachments?: boolean;
};

type ParsedEmailRecord = {
  messageId: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  sentAt: string;
  bodyHtml: string;
  attachments: string[];
  isSeen: boolean;
};

function isInitiallySentToMailbox(threadRecords: ParsedEmailRecord[], mailbox: string): boolean {
  if (!threadRecords.length) return false;

  const firstMessage = [...threadRecords].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt))[0];
  return (firstMessage?.to ?? "").trim().toLowerCase() === mailbox.trim().toLowerCase();
}

function normalizeSubject(value?: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || /^re:?\s*$/i.test(trimmed)) return "No subject";
  return trimmed;
}

function getOriginalSender(threadRecords: ParsedEmailRecord[], mailbox: string): string {
  const firstExternalMessage = [...threadRecords]
    .sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt))
    .find(message => (message.from ?? "").trim().toLowerCase() !== mailbox.trim().toLowerCase());

  return firstExternalMessage?.from ?? threadRecords[0]?.from ?? "unknown";
}

@Service()
export default class MicrosoftInboxService implements IAdminInboxService {
  private cachedAccessToken: string | null = null;
  private cachedAccessTokenExpiresAtMs = 0;

  private getGraphConfig() {
    const tenantId = config.microsoftTenantId;
    const clientId = config.microsoftClientId;
    const clientSecret = config.microsoftClientSecret;
    const userEmail = config.microsoftUserEmail;
    const scope = config.microsoftGraphScope;
    const maxScan = config.microsoftInboxMaxScan;

    if (!tenantId || !clientId || !clientSecret || !userEmail) {
      throw new Error(
        "Microsoft inbox is not configured. Set MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET and MICROSOFT_USER_EMAIL.",
      );
    }

    return { tenantId, clientId, clientSecret, userEmail, scope, maxScan };
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedAccessToken && now < this.cachedAccessTokenExpiresAtMs) {
      return this.cachedAccessToken;
    }

    const cfg = this.getGraphConfig();
    const tokenUrl = `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`;

    const payload = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      scope: cfg.scope,
    });

    const response = await axios.post<GraphTokenResponse>(tokenUrl, payload.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const accessToken = response.data?.access_token;
    if (!accessToken) {
      throw new Error("Microsoft Graph token response did not include access_token.");
    }

    const expiresInSeconds = Number(response.data?.expires_in ?? 3600);
    const refreshSkewSeconds = 120;

    this.cachedAccessToken = accessToken;
    this.cachedAccessTokenExpiresAtMs = now + Math.max(60, expiresInSeconds - refreshSkewSeconds) * 1000;

    return accessToken;
  }

  private async fetchMessages(query: URLSearchParams, folderPath = "messages", folderId = "inbox"): Promise<GraphMessage[]> {
    const cfg = this.getGraphConfig();
    const accessToken = await this.getAccessToken();
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.userEmail)}/mailFolders/${folderId}/${folderPath}?${query.toString()}`;

    const response = await axios.get<GraphListResponse<GraphMessage>>(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return Array.isArray(response.data?.value) ? response.data.value : [];
  }

  private toRecord(message: GraphMessage): ParsedEmailRecord {
    const messageId = message.id || `${Date.now()}`;
    const threadId = message.conversationId || messageId;
    const from = message.from?.emailAddress?.address || "unknown";
    const to = message.toRecipients?.[0]?.emailAddress?.address || "unknown";
    const subject = normalizeSubject(message.subject);
    const sentAt = message.sentDateTime || message.receivedDateTime || new Date().toISOString();
    const rawContent = message.body?.content || "";
    const isHtml = (message.body?.contentType || "").toLowerCase() === "html";
    const fallbackPreview = message.bodyPreview ? this.escapeHtml(message.bodyPreview).replace(/\n/g, "<br/>") : "";

    return {
      messageId,
      threadId,
      from,
      to,
      subject,
      sentAt,
      bodyHtml: rawContent
        ? isHtml
          ? rawContent
          : this.escapeHtml(rawContent).replace(/\n/g, "<br/>")
        : fallbackPreview,
      attachments: message.hasAttachments ? ["attachment"] : [],
      isSeen: message.isRead !== false,
    };
  }

  private async fetchThreadMessages(query: URLSearchParams): Promise<GraphMessage[]> {
    const [inboxMessages, sentMessages] = await Promise.all([
      this.fetchMessages(query, "messages", "inbox"),
      this.fetchMessages(query, "messages", "sentitems"),
    ]);

    const merged = new Map<string, GraphMessage>();
    for (const message of [...inboxMessages, ...sentMessages]) {
      const key = message.id || `${message.conversationId ?? "unknown"}-${message.sentDateTime ?? message.receivedDateTime ?? Math.random()}`;
      if (!merged.has(key)) {
        merged.set(key, message);
      }
    }

    return [...merged.values()];
  }

  private async loadRecentMessages(limit: number): Promise<ParsedEmailRecord[]> {
    const cfg = this.getGraphConfig();
    const scanLimit = Math.max(1, Math.min(cfg.maxScan, Math.max(limit * 5, limit)));

    const query = new URLSearchParams({
      $top: String(scanLimit),
      $orderby: "receivedDateTime desc",
      $select:
        "id,conversationId,from,toRecipients,subject,receivedDateTime,sentDateTime,body,bodyPreview,isRead,hasAttachments",
    });

    const items = await this.fetchThreadMessages(query);

    return items.map(message => this.toRecord(message)).sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
  }

  public async listThreads(limit = 25): Promise<AdminEmailThread[]> {
    const records = await this.loadRecentMessages(limit);
    const grouped = new Map<string, ParsedEmailRecord[]>();

    for (const record of records) {
      const current = grouped.get(record.threadId) ?? [];
      current.push(record);
      grouped.set(record.threadId, current);
    }

    const supportMailbox = this.getGraphConfig().userEmail;

    return [...grouped.entries()]
      .filter(([, threadRecords]) => isInitiallySentToMailbox(threadRecords, supportMailbox))
      .map(([threadId, threadRecords]) => {
        const messages = [...threadRecords].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));
        const latest = messages[messages.length - 1];
        const status: "UNREAD" | "READ" = messages.some(message => !message.isSeen) ? "UNREAD" : "READ";

        return {
          id: threadId,
          from: getOriginalSender(messages, supportMailbox),
          subject: latest?.subject ?? "No subject",
          receivedAt: latest?.sentAt ?? new Date().toISOString(),
          status,
          messages: messages.map(message => ({
            id: message.messageId,
            from: message.from,
            to: message.to,
            sentAt: message.sentAt,
            bodyHtml: message.bodyHtml,
            attachments: message.attachments,
          })),
        };
      })
      .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))
      .slice(0, limit);
  }

  public async getThreadById(threadId: string): Promise<AdminEmailThread | null> {
    const escapedThreadId = threadId.replace(/'/g, "''");
    const query = new URLSearchParams({
      $filter: `conversationId eq '${escapedThreadId}'`,
      $top: String(this.getGraphConfig().maxScan),
      $select:
        "id,conversationId,from,toRecipients,subject,receivedDateTime,sentDateTime,body,bodyPreview,isRead,hasAttachments",
    });

    const items = await this.fetchThreadMessages(query);
    const records = items
      .map(message => this.toRecord(message))
      .sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));

    if (!isInitiallySentToMailbox(records, this.getGraphConfig().userEmail)) {
      return null;
    }

    if (!records.length) {
      return null;
    }

    const latest = records[records.length - 1];
    const status: "UNREAD" | "READ" = records.some(message => !message.isSeen) ? "UNREAD" : "READ";

    return {
      id: threadId,
      from: getOriginalSender(records, this.getGraphConfig().userEmail),
      subject: latest.subject,
      receivedAt: latest.sentAt,
      status,
      messages: records.map(message => ({
        id: message.messageId,
        from: message.from,
        to: message.to,
        sentAt: message.sentAt,
        bodyHtml: message.bodyHtml,
        attachments: message.attachments,
      })),
    };
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
