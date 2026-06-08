import { SendEmailCommand } from "@aws-sdk/client-ses";
import { Service } from "typedi";
import { sesClient } from "../loaders/ses";
import { CampaignStatus } from "../repos/ojc/OjcCampaignsRepo";
import Logger from "../loaders/logger";

const FROM_EMAIL = process.env.SES_FROM_EMAIL ?? "noreply@justcauses.app";

export type ReportAction = "STATUS_CHANGED" | "REJECT_REPORT" | "ACCEPT_REPORT" | "WARN_CREATOR" | "REQUEST_CHANGE";
export type CampaignRevisionOutcomeAction = "approved" | "changes_requested" | "rejected";
export type CampaignRevisionOutcomeThreadType = "initial_approval" | "live_update";

@Service()
export default class EmailService {
  public async sendCampaignStatusEmail(
    toEmail: string,
    campaignTitle: string,
    status: CampaignStatus,
    reviewMessage?: string,
  ): Promise<void> {
    const { subject, body } = this.buildTemplate(campaignTitle, status, reviewMessage);

    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: body, Charset: "UTF-8" } },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send campaign status email to ${toEmail}`);
    }
  }

  public async sendCampaignRevisionOutcomeEmail(
    toEmail: string,
    campaignTitle: string,
    action: CampaignRevisionOutcomeAction,
    threadType: CampaignRevisionOutcomeThreadType,
    reviewMessage?: string,
  ): Promise<void> {
    const { subject, body } = this.buildCampaignRevisionOutcomeTemplate(
      campaignTitle,
      action,
      threadType,
      reviewMessage,
    );

    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: body, Charset: "UTF-8" } },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send campaign revision outcome email to ${toEmail}`);
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

    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: body, Charset: "UTF-8" } },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send report action email to ${toEmail}`);
    }
  }

  private buildTemplate(
    title: string,
    status: CampaignStatus,
    reviewMessage?: string,
  ): { subject: string; body: string } {
    const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const safeTitle = escape(title);

    if (status === "ACTIVE") {
      return {
        subject: `Your campaign "${title}" has been approved!`,
        body: `
          <p>Great news! Your campaign <strong>${safeTitle}</strong> has been reviewed and is now <strong>live</strong> on JustCauses.</p>
          <p>People can now discover and support your cause. Good luck!</p>
          <p>— The JustCauses Team</p>
        `,
      };
    }

    if (status === "REVIEWING") {
      return {
        subject: `Changes requested for your campaign "${title}"`,
        body: `
          <p>Your campaign <strong>${safeTitle}</strong> has been reviewed and requires some changes before it can be approved.</p>
          ${reviewMessage ? `<p><strong>Message from our team:</strong></p><blockquote>${escape(reviewMessage)}</blockquote>` : ""}
          <p>Please log in to JustCauses, update your campaign accordingly, and resubmit it for review.</p>
          <p>— The JustCauses Team</p>
        `,
      };
    }

    // REJECTED
    return {
      subject: `Your campaign "${title}" was not approved`,
      body: `
        <p>Unfortunately, your campaign <strong>${safeTitle}</strong> did not meet our platform guidelines and has been rejected.</p>
        ${reviewMessage ? `<p><strong>Reason:</strong></p><blockquote>${escape(reviewMessage)}</blockquote>` : ""}
        <p>If you believe this decision was made in error, please contact our support team.</p>
        <p>— The JustCauses Team</p>
      `,
    };
  }

  private buildCampaignRevisionOutcomeTemplate(
    title: string,
    action: CampaignRevisionOutcomeAction,
    threadType: CampaignRevisionOutcomeThreadType,
    reviewMessage?: string,
  ): { subject: string; body: string } {
    const safeTitle = this.escapeHtml(title);
    const safeMessage = reviewMessage?.trim()
      ? `<p><strong>Message from our team:</strong></p><blockquote>${this.escapeHtml(reviewMessage.trim())}</blockquote>`
      : "";

    if (action === "approved") {
      if (threadType === "initial_approval") {
        return {
          subject: `Your campaign "${title}" has been approved`,
          body: `
            <p>Your campaign <strong>${safeTitle}</strong> has been approved and is now live on JustCauses.</p>
            ${safeMessage}
            <p>You can continue sharing your cause and welcoming supporters.</p>
            <p>-- The JustCauses Team</p>
          `,
        };
      }

      return {
        subject: `Your campaign update for "${title}" has been approved`,
        body: `
          <p>The changes you submitted for <strong>${safeTitle}</strong> have been approved and are now live.</p>
          ${safeMessage}
          <p>Your public campaign has been updated successfully.</p>
          <p>-- The JustCauses Team</p>
        `,
      };
    }

    if (action === "changes_requested") {
      if (threadType === "initial_approval") {
        return {
          subject: `Changes requested for your campaign "${title}"`,
          body: `
            <p>Your campaign submission <strong>${safeTitle}</strong> needs some changes before it can be approved.</p>
            ${safeMessage}
            <p>Please update the campaign and resubmit it for review.</p>
            <p>-- The JustCauses Team</p>
          `,
        };
      }

      return {
        subject: `Changes requested for your campaign update "${title}"`,
        body: `
          <p>The update you submitted for <strong>${safeTitle}</strong> needs some changes before it can replace the current public version.</p>
          ${safeMessage}
          <p>Your current live campaign remains published while you revise the submitted changes.</p>
          <p>-- The JustCauses Team</p>
        `,
      };
    }

    if (threadType === "initial_approval") {
      return {
        subject: `Your campaign "${title}" was not approved`,
        body: `
          <p>Your campaign submission <strong>${safeTitle}</strong> was rejected and will not be published.</p>
          ${safeMessage}
          <p>If you believe this decision was made in error, please contact our support team.</p>
          <p>-- The JustCauses Team</p>
        `,
      };
    }

    return {
      subject: `Your campaign update for "${title}" was rejected`,
      body: `
        <p>The proposed changes to <strong>${safeTitle}</strong> were rejected.</p>
        ${safeMessage}
        <p>Your current live campaign remains unchanged.</p>
        <p>-- The JustCauses Team</p>
      `,
    };
  }

  private buildReportTemplate(
    title: string,
    action: ReportAction,
    message?: string,
    status?: string,
  ): { subject: string; body: string } {
    const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const safeTitle = escape(title);
    const safeMessage = message
      ? `<p><strong>Message from our team:</strong></p><blockquote>${escape(message)}</blockquote>`
      : "";

    if (action === "STATUS_CHANGED") {
      return {
        subject: `Update on your report for "${title}"`,
        body: `
          <p>We reviewed your report regarding <strong>${safeTitle}</strong>.</p>
          ${status ? `<p>The report status is now <strong>${escape(status)}</strong>.</p>` : ""}
          ${safeMessage}
          <p>— The JustCauses Team</p>
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
          <p>— The JustCauses Team</p>
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
          <p>— The JustCauses Team</p>
        `,
      };
    }

    if (action === "WARN_CREATOR") {
      return {
        subject: `Update on your report for "${title}"`,
        body: `
          <p>We reviewed your report and issued a warning to the creator of <strong>${safeTitle}</strong>.</p>
          ${safeMessage}
          <p>— The JustCauses Team</p>
        `,
      };
    }

    return {
      subject: `Update on your report for "${title}"`,
      body: `
        <p>We reviewed your report and requested changes from the creator of <strong>${safeTitle}</strong>.</p>
        ${safeMessage}
        <p>— The JustCauses Team</p>
      `,
    };
  }

  public async sendCreatorWarningEmail(
    toEmail: string,
    campaignTitle: string,
    message?: string,
  ): Promise<void> {
    const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeTitle = escape(campaignTitle);
    const safeMessage = message
      ? `<p><strong>Note from our team:</strong></p><blockquote>${escape(message)}</blockquote>`
      : "";

    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: `Warning issued for your campaign "${campaignTitle}"`, Charset: "UTF-8" },
        Body: {
          Html: {
            Data: `
              <p>Your campaign <strong>${safeTitle}</strong> has received a formal warning following a review of reported content.</p>
              ${safeMessage}
              <p>Please ensure your campaign complies with our platform guidelines. Repeated violations may result in your account being suspended.</p>
              <p>-- The JustCauses Team</p>
            `,
            Charset: "UTF-8",
          },
        },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send creator warning email to ${toEmail}`);
    }
  }

  public async sendCreatorStrikeEmail(
    toEmail: string,
    campaignTitle: string,
    strikeCount: number,
    action: "ACCEPT_REPORT" | "WARN_CREATOR",
    message?: string,
  ): Promise<void> {
    const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeTitle = escape(campaignTitle);
    const safeMessage = message
      ? `<p><strong>Note from our team:</strong></p><blockquote>${escape(message)}</blockquote>`
      : "";
    const actionSummary =
      action === "ACCEPT_REPORT"
        ? `<p>We removed your campaign <strong>${safeTitle}</strong> following a moderation review and recorded a strike on your account.</p>`
        : `<p>We reviewed your campaign <strong>${safeTitle}</strong> and recorded this warning as a strike on your account.</p>`;
    const strikeSummary =
      strikeCount >= 3
        ? `<p>Your account has now reached <strong>${strikeCount} of 3 strikes</strong> and has been suspended.</p>`
        : `<p>Your account is now at <strong>${strikeCount} of 3 strikes</strong>. Accounts are suspended automatically at 3 strikes.</p>`;

    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: `Strike recorded for your campaign "${campaignTitle}"`, Charset: "UTF-8" },
        Body: {
          Html: {
            Data: `
              ${actionSummary}
              ${safeMessage}
              ${strikeSummary}
              <p>Please review our platform guidelines before publishing or updating campaign content again.</p>
              <p>-- The JustCauses Team</p>
            `,
            Charset: "UTF-8",
          },
        },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send creator strike email to ${toEmail}`);
    }
  }

  public async sendAccountActivatedEmail(toEmail: string, clearedStrikes = false): Promise<void> {
    const strikesMessage = clearedStrikes
      ? `<p>Any strikes previously recorded on your account were cleared during the reactivation process.</p>`
      : "";

    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: "Your JustCauses account has been reactivated", Charset: "UTF-8" },
        Body: {
          Html: {
            Data: `
              <p>Your JustCauses account has been reactivated and you can sign in again.</p>
              ${strikesMessage}
              <p>Thank you for helping us keep the platform safe and trustworthy.</p>
              <p>-- The JustCauses Team</p>
            `,
            Charset: "UTF-8",
          },
        },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send account activation email to ${toEmail}`);
    }
  }

  public async sendAccountDeactivatedEmail(toEmail: string, teamMessage?: string): Promise<void> {
    const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeMessage = teamMessage?.trim()
      ? `<p><strong>Message from the team:</strong></p><blockquote>${escape(teamMessage.trim())}</blockquote>`
      : "";

    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: "Your JustCauses account has been deactivated", Charset: "UTF-8" },
        Body: {
          Html: {
            Data: `
              <p>Your JustCauses account has been deactivated.</p>
              ${safeMessage}
              <p>If you believe this happened in error, please contact our support team.</p>
              <p>-- The JustCauses Team</p>
            `,
            Charset: "UTF-8",
          },
        },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send account deactivation email to ${toEmail}`);
    }
  }

  public async sendKycProfileMismatchWarningEmail(toEmail: string, teamMessage: string): Promise<void> {
    const safeMessage = this.escapeHtml(teamMessage.trim()).replace(/\r?\n/g, "<br />");

    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: "Action required: update your JustCauses profile information", Charset: "UTF-8" },
        Body: {
          Html: {
            Data: `
              <p>${safeMessage}</p>
              <p>-- The JustCauses Team</p>
            `,
            Charset: "UTF-8",
          },
        },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send KYC profile mismatch warning email to ${toEmail}`);
      throw err;
    }
  }

  public async sendKycVerificationResetEmail(toEmail: string): Promise<void> {
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: "Your JustCauses identity verification needs to be submitted again", Charset: "UTF-8" },
        Body: {
          Html: {
            Data: `
              <p>Your pending KYC verification was not completed within the required review window, so the submission was reset.</p>
              <p>You can start a new identity verification from your JustCauses account whenever you are ready.</p>
              <p>If you believe this happened in error, please contact support.</p>
              <p>-- The JustCauses Team</p>
            `,
            Charset: "UTF-8",
          },
        },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send KYC reset email to ${toEmail}`);
    }
  }

  public async sendSingleStrikeClearedEmail(toEmail: string, remainingStrikes: number): Promise<void> {
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: "A strike was removed from your JustCauses account", Charset: "UTF-8" },
        Body: {
          Html: {
            Data: `
              <p>One strike was removed from your JustCauses account after an internal review.</p>
              <p>Your account now has <strong>${remainingStrikes} of 3 strikes</strong>.</p>
              <p>Thank you for your patience while we reviewed the record.</p>
              <p>-- The JustCauses Team</p>
            `,
            Charset: "UTF-8",
          },
        },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send single strike cleared email to ${toEmail}`);
    }
  }

  public async sendAccountStrikeRecordedEmail(
    toEmail: string,
    strikeCount: number,
    suspended: boolean,
    reason?: string,
  ): Promise<void> {
    const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const reasonBlock = reason?.trim()
      ? `<p><strong>Reason provided by the moderation team:</strong></p><blockquote>${escape(reason.trim()).replace(/\n/g, "<br />")}</blockquote>`
      : "";
    const suspensionMessage = suspended
      ? `<p>Your account has reached <strong>3 of 3 strikes</strong> and has been deactivated. Please contact support if you believe this decision needs review.</p>`
      : `<p>Please review your activity and follow platform rules to avoid further enforcement. Accounts are deactivated automatically at 3 strikes.</p>`;

    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: "A strike was recorded on your JustCauses account", Charset: "UTF-8" },
        Body: {
          Html: {
            Data: `
              <p>A strike was recorded on your JustCauses account after a moderation review.</p>
              <p>Your account now has <strong>${strikeCount} of 3 strikes</strong>.</p>
              ${reasonBlock}
              ${suspensionMessage}
              <p>-- The JustCauses Team</p>
            `,
            Charset: "UTF-8",
          },
        },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send account strike recorded email to ${toEmail}`);
    }
  }

  public async sendAllStrikesClearedEmail(toEmail: string): Promise<void> {
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: "All strikes were cleared from your JustCauses account", Charset: "UTF-8" },
        Body: {
          Html: {
            Data: `
              <p>All recorded strikes were removed from your JustCauses account after an internal review.</p>
              <p>Your account now has <strong>0 of 3 strikes</strong>.</p>
              <p>Thank you for your patience while we reviewed the record.</p>
              <p>-- The JustCauses Team</p>
            `,
            Charset: "UTF-8",
          },
        },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send all strikes cleared email to ${toEmail}`);
    }
  }

  public async sendOrgAccountStatusEmail(
    toEmail: string,
    orgName: string,
    status: "ACTIVE" | "INACTIVE",
    teamMessage?: string,
  ): Promise<void> {
    const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeName = escape(orgName);
    const safeMessage = teamMessage?.trim()
      ? `<p><strong>Message from our team:</strong></p><blockquote>${escape(teamMessage.trim())}</blockquote>`
      : "";

    const { subject, body } = status === "ACTIVE"
      ? {
          subject: `Your organization "${orgName}" account has been reactivated`,
          body: `
            <p>Your organization account <strong>${safeName}</strong> on JustCauses has been reactivated and can sign in again.</p>
            ${safeMessage}
            <p>— The JustCauses Team</p>
          `,
        }
      : {
          subject: `Your organization "${orgName}" account has been deactivated`,
          body: `
            <p>Your organization account <strong>${safeName}</strong> on JustCauses has been deactivated.</p>
            ${safeMessage}
            <p>If you believe this happened in error, please contact our support team.</p>
            <p>— The JustCauses Team</p>
          `,
        };

    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: body, Charset: "UTF-8" } },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send org account status email to ${toEmail}`);
    }
  }

  public async sendKybDecisionEmail(
    toEmail: string,
    orgName: string,
    decision: "approved" | "rejected",
    adminNote?: string | null,
  ): Promise<void> {
    const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeName = escape(orgName);
    const safeNote = adminNote?.trim()
      ? `<p><strong>Message from our team:</strong></p><blockquote>${escape(adminNote.trim())}</blockquote>`
      : "";

    const { subject, body } = decision === "approved"
      ? {
          subject: `Your organization "${orgName}" has been verified`,
          body: `
            <p>Great news! Your organization <strong>${safeName}</strong> has completed the KYB (Know Your Business) verification process and is now fully verified on JustCauses.</p>
            ${safeNote}
            <p>You can now access all features available to verified organizations.</p>
            <p>— The JustCauses Team</p>
          `,
        }
      : {
          subject: `KYB verification not approved for "${orgName}"`,
          body: `
            <p>We have reviewed the KYB submission for your organization <strong>${safeName}</strong> and were unable to verify it at this time.</p>
            ${safeNote}
            <p>Please review the information submitted and contact our support team if you have questions.</p>
            <p>— The JustCauses Team</p>
          `,
        };

    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: body, Charset: "UTF-8" } },
      },
    });

    try {
      await sesClient.send(command);
    } catch (err) {
      Logger.error({ err }, `Failed to send KYB decision email to ${toEmail}`);
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
