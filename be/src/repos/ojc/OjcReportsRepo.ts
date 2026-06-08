import { Service } from "typedi";
import { ojcPool } from "../../loaders/postgres";
import { sharedPool } from "../../loaders/postgresShared";
import { hasProfileStrikeCountColumn } from "./ojcSchemaSupport";

export interface AdminReport {
  reportId: string;
  campaignId: string;
  campaignTitle: string;
  reason: string;
  description: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
  reporterEmail: string | null;
  reporterUsername: string | null;
  resolutionNote: string | null;
  reviewDueAt: string;
  createdAt: string;
}

export interface ReportsPage {
  reports: AdminReport[];
  total: number;
}

export interface ReportNotificationData {
  reportId: string;
  campaignId: string;
  campaignTitle: string | null;
  campaignAvatarUrl: string | null;
  reporterEmail: string | null;
  reporterProfileId: string | null;
  creatorProfileId: string | null;
  creatorAccountId: string | null;
}

export interface ReportStatusUpdateResult {
  campaignTitle: string | null;
  reporterEmail: string | null;
  previousStatus: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
  nextStatus: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
  previousResolutionNote: string | null;
  nextResolutionNote: string | null;
}

@Service()
export default class OjcReportsRepo {
  public async listReports(status: string | undefined, limit: number, offset: number): Promise<ReportsPage> {
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`r."status" = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const {
      rows: [{ total }],
    } = await ojcPool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM "CampaignReports" r ${where}`,
      params,
    );

    params.push(limit, offset);
    const { rows: reports } = await ojcPool.query<AdminReport>(
      `SELECT r."reportId", r."campaignId", r."reason", r."description",
              r."status", r."reporterEmail", r."resolutionNote",
              r."reviewDueAt", r."createdAt",
              c."title" AS "campaignTitle",
              p."username" AS "reporterUsername"
       FROM "CampaignReports" r
       JOIN "Campaigns" c ON c."campaignId" = r."campaignId"
       LEFT JOIN "Profiles" p ON p."profileId" = r."reporterProfileId"
       ${where}
       ORDER BY r."createdAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { reports, total };
  }

  public async getById(reportId: string): Promise<AdminReport | null> {
    const { rows } = await ojcPool.query<AdminReport>(
      `SELECT r."reportId", r."campaignId", r."reason", r."description",
              r."status", r."reporterEmail", r."resolutionNote",
              r."reviewDueAt", r."createdAt",
              c."title" AS "campaignTitle",
              p."username" AS "reporterUsername"
       FROM "CampaignReports" r
       JOIN "Campaigns" c ON c."campaignId" = r."campaignId"
       LEFT JOIN "Profiles" p ON p."profileId" = r."reporterProfileId"
       WHERE r."reportId" = $1`,
      [reportId],
    );
    return rows[0] ?? null;
  }

  public async updateStatus(
    reportId: string,
    status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED",
    resolutionNote?: string,
  ): Promise<ReportStatusUpdateResult | null> {
    const { rows } = await ojcPool.query<ReportStatusUpdateResult>(
      `WITH existing AS (
         SELECT "reportId", "status" AS "previousStatus", "resolutionNote" AS "previousResolutionNote"
         FROM "CampaignReports"
         WHERE "reportId" = $3
       )
       UPDATE "CampaignReports" AS r
       SET "status" = $1, "resolutionNote" = COALESCE($2, r."resolutionNote")
       FROM existing
       WHERE r."reportId" = existing."reportId"
       RETURNING
         existing."previousStatus" AS "previousStatus",
         existing."previousResolutionNote" AS "previousResolutionNote",
         r."status" AS "nextStatus",
         r."resolutionNote" AS "nextResolutionNote",
         r."reporterEmail" AS "reporterEmail",
         (SELECT "title" FROM "Campaigns" WHERE "campaignId" = r."campaignId") AS "campaignTitle"`,
      [status, resolutionNote ?? null, reportId],
    );
    return rows[0] ?? null;
  }

  public async setStatus(reportId: string, status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED"): Promise<void> {
    await ojcPool.query(`UPDATE "CampaignReports" SET "status" = $1 WHERE "reportId" = $2`, [status, reportId]);
  }

  public async getReportNotificationData(reportId: string): Promise<ReportNotificationData | null> {
    const { rows } = await ojcPool.query<ReportNotificationData>(
      `SELECT r."reportId", r."campaignId", r."reporterEmail",
              r."reporterProfileId" AS "reporterProfileId",
              c."title" AS "campaignTitle",
              NULLIF(BTRIM(c."media_items"->0->>'url'), '') AS "campaignAvatarUrl",
              c."profileId" AS "creatorProfileId",
              p."accountId" AS "creatorAccountId"
       FROM "CampaignReports" r
       JOIN "Campaigns" c ON c."campaignId" = r."campaignId"
       LEFT JOIN "Profiles" p ON p."profileId" = c."profileId"
       WHERE r."reportId" = $1`,
      [reportId],
    );
    return rows[0] ?? null;
  }

  public async incrementStrikeCount(profileId: string): Promise<number | null> {
    if (!(await hasProfileStrikeCountColumn())) return null;

    const { rows } = await ojcPool.query<{ strikeCount: number }>(
      `UPDATE "Profiles"
       SET "strikeCount" = COALESCE("strikeCount", 0) + 1
       WHERE "profileId" = $1
         AND COALESCE("strikeCount", 0) < 3
       RETURNING "strikeCount"`,
      [profileId],
    );
    return rows[0]?.strikeCount ?? null;
  }

  public async getStrikeCount(profileId: string): Promise<number | null> {
    if (!(await hasProfileStrikeCountColumn())) return 0;

    const { rows } = await ojcPool.query<{ strikeCount: number }>(
      `SELECT COALESCE("strikeCount", 0)::int AS "strikeCount"
       FROM "Profiles"
       WHERE "profileId" = $1`,
      [profileId],
    );
    return rows[0]?.strikeCount ?? null;
  }

  public async suspendAccount(accountId: string): Promise<void> {
    await sharedPool.query(
      `UPDATE "Account" SET "status" = 'INACTIVE', "updatedAt" = NOW() WHERE "accountId" = $1`,
      [accountId],
    );
  }

  public async getAccountEmail(accountId: string): Promise<string | null> {
    const { rows } = await sharedPool.query<{ email: string }>(
      `SELECT "email" FROM "Account" WHERE "accountId" = $1`,
      [accountId],
    );
    return rows[0]?.email ?? null;
  }
}
