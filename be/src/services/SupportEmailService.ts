import axios from "axios";
import { Service } from "typedi";
import config from "../../config";
import Logger from "../loaders/logger";
import { ReportAction } from "./EmailService";

type GraphTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

@Service()
export default class SupportEmailService {
  private cachedAccessToken: string | null = null;
  private cachedAccessTokenExpiresAtMs = 0;

  public async sendThreadReplyEmail(
    toEmail: string,
    subject: string,
    bodyHtml: string,
    ccRecipients: string[] = [],
    bccRecipients: string[] = [],
    _replyToMessageId?: string,
  ): Promise<void> {
    try {
      await this.sendHtmlEmail(toEmail, subject, bodyHtml, ccRecipients, bccRecipients);
    } catch (err) {
      Logger.error({ err }, `Failed to send support email to ${toEmail}`);
    }
  }

  public async sendReportActionEmail(
    toEmail: string,
    campaignTitle: string,
    action: ReportAction,
    message?: string,
    status?: string,
  ): Promise<void> {
    const { subject, body } = this.buildReportTemplate(campaignTitle, action, message, status);

    await this.sendThreadReplyEmail(toEmail, subject, body);
  }

  private getGraphConfig() {
    const tenantId = config.microsoftTenantId;
    const clientId = config.microsoftClientId;
    const clientSecret = config.microsoftClientSecret;
    const userEmail = config.microsoftUserEmail;
    const scope = config.microsoftGraphScope;

    if (!tenantId || !clientId || !clientSecret || !userEmail) {
      throw new Error(
        "Support email is not configured. Set MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET and MICROSOFT_USER_EMAIL.",
      );
    }

    return { tenantId, clientId, clientSecret, userEmail, scope };
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

  private async sendHtmlEmail(
    toEmail: string,
    subject: string,
    html: string,
    ccRecipients: string[] = [],
    bccRecipients: string[] = [],
  ): Promise<void> {
    const cfg = this.getGraphConfig();
    const accessToken = await this.getAccessToken();

    await axios.post(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.userEmail)}/sendMail`,
      {
        message: {
          subject,
          body: {
            contentType: "HTML",
            content: html,
          },
          toRecipients: [{ emailAddress: { address: toEmail } }],
          ...(ccRecipients.length
            ? { ccRecipients: ccRecipients.map(address => ({ emailAddress: { address } })) }
            : {}),
          ...(bccRecipients.length
            ? { bccRecipients: bccRecipients.map(address => ({ emailAddress: { address } })) }
            : {}),
        },
        saveToSentItems: true,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );
  }

  private buildReportTemplate(
    title: string,
    action: ReportAction,
    message?: string,
    status?: string,
  ): { subject: string; body: string } {
    const safeTitle = this.escapeHtml(title);
    const safeMessage = message
      ? `<p><strong>Message from our team:</strong></p><blockquote>${this.escapeHtml(message)}</blockquote>`
      : "";

    if (action === "STATUS_CHANGED") {
      return {
        subject: `Update on your report for "${title}"`,
        body: `
          <p>We reviewed your report regarding <strong>${safeTitle}</strong>.</p>
          ${status ? `<p>The report status is now <strong>${this.escapeHtml(status)}</strong>.</p>` : ""}
          ${safeMessage}
          <p>-- The JustCauses Team</p>
        `,
      };
    }

    if (action === "ACCEPT_REPORT") {
      return {
        subject: `Your report for "${title}" was accepted`,
        body: `
          <p>Thank you for helping keep JustCauses safe.</p>
          <p>We reviewed your report and have taken action on <strong>${safeTitle}</strong>.</p>
          ${safeMessage}
          <p>-- The JustCauses Team</p>
        `,
      };
    }

    if (action === "REJECT_REPORT") {
      return {
        subject: `Update on your report for "${title}"`,
        body: `
          <p>We reviewed your report regarding <strong>${safeTitle}</strong>.</p>
          <p>At this time, no action was taken.</p>
          ${safeMessage}
          <p>-- The JustCauses Team</p>
        `,
      };
    }

    if (action === "WARN_CREATOR") {
      return {
        subject: `Update on your report for "${title}"`,
        body: `
          <p>We reviewed your report and issued a warning to the creator of <strong>${safeTitle}</strong>.</p>
          ${safeMessage}
          <p>-- The JustCauses Team</p>
        `,
      };
    }

    return {
      subject: `Update on your report for "${title}"`,
      body: `
        <p>We reviewed your report and requested changes from the creator of <strong>${safeTitle}</strong>.</p>
        ${safeMessage}
        <p>-- The JustCauses Team</p>
      `,
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

