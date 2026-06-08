import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import config from "../../config";
import type IAdminInboxService from "../services/IServices/IAdminInboxService";
import SupportEmailService from "../services/SupportEmailService";
import Logger from "../loaders/logger";

function getInboxErrorDetail(err: unknown): string {
  const error = err as {
    response?: { data?: { error?: { code?: string; message?: string } }; status?: number };
    $metadata?: { httpStatusCode?: number };
    message?: string;
    code?: string;
    name?: string;
  };
  const graphCode = error?.response?.data?.error?.code;
  const graphMessage = error?.response?.data?.error?.message;
  const httpStatus = error?.response?.status ?? error?.$metadata?.httpStatusCode;

  return [graphCode, graphMessage, error?.message, error?.code, error?.name, httpStatus].filter(Boolean).join(" |");
}

export function normalizeEmail(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRecipientList(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return [...new Set(values.map((item) => normalizeEmail(String(item))).filter(Boolean))];
}

export function hasInvalidRecipient(list: string[]): boolean {
  return list.some((email) => !SIMPLE_EMAIL_REGEX.test(email));
}

export function buildReplySubject(subject: string): string {
  const trimmed = subject.trim();
  if (!trimmed || /^re:?\s*$/i.test(trimmed)) return "No subject";

  if (/^re:/i.test(trimmed)) {
    const withoutPrefix = trimmed.replace(/^re:\s*/i, "").trim();
    return withoutPrefix ? `Re: ${withoutPrefix}` : "No subject";
  }

  return `Re: ${trimmed}`;
}

export function getReplyRecipient(thread: { from: string; messages: { from: string }[] }): string {
  const supportMailbox = normalizeEmail(config.microsoftUserEmail);
  const recipient = thread.messages.find(
    message => normalizeEmail(message.from) && normalizeEmail(message.from) !== supportMailbox,
  )?.from;
  return recipient || thread.from;
}

@Service()
export default class AdminEmailController {
  constructor(
    @Inject("adminInboxService") private readonly inboxService: IAdminInboxService,
    @Inject("supportEmailService") private readonly supportEmailService: SupportEmailService,
  ) {}

  public listThreads = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const items = await this.inboxService.listThreads(25);
      return res.status(200).json({ items });
    } catch (err: unknown) {
      Logger.error({ err }, "Microsoft inbox list failed");
      const detail = getInboxErrorDetail(err);
      return res.status(500).json({ message: detail ? `Microsoft inbox error: ${detail}` : "Failed to load inbox" });
    }
  };

  public getThread = async (req: Request, res: Response): Promise<Response> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ message: "Missing thread id" });
    try {
      const thread = await this.inboxService.getThreadById(id);
      if (!thread) return res.status(404).json({ message: "Thread not found" });
      return res.status(200).json(thread);
    } catch (err: unknown) {
      Logger.error({ err }, "Microsoft inbox thread load failed");
      const detail = getInboxErrorDetail(err);
      return res.status(500).json({ message: detail ? `Microsoft inbox error: ${detail}` : "Failed to load thread" });
    }
  };
}
