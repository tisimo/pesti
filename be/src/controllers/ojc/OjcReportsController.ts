import { Request, Response } from "express";
import { Inject, Service } from "typedi";
import OjcReportsService from "../../services/ojc/OjcReportsService";
import OjcReportNotesRepo from "../../repos/ojc/OjcReportNotesRepo";
import IAuditLogService from "../../services/IServices/IAuditLogService";
import { ReportAction } from "../../services/EmailService";
import { extractActor } from "../utils/extractActor";
import { respondWithControllerError, respondWithServiceError } from "../utils/serviceErrorResponse";
import Logger from "../../loaders/logger";

const VALID_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"] as const;
type ReportStatus = (typeof VALID_STATUSES)[number];
const codeStatusMap = {
  CREATOR_ALREADY_SUSPENDED: 409,
  STRIKE_UPDATE_FAILED: 409,
  LIVE_UPDATE_CONFLICT: 409,
} as const;

function buildReportActionAuditDetails(
  action: ReportAction,
  message?: string,
  resolve?: boolean,
  applyStrike?: boolean,
): Record<string, unknown> {
  const trimmedMessage = message?.trim();
  const details: Record<string, unknown> = {
    moderationAction: action,
    resolveReport: !!resolve,
  };

  if (trimmedMessage) {
    details.message = trimmedMessage;
    details.messageLength = trimmedMessage.length;
  }

  if (resolve) {
    details.reportStatus = "RESOLVED";
  }

  if (action === "ACCEPT_REPORT") {
    details.campaignStatus = "INACTIVE";
  }

  if (action === "REQUEST_CHANGE") {
    details.campaignStatus = "REVIEWING";
  }

  if (action === "ACCEPT_REPORT" || action === "WARN_CREATOR") {
    details.strikeApplied = !!applyStrike;
  }

  return details;
}

function buildReportNoteAuditDetails(note: string): Record<string, unknown> {
  const trimmedNote = note.trim();
  const previewLimit = 160;
  const isTruncated = trimmedNote.length > previewLimit;

  return {
    note: trimmedNote,
    noteLength: trimmedNote.length,
    notePreview: isTruncated
      ? `${trimmedNote.slice(0, previewLimit).trimEnd()}...`
      : trimmedNote,
    truncated: isTruncated,
  };
}

function buildReportStatusAuditDetails(
  previousStatus: ReportStatus,
  nextStatus: ReportStatus,
  nextResolutionNote?: string | null,
): Record<string, unknown> {
  const details: Record<string, unknown> = {
    previousStatus,
    nextStatus,
  };

  if (nextResolutionNote?.trim()) {
    details.resolutionNote = nextResolutionNote.trim();
  }

  return details;
}

function buildReportSummaryAuditDetails(
  previousResolutionNote?: string | null,
  nextResolutionNote?: string | null,
): Record<string, unknown> {
  const trimmedPrevious = previousResolutionNote?.trim() || "";
  const trimmedNext = nextResolutionNote?.trim() || "";
  const previewLimit = 160;
  const nextPreview = trimmedNext.length > previewLimit
    ? `${trimmedNext.slice(0, previewLimit).trimEnd()}...`
    : trimmedNext;

  return {
    previousSummary: trimmedPrevious || null,
    nextSummary: trimmedNext || null,
    previousSummaryLength: trimmedPrevious.length,
    nextSummaryLength: trimmedNext.length,
    nextSummaryPreview: nextPreview || null,
  };
}

@Service()
export default class OjcReportsController {
  constructor(
    @Inject("ojcReportsService") private readonly service: OjcReportsService,
    @Inject("auditLogService") private readonly auditLogService: IAuditLogService,
    @Inject("ojcReportNotesRepo") private readonly notesRepo: OjcReportNotesRepo,
  ) {}

  public getById = async (req: Request, res: Response): Promise<Response> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ message: "Report ID is required" });
    try {
      const report = await this.service.getById(id);
      if (!report) return res.status(404).json({ message: "Report not found" });
      return res.status(200).json(report);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC report detail",
        fallbackMessage: "Unable to load this report. Check campaign report tables and linked campaign records.",
      });
    }
  };

  public list = async (req: Request, res: Response): Promise<Response> => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const result = await this.service.listReports(status, page, pageSize);
      return res.status(200).json(result);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC reports",
        fallbackMessage: "Unable to load reports. Check campaign report tables and OJC database connection.",
      });
    }
  };

  public updateStatus = async (req: Request, res: Response): Promise<Response> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, resolutionNote } = req.body as { status: ReportStatus; resolutionNote?: string };

    if (!id) {
      return res.status(400).json({ message: "Report ID is required" });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    try {
      const result = await this.service.updateStatus(id, status, resolutionNote);
      if (!result) return res.status(404).json({ message: "Report not found" });
      const actor = extractActor(req);
      const summaryChanged =
        (result.previousResolutionNote ?? "").trim() !== (result.nextResolutionNote ?? "").trim();
      if (result.previousStatus !== result.nextStatus) {
        this.auditLogService
          .log({
            ...actor,
            action: "REPORT_STATUS_CHANGED",
            targetType: "report",
            targetId: id,
            targetLabel: result.campaignTitle ?? undefined,
            details: buildReportStatusAuditDetails(
              result.previousStatus,
              result.nextStatus,
              result.nextResolutionNote,
            ),
          })
          .catch((error) => {
            Logger.warn({ err: error, reportId: id }, "[OjcReportsController] Failed to write status audit log");
          });
      } else if (summaryChanged) {
        this.auditLogService
          .log({
            ...actor,
            action: "REPORT_SUMMARY_UPDATED",
            targetType: "report",
            targetId: id,
            targetLabel: result.campaignTitle ?? undefined,
            details: buildReportSummaryAuditDetails(
              result.previousResolutionNote,
              result.nextResolutionNote,
            ),
          })
          .catch((error) => {
            Logger.warn({ err: error, reportId: id }, "[OjcReportsController] Failed to write summary audit log");
          });
      }
      return res.status(204).send();
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Updating OJC report status",
        fallbackMessage: "Unable to update report status. Check the report record and report table schema.",
      });
    }
  };

  public notifyReporter = async (req: Request, res: Response): Promise<Response> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { action, message, resolve, applyStrike } = req.body as { action: ReportAction; message?: string; resolve?: boolean; applyStrike?: boolean };

    if (!id) {
      return res.status(400).json({ message: "Report ID is required" });
    }

    try {
      const actor = extractActor(req);
      const data = await this.service.notifyReporter(id, action, actor.adminUserId, message, resolve, applyStrike);
      if (!data) return res.status(404).json({ message: "Report not found" });
      this.auditLogService
        .log({
          ...actor,
          action: "REPORT_ACTION_TAKEN",
          targetType: "report",
          targetId: id,
          targetLabel: data.campaignTitle ?? undefined,
          details: buildReportActionAuditDetails(action, message, resolve, applyStrike),
        })
        .catch((error) => {
          Logger.warn({ err: error, reportId: id }, "[OjcReportsController] Failed to write action audit log");
        });

      return res.status(204).send();
    } catch (error) {
      return respondWithServiceError(res, error, 500, codeStatusMap);
    }
  };

  public getNotes = async (req: Request, res: Response): Promise<Response> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ message: "Report ID is required" });
    try {
      const items = await this.notesRepo.getNotes(id);
      return res.status(200).json({ items });
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Loading OJC report notes",
        fallbackMessage: "Unable to load report notes. Check that the report notes table is available.",
      });
    }
  };

  public addNote = async (req: Request, res: Response): Promise<Response> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { note } = req.body as { note: string };
    if (!id) return res.status(400).json({ message: "Report ID is required" });
    try {
      const actor = extractActor(req);
      const item = await this.notesRepo.addNote(id, note, actor.adminEmail);
      if (!item) return res.status(503).json({ message: "Notes table unavailable" });
      this.auditLogService
        .log({
          ...actor,
          action: "REPORT_NOTE_ADDED",
          targetType: "report",
          targetId: id,
          details: buildReportNoteAuditDetails(note),
        })
        .catch((error) => {
          Logger.warn({ err: error, reportId: id }, "[OjcReportsController] Failed to write note audit log");
        });
      return res.status(201).json(item);
    } catch (error) {
      return respondWithControllerError(res, error, {
        operation: "Saving OJC report note",
        fallbackMessage: "Unable to save this report note. Check that the report notes table is available.",
      });
    }
  };
}
