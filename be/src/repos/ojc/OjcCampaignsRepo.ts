import { Service } from "typedi";
import { ojcPool } from "../../loaders/postgres";
import { sharedPool } from "../../loaders/postgresShared";
import { hasProfileStrikeCountColumn } from "./ojcSchemaSupport";
import Logger from "../../loaders/logger";

export type CampaignStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "FINISHED" | "REJECTED" | "REVIEWING";

export type VerificationStatus = "PENDING" | "VERIFIED" | "DECLINED";
export type CampaignApprovalState =
  | "none"
  | "pending_initial_approval"
  | "changes_requested_initial_approval"
  | "pending_new_version_approval"
  | "changes_requested_new_version";

export interface CampaignWorkflowSummary {
  approvalState: CampaignApprovalState;
  openThreadId: string | null;
  openSubmissionNumber: number | null;
  lastAdminMessage: string | null;
}

export interface AdminCampaign {
  campaignId: string;
  profileId: string;
  title: string;
  category: string;
  country: string;
  status: CampaignStatus;
  goalAmount: number;
  amountRaised: number;
  donorCount: number;
  viewsCount: number;
  sharesCount: number;
  creatorUsername: string;
  creatorFirstName: string;
  creatorLastName: string;
  creatorVerificationStatus: VerificationStatus | null;
  thumbnailUrl: string | null;
  reviewMessage: string | null;
  createdAt: string;
  publishedAt: string | null;
  workflow: CampaignWorkflowSummary | null;
}

export interface AdminCampaignDetail extends AdminCampaign {
  description: string;
  city: string;
  durationDays: number | null;
  creatorStrikeCount: number | null;
}

export interface CampaignsPage {
  campaigns: AdminCampaign[];
  total: number;
}

export interface CampaignStatusUpdateResult {
  title: string;
  profileId: string;
  creatorAccountId: string | null;
  thumbnailUrl: string | null;
  previousStatus: CampaignStatus;
  nextStatus: CampaignStatus;
  previousReviewMessage: string | null;
  nextReviewMessage: string | null;
}

@Service()
export default class OjcCampaignsRepo {
  public async listCampaigns(
    status: string | undefined,
    category: string | undefined,
    search: string | undefined,
    limit: number,
    offset: number,
  ): Promise<CampaignsPage> {
    const params: any[] = [];
    const conditions: string[] = [];

    if (status === "PENDING") {
      conditions.push(`(
        EXISTS (
          SELECT 1
          FROM "CampaignRevisionThreads" t
          WHERE t."campaignId" = c."campaignId"
            AND t."type" = 'INITIAL_APPROVAL'
            AND t."status" = 'PENDING'
        )
        OR (
          c."status" = 'PENDING'
          AND NOT EXISTS (
            SELECT 1
            FROM "CampaignRevisionThreads" t
            WHERE t."campaignId" = c."campaignId"
              AND t."status" IN ('PENDING', 'CHANGES_REQUESTED')
          )
        )
      )`);
    } else if (status === "REVIEWING") {
      conditions.push(`(
        EXISTS (
          SELECT 1
          FROM "CampaignRevisionThreads" t
          WHERE t."campaignId" = c."campaignId"
            AND t."type" = 'INITIAL_APPROVAL'
            AND t."status" = 'CHANGES_REQUESTED'
        )
        OR (
          c."status" = 'REVIEWING'
          AND NOT EXISTS (
            SELECT 1
            FROM "CampaignRevisionThreads" t
            WHERE t."campaignId" = c."campaignId"
              AND t."status" IN ('PENDING', 'CHANGES_REQUESTED')
          )
        )
      )`);
    } else if (status) {
      params.push(status);
      conditions.push(`c."status" = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`cc."name" = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      const n = params.length;
      conditions.push(`(c."title" ILIKE $${n} OR p."username" ILIKE $${n})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows: [{ total }] } = await ojcPool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM "Campaigns" c
       LEFT JOIN "Profiles" p ON p."profileId" = c."profileId"
       LEFT JOIN "CampaignCategories" cc ON cc."campaignCategoryId" = c."categoryId"
       ${where}`,
      params,
    );

    params.push(limit, offset);
    type RawRow = Omit<AdminCampaign, "creatorVerificationStatus" | "workflow"> & {
      accountId: string;
      openThreadId: string | null;
      openThreadType: string | null;
      openThreadStatus: string | null;
      openSubmissionNumber: number | null;
      lastAdminMessage: string | null;
    };
    const { rows: rawRows } = await ojcPool.query<RawRow>(
      `SELECT c."campaignId", c."profileId", c."title", cc."name" AS "category", c."country",
              c."status", c."goalAmount"::float,
              COALESCE(SUM(d."amount") FILTER (WHERE d."status" = 'COMPLETED'), 0)::float AS "amountRaised",
              c."viewsCount", c."sharesCount", c."createdAt", c."publishedAt",
              c."reviewMessage",
              NULLIF(BTRIM(c."media_items"->0->>'url'), '') AS "thumbnailUrl",
              p."username" AS "creatorUsername",
              p."firstName" AS "creatorFirstName",
              p."lastName" AS "creatorLastName",
              p."accountId",
              COUNT(DISTINCT d."donationId")::int AS "donorCount",
              workflow."openThreadId",
              workflow."openThreadType",
              workflow."openThreadStatus",
              workflow."openSubmissionNumber",
              workflow."lastAdminMessage"
       FROM "Campaigns" c
       LEFT JOIN "Profiles" p ON p."profileId" = c."profileId"
       LEFT JOIN "CampaignCategories" cc ON cc."campaignCategoryId" = c."categoryId"
       LEFT JOIN "Donations" d ON d."campaignId" = c."campaignId" AND d."status" <> 'FAILED'
       LEFT JOIN LATERAL (
         SELECT
           t."threadId" AS "openThreadId",
           t."type" AS "openThreadType",
           t."status" AS "openThreadStatus",
           latest_submission."submissionNumber" AS "openSubmissionNumber",
           latest_review."message" AS "lastAdminMessage"
         FROM "CampaignRevisionThreads" t
         LEFT JOIN LATERAL (
           SELECT s."submissionNumber"
           FROM "CampaignRevisionSubmissions" s
           WHERE s."threadId" = t."threadId"
           ORDER BY s."submissionNumber" DESC
           LIMIT 1
         ) latest_submission ON TRUE
         LEFT JOIN LATERAL (
           SELECT r."message"
           FROM "CampaignRevisionReviews" r
           WHERE r."threadId" = t."threadId"
           ORDER BY r."createdAt" DESC
           LIMIT 1
         ) latest_review ON TRUE
         WHERE t."campaignId" = c."campaignId"
           AND t."status" IN ('PENDING', 'CHANGES_REQUESTED')
         ORDER BY t."updatedAt" DESC, t."createdAt" DESC
         LIMIT 1
       ) workflow ON TRUE
       ${where}
       GROUP BY c."campaignId", cc."name", p."username", p."firstName", p."lastName", p."accountId",
                workflow."openThreadId", workflow."openThreadType", workflow."openThreadStatus", workflow."openSubmissionNumber", workflow."lastAdminMessage"
       ORDER BY c."createdAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const verificationMap = await this.getVerificationStatuses(rawRows.map((r) => r.accountId));
    const campaigns: AdminCampaign[] = rawRows.map(({ accountId, openThreadId, openThreadType, openThreadStatus, openSubmissionNumber, lastAdminMessage, ...r }) => ({
      ...r,
      creatorVerificationStatus: verificationMap[accountId] ?? null,
      workflow: this.toWorkflowSummary({
        openThreadId,
        openThreadType,
        openThreadStatus,
        openSubmissionNumber,
        lastAdminMessage,
      }),
    }));

    return { campaigns, total };
  }

  public async getCampaign(campaignId: string): Promise<AdminCampaignDetail | null> {
    const hasStrikeCount = await hasProfileStrikeCountColumn();
    const strikeCountSelect = hasStrikeCount ? `COALESCE(p."strikeCount", 0)::int` : `0::int`;
    const strikeCountGroupBy = hasStrikeCount ? `, p."strikeCount"` : "";
    type RawDetail = Omit<AdminCampaignDetail, "creatorVerificationStatus" | "workflow"> & {
      accountId: string;
      openThreadId: string | null;
      openThreadType: string | null;
      openThreadStatus: string | null;
      openSubmissionNumber: number | null;
      lastAdminMessage: string | null;
    };
    const { rows } = await ojcPool.query<RawDetail>(
      `SELECT c."campaignId", c."profileId", c."title", c."description", cc."name" AS "category",
              c."country", c."city", c."status", c."goalAmount"::float,
              COALESCE(SUM(d."amount") FILTER (WHERE d."status" = 'COMPLETED'), 0)::float AS "amountRaised",
              c."viewsCount", c."sharesCount", c."durationDays", c."createdAt", c."publishedAt",
              c."reviewMessage",
              NULLIF(BTRIM(c."media_items"->0->>'url'), '') AS "thumbnailUrl",
              p."username" AS "creatorUsername",
              p."firstName" AS "creatorFirstName",
              p."lastName" AS "creatorLastName",
              ${strikeCountSelect} AS "creatorStrikeCount",
              p."accountId",
              COUNT(DISTINCT d."donationId")::int AS "donorCount",
              workflow."openThreadId",
              workflow."openThreadType",
              workflow."openThreadStatus",
              workflow."openSubmissionNumber",
              workflow."lastAdminMessage"
       FROM "Campaigns" c
       LEFT JOIN "Profiles" p ON p."profileId" = c."profileId"
       LEFT JOIN "CampaignCategories" cc ON cc."campaignCategoryId" = c."categoryId"
       LEFT JOIN "Donations" d ON d."campaignId" = c."campaignId" AND d."status" <> 'FAILED'
       LEFT JOIN LATERAL (
         SELECT
           t."threadId" AS "openThreadId",
           t."type" AS "openThreadType",
           t."status" AS "openThreadStatus",
           latest_submission."submissionNumber" AS "openSubmissionNumber",
           latest_review."message" AS "lastAdminMessage"
         FROM "CampaignRevisionThreads" t
         LEFT JOIN LATERAL (
           SELECT s."submissionNumber"
           FROM "CampaignRevisionSubmissions" s
           WHERE s."threadId" = t."threadId"
           ORDER BY s."submissionNumber" DESC
           LIMIT 1
         ) latest_submission ON TRUE
         LEFT JOIN LATERAL (
           SELECT r."message"
           FROM "CampaignRevisionReviews" r
           WHERE r."threadId" = t."threadId"
           ORDER BY r."createdAt" DESC
           LIMIT 1
         ) latest_review ON TRUE
         WHERE t."campaignId" = c."campaignId"
           AND t."status" IN ('PENDING', 'CHANGES_REQUESTED')
         ORDER BY t."updatedAt" DESC, t."createdAt" DESC
         LIMIT 1
       ) workflow ON TRUE
       WHERE c."campaignId" = $1
       GROUP BY c."campaignId", cc."name", p."username", p."firstName", p."lastName"${strikeCountGroupBy}, p."accountId",
                workflow."openThreadId", workflow."openThreadType", workflow."openThreadStatus", workflow."openSubmissionNumber", workflow."lastAdminMessage"`,
      [campaignId],
    );
    if (!rows[0]) return null;
    const { accountId, openThreadId, openThreadType, openThreadStatus, openSubmissionNumber, lastAdminMessage, ...rest } = rows[0];
    const verificationMap = await this.getVerificationStatuses([accountId]);
    return {
      ...rest,
      creatorVerificationStatus: verificationMap[accountId] ?? null,
      workflow: this.toWorkflowSummary({
        openThreadId,
        openThreadType,
        openThreadStatus,
        openSubmissionNumber,
        lastAdminMessage,
      }),
    };
  }

  public async updateStatus(
    campaignId: string,
    status: CampaignStatus,
    reviewMessage?: string,
  ): Promise<CampaignStatusUpdateResult | null> {
    const clearMessage = status === "ACTIVE";
    const { rows } = await ojcPool.query<CampaignStatusUpdateResult>(
      `WITH existing AS (
         SELECT c."campaignId", c."status" AS "previousStatus", c."reviewMessage" AS "previousReviewMessage",
                p."accountId" AS "creatorAccountId"
         FROM "Campaigns" c
         LEFT JOIN "Profiles" p ON p."profileId" = c."profileId"
         WHERE c."campaignId" = $4
       )
       UPDATE "Campaigns" AS c
       SET "status" = $1,
           "reviewMessage" = CASE WHEN $3 THEN NULL ELSE COALESCE($2, c."reviewMessage") END,
           "updatedAt" = NOW()
       FROM existing
       WHERE c."campaignId" = existing."campaignId"
       RETURNING c."title", c."profileId",
                existing."creatorAccountId" AS "creatorAccountId",
                NULLIF(BTRIM(c."media_items"->0->>'url'), '') AS "thumbnailUrl",
                existing."previousStatus" AS "previousStatus",
                c."status" AS "nextStatus",
                existing."previousReviewMessage" AS "previousReviewMessage",
                c."reviewMessage" AS "nextReviewMessage"`,
      [status, reviewMessage ?? null, clearMessage, campaignId],
    );
    return rows[0] ?? null;
  }

  public async hasOpenLiveUpdateThread(campaignId: string): Promise<boolean> {
    const { rows } = await ojcPool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM "CampaignRevisionThreads"
          WHERE "campaignId" = $1
            AND "type" = 'LIVE_UPDATE'
            AND "status" IN ('PENDING', 'CHANGES_REQUESTED')
        ) AS "exists"
      `,
      [campaignId],
    );

    return rows[0]?.exists ?? false;
  }

  private toWorkflowSummary(input: {
    openThreadId: string | null;
    openThreadType: string | null;
    openThreadStatus: string | null;
    openSubmissionNumber: number | null;
    lastAdminMessage: string | null;
  }): CampaignWorkflowSummary | null {
    const approvalState = this.resolveApprovalState(input.openThreadType, input.openThreadStatus);
    if (approvalState === "none" || !input.openThreadId) return null;

    return {
      approvalState,
      openThreadId: input.openThreadId,
      openSubmissionNumber: input.openSubmissionNumber ?? null,
      lastAdminMessage: input.lastAdminMessage,
    };
  }

  private resolveApprovalState(
    type: string | null,
    status: string | null,
  ): CampaignApprovalState {
    if (type === "INITIAL_APPROVAL") {
      if (status === "PENDING") return "pending_initial_approval";
      if (status === "CHANGES_REQUESTED") return "changes_requested_initial_approval";
      return "none";
    }

    if (type === "LIVE_UPDATE") {
      if (status === "PENDING") return "pending_new_version_approval";
      if (status === "CHANGES_REQUESTED") return "changes_requested_new_version";
      return "none";
    }

    return "none";
  }

  private async getVerificationStatuses(accountIds: string[]): Promise<Record<string, VerificationStatus>> {
    if (accountIds.length === 0) return {};
    try {
      const { rows } = await sharedPool.query<{ accountId: string; status: VerificationStatus }>(
        `SELECT "accountId", "status" FROM "Verifications" WHERE "accountId" = ANY($1::uuid[])`,
        [accountIds],
      );
      return Object.fromEntries(rows.map((r) => [r.accountId, r.status]));
    } catch (error) {
      Logger.warn({ err: error, accountCount: accountIds.length }, "[OjcCampaignsRepo] Failed to load verification statuses");
      return {};
    }
  }

  public async getCreatorEmailByProfileId(profileId: string): Promise<string | null> {
    const { rows: profileRows } = await ojcPool.query<{ accountId: string }>(
      `SELECT "accountId" FROM "Profiles" WHERE "profileId" = $1`,
      [profileId],
    );
    const accountId = profileRows[0]?.accountId;
    if (!accountId) return null;

    try {
      const { rows } = await sharedPool.query<{ email: string }>(
        `SELECT "email" FROM "Account" WHERE "accountId" = $1`,
        [accountId],
      );
      return rows[0]?.email ?? null;
    } catch (error) {
      Logger.warn({ err: error, profileId }, "[OjcCampaignsRepo] Failed to load creator email");
      return null;
    }
  }
}
