import { Router } from "express";
import { Container } from "typedi";
import AdminEmailController from "../../controllers/AdminEmailController";
import { buildReplySubject, getReplyRecipient, normalizeEmail } from "../../controllers/AdminEmailController";
import { requirePermission } from "../middlewares/requirePermission";
import type IAdminInboxService from "../../services/IServices/IAdminInboxService";
import SupportEmailService from "../../services/SupportEmailService";
import config from "../../../config";

const route = Router();
const SIMPLE_EMAIL_REGEX = /^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/;

function parseRecipientList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];

  return [...new Set(values.map(item => String(item).trim().toLowerCase()).filter(Boolean))];
}

function hasInvalidRecipient(list: string[]): boolean {
  return list.some(email => !SIMPLE_EMAIL_REGEX.test(email));
}

export default (app: Router) => {
  app.use("/admin/email", route);

  const controller = Container.get("adminEmailController") as AdminEmailController;
  const inboxService = Container.get("adminInboxService") as IAdminInboxService;
  const supportEmailService = Container.get("supportEmailService") as SupportEmailService;

  route.get("", requirePermission("view_admin_email"), (req, res) => controller.listThreads(req, res));
  route.get("/:id", requirePermission("view_admin_email"), (req, res) => controller.getThread(req, res));
  route.post("/:id/reply", requirePermission("view_admin_email"), async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const ccRecipients = parseRecipientList(req.body?.cc);
    const bccRecipients = parseRecipientList(req.body?.bcc);

    if (!id) return res.status(400).json({ message: "Missing thread id" });
    if (!message) return res.status(400).json({ message: "Reply message is required" });
    if (hasInvalidRecipient(ccRecipients)) return res.status(400).json({ message: "Invalid CC email address" });
    if (hasInvalidRecipient(bccRecipients)) return res.status(400).json({ message: "Invalid BCC email address" });

    try {
      const thread = await inboxService.getThreadById(id);
      if (!thread) return res.status(404).json({ message: "Thread not found" });

      const toEmail = getReplyRecipient(thread);
      const subject = buildReplySubject(thread.subject);
      const supportMailbox = normalizeEmail(config.microsoftUserEmail);
      const orderedMessages = [...thread.messages].sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
      const replyToMessageId =
        orderedMessages.find(message => normalizeEmail(message.from) !== supportMailbox)?.id ?? orderedMessages[0]?.id;

      await supportEmailService.sendThreadReplyEmail(
        toEmail,
        subject,
        message,
        ccRecipients,
        bccRecipients,
        replyToMessageId,
      );

      return res.status(204).send();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { code?: string; message?: string } }; status?: number };
        message?: string;
      };
      const detail = [
        error?.response?.data?.error?.code,
        error?.response?.data?.error?.message,
        error?.message,
        error?.response?.status,
      ]
        .filter(Boolean)
        .join(" | ");
      return res.status(500).json({ message: detail || "Failed to send reply" });
    }
  });
};
