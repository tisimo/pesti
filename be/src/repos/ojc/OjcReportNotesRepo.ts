import { Service } from "typedi";
import { v4 as uuidv4 } from "uuid";
import { ojcPool } from "../../loaders/postgres";
import Logger from "../../loaders/logger";

export interface ReportNote {
  noteId: string;
  reportId: string;
  note: string;
  adminEmail: string;
  timestamp: string;
}

@Service()
export default class OjcReportNotesRepo {
  private tableReady: boolean | null = null;

  private async ensureTable(): Promise<boolean> {
    if (this.tableReady === true) return true;
    if (this.tableReady === false) return false;
    try {
      const { rows } = await ojcPool.query<{ tableName: string | null }>(
        `SELECT to_regclass('"ReportNotes"') AS "tableName"`,
      );
      this.tableReady = Boolean(rows[0]?.tableName);
      return this.tableReady;
    } catch (error) {
      Logger.warn({ err: error }, "[OjcReportNotesRepo] Failed to check report notes table");
      this.tableReady = false;
      return false;
    }
  }

  public async getNotes(reportId: string): Promise<ReportNote[]> {
    const ready = await this.ensureTable();
    if (!ready) return [];
    try {
      const { rows } = await ojcPool.query<ReportNote>(
        `SELECT "noteId", "reportId", "note", "adminEmail", "createdAt" AS "timestamp"
         FROM "ReportNotes"
         WHERE "reportId" = $1
         ORDER BY "createdAt" DESC`,
        [reportId],
      );
      return rows;
    } catch (error) {
      Logger.warn({ err: error, reportId }, "[OjcReportNotesRepo] Failed to load report notes");
      return [];
    }
  }

  public async addNote(reportId: string, note: string, adminEmail: string): Promise<ReportNote | null> {
    const ready = await this.ensureTable();
    if (!ready) return null;
    const noteId = uuidv4();
    const { rows } = await ojcPool.query<ReportNote>(
      `INSERT INTO "ReportNotes" ("noteId", "reportId", "note", "adminEmail", "createdAt")
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING "noteId", "reportId", "note", "adminEmail", "createdAt" AS "timestamp"`,
      [noteId, reportId, note, adminEmail],
    );
    return rows[0] ?? null;
  }
}
