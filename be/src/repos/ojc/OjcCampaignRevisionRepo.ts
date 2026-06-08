import { randomUUID } from "crypto";
import { PoolClient } from "pg";
import { Service } from "typedi";
import { ojcPool } from "../../loaders/postgres";
import { sharedPool } from "../../loaders/postgresShared";
import Logger from "../../loaders/logger";

type DbThreadType = "INITIAL_APPROVAL" | "LIVE_UPDATE";
type DbThreadStatus = "PENDING" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED";
type DbReviewAction = "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
type DbLiveCampaignStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "FINISHED"
  | "PENDING"
  | "REVIEWING"
  | "REJECTED"
  | "DELETED";

export type CampaignRevisionThreadType = "initial_approval" | "live_update";
export type CampaignRevisionThreadStatus =
  | "pending"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "cancelled";
export type CampaignRevisionReviewAction = "approved" | "changes_requested" | "rejected";
export type CampaignRevisionLiveCampaignStatus =
  | "active"
  | "inactive"
  | "finished"
  | "pending"
  | "reviewing"
  | "rejected"
  | "deleted";

export interface CampaignRevisionSnapshotMediaItem {
  url: string;
  type: "image" | "video";
  processingStatus?: "ready" | "processing" | "error";
  processingJobId?: string | null;
  processingMessage?: string | null;
}

export interface CampaignRevisionSnapshotBudgetItem {
  label: string;
  amount: number | null;
}

export interface CampaignRevisionSnapshot {
  title?: string;
  story?: string;
  categoryId?: string | null;
  country?: string;
  city?: string;
  goalAmount?: number;
  durationDays?: number | null;
  mediaItems?: CampaignRevisionSnapshotMediaItem[];
  photoUrls?: string[];
  videoUrl?: string | null;
  acceptUSDC?: boolean;
  budgetItems?: CampaignRevisionSnapshotBudgetItem[];
}

export interface CampaignRevisionCampaignSummary {
  campaignId: string;
  title: string;
  creatorName: string;
  creatorUsername: string | null;
  categoryName: string | null;
  country: string;
  city: string | null;
  liveCampaignStatus: CampaignRevisionLiveCampaignStatus;
  amountRaised: number;
  goalAmount: number;
  thumbnailUrl: string | null;
  reviewMessage: string | null;
}

export interface CampaignRevisionSubmission {
  submissionId: string;
  threadId: string;
  submissionNumber: number;
  submittedByAccountId: string;
  beforeSnapshot: CampaignRevisionSnapshot | null;
  afterSnapshot: CampaignRevisionSnapshot;
  createdAt: string;
}

export interface CampaignRevisionReview {
  reviewId: string;
  submissionId: string;
  action: CampaignRevisionReviewAction;
  message: string;
  reviewedByAccountId: string;
  reviewedByEmail?: string | null;
  createdAt: string;
}

export interface CampaignRevisionThreadSummary {
  threadId: string;
  campaignId: string;
  type: CampaignRevisionThreadType;
  status: CampaignRevisionThreadStatus;
  liveCampaignStatus: CampaignRevisionLiveCampaignStatus;
  latestSubmissionId: string;
  latestSubmissionNumber: number;
  latestSubmittedAt: string;
  lastAdminMessage: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  campaign: CampaignRevisionCampaignSummary;
}

export interface CampaignRevisionThreadDetail {
  threadId: string;
  campaignId: string;
  type: CampaignRevisionThreadType;
  status: CampaignRevisionThreadStatus;
  liveCampaignStatus: CampaignRevisionLiveCampaignStatus;
  latestSubmissionId: string;
  latestSubmissionNumber: number;
  latestSubmittedAt: string;
  lastAdminMessage: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  campaign: CampaignRevisionCampaignSummary;
  submissions: CampaignRevisionSubmission[];
  reviews: CampaignRevisionReview[];
}

export interface CampaignRevisionThreadPage {
  items: CampaignRevisionThreadSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CampaignRevisionListFilters {
  status?: CampaignRevisionThreadStatus;
  type?: CampaignRevisionThreadType;
  campaignId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export interface CampaignRevisionModerationContext {
  threadId: string;
  campaignId: string;
  type: DbThreadType;
  status: DbThreadStatus;
  liveCampaignStatus: DbLiveCampaignStatus;
  latestSubmissionId: string;
  latestSubmissionNumber: number;
  latestAfterSnapshot: CampaignRevisionSnapshot;
  previousReviewMessage: string | null;
  campaignTitle: string;
  creatorProfileId: string | null;
  creatorEmail: string | null;
  thumbnailUrl: string | null;
}

interface ListRow {
  threadId: string;
  campaignId: string;
  type: DbThreadType;
  status: DbThreadStatus;
  liveCampaignStatus: DbLiveCampaignStatus;
  latestSubmissionId: string;
  latestSubmissionNumber: number;
  latestSubmittedAt: string;
  lastAdminMessage: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  campaignTitle: string;
  creatorFirstName: string | null;
  creatorLastName: string | null;
  creatorUsername: string | null;
  categoryName: string | null;
  country: string;
  city: string | null;
  amountRaised: number;
  goalAmount: number;
  thumbnailUrl: string | null;
  reviewMessage: string | null;
  totalCount: number;
}

interface DetailHeaderRow {
  threadId: string;
  campaignId: string;
  type: DbThreadType;
  status: DbThreadStatus;
  liveCampaignStatus: DbLiveCampaignStatus;
  latestSubmissionId: string;
  latestSubmissionNumber: number;
  latestSubmittedAt: string;
  lastAdminMessage: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  campaignTitle: string;
  creatorFirstName: string | null;
  creatorLastName: string | null;
  creatorUsername: string | null;
  categoryName: string | null;
  country: string;
  city: string | null;
  amountRaised: number;
  goalAmount: number;
  thumbnailUrl: string | null;
  reviewMessage: string | null;
}

interface SubmissionRow {
  submissionId: string;
  threadId: string;
  submissionNumber: number;
  submittedByAccountId: string;
  beforeSnapshot: unknown;
  afterSnapshot: unknown;
  createdAt: string;
}

interface ReviewRow {
  reviewId: string;
  submissionId: string;
  action: DbReviewAction;
  message: string;
  reviewedByAccountId: string;
  createdAt: string;
}

@Service()
export default class OjcCampaignRevisionRepo {
  public async listThreads(filters: CampaignRevisionListFilters): Promise<CampaignRevisionThreadPage> {
    const values: unknown[] = [];
    const conditions: string[] = [];

    if (filters.status) {
      values.push(this.toDbStatus(filters.status));
      conditions.push(`t."status" = $${values.length}`);
    }

    if (filters.type) {
      values.push(this.toDbType(filters.type));
      conditions.push(`t."type" = $${values.length}`);
    }

    if (filters.campaignId) {
      values.push(filters.campaignId);
      conditions.push(`t."campaignId" = $${values.length}`);
    }

    if (filters.search?.trim()) {
      values.push(`%${filters.search.trim()}%`);
      const placeholder = `$${values.length}`;
      conditions.push(
        `(c."title" ILIKE ${placeholder} OR p."username" ILIKE ${placeholder} OR CONCAT_WS(' ', p."firstName", p."lastName") ILIKE ${placeholder})`,
      );
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limitPlaceholder = `$${values.length + 1}`;
    const offsetPlaceholder = `$${values.length + 2}`;

    const query = `
      WITH latest_submission AS (
        SELECT DISTINCT ON (s."threadId")
          s."threadId",
          s."submissionId",
          s."submissionNumber",
          s."createdAt"
        FROM "CampaignRevisionSubmissions" s
        ORDER BY s."threadId", s."submissionNumber" DESC, s."createdAt" DESC
      ),
      latest_review AS (
        SELECT DISTINCT ON (r."threadId")
          r."threadId",
          r."message"
        FROM "CampaignRevisionReviews" r
        ORDER BY r."threadId", r."createdAt" DESC
      )
      SELECT
        t."threadId" AS "threadId",
        t."campaignId" AS "campaignId",
        t."type" AS "type",
        t."status" AS "status",
        c."status" AS "liveCampaignStatus",
        ls."submissionId" AS "latestSubmissionId",
        ls."submissionNumber" AS "latestSubmissionNumber",
        ls."createdAt" AS "latestSubmittedAt",
        lr."message" AS "lastAdminMessage",
        t."createdAt" AS "createdAt",
        t."updatedAt" AS "updatedAt",
        t."closedAt" AS "closedAt",
        c."title" AS "campaignTitle",
        p."firstName" AS "creatorFirstName",
        p."lastName" AS "creatorLastName",
        p."username" AS "creatorUsername",
        cat."name" AS "categoryName",
        c."country" AS "country",
        c."city" AS "city",
        c."amountRaised"::float AS "amountRaised",
        c."goalAmount"::float AS "goalAmount",
        NULLIF(BTRIM(c."media_items"->0->>'url'), '') AS "thumbnailUrl",
        c."reviewMessage" AS "reviewMessage",
        COUNT(*) OVER()::int AS "totalCount"
      FROM "CampaignRevisionThreads" t
      JOIN latest_submission ls ON ls."threadId" = t."threadId"
      LEFT JOIN latest_review lr ON lr."threadId" = t."threadId"
      JOIN "Campaigns" c ON c."campaignId" = t."campaignId"
      LEFT JOIN "Profiles" p ON p."profileId" = c."profileId"
      LEFT JOIN "CampaignCategories" cat ON cat."campaignCategoryId" = c."categoryId"
      ${whereClause}
      ORDER BY t."updatedAt" DESC, t."createdAt" DESC
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `;

    const { rows } = await ojcPool.query<ListRow>(query, [
      ...values,
      filters.pageSize,
      (filters.page - 1) * filters.pageSize,
    ]);

    return {
      items: rows.map((row) => this.toThreadSummary(row)),
      total: rows[0]?.totalCount ?? 0,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  public async getThreadDetail(threadId: string): Promise<CampaignRevisionThreadDetail | null> {
    const header = await this.getThreadHeader(threadId);
    if (!header) return null;

    const [submissionsResult, reviewsResult] = await Promise.all([
      ojcPool.query<SubmissionRow>(
        `
          SELECT
            "submissionId" AS "submissionId",
            "threadId" AS "threadId",
            "submissionNumber" AS "submissionNumber",
            "submittedByAccountId" AS "submittedByAccountId",
            "beforeSnapshot" AS "beforeSnapshot",
            "afterSnapshot" AS "afterSnapshot",
            "createdAt" AS "createdAt"
          FROM "CampaignRevisionSubmissions"
          WHERE "threadId" = $1
          ORDER BY "submissionNumber" DESC, "createdAt" DESC
        `,
        [threadId],
      ),
      ojcPool.query<ReviewRow>(
        `
          SELECT
            "reviewId" AS "reviewId",
            "submissionId" AS "submissionId",
            "action" AS "action",
            "message" AS "message",
            "reviewedByAccountId" AS "reviewedByAccountId",
            "createdAt" AS "createdAt"
          FROM "CampaignRevisionReviews"
          WHERE "threadId" = $1
          ORDER BY "createdAt" DESC
        `,
        [threadId],
      ),
    ]);

    return {
      ...this.toThreadDetailBase(header),
      submissions: submissionsResult.rows.map((row) => ({
        submissionId: row.submissionId,
        threadId: row.threadId,
        submissionNumber: row.submissionNumber,
        submittedByAccountId: row.submittedByAccountId,
        beforeSnapshot: this.toSnapshot(row.beforeSnapshot),
        afterSnapshot: this.toSnapshot(row.afterSnapshot) ?? {},
        createdAt: row.createdAt,
      })),
      reviews: reviewsResult.rows.map((row) => ({
        reviewId: row.reviewId,
        submissionId: row.submissionId,
        action: this.fromDbReviewAction(row.action),
        message: row.message,
        reviewedByAccountId: row.reviewedByAccountId,
        createdAt: row.createdAt,
      })),
    };
  }

  public async getModerationContext(threadId: string): Promise<CampaignRevisionModerationContext | null> {
    const { rows } = await ojcPool.query<{
      threadId: string;
      campaignId: string;
      type: DbThreadType;
      status: DbThreadStatus;
      liveCampaignStatus: DbLiveCampaignStatus;
      latestSubmissionId: string;
      latestSubmissionNumber: number;
      latestAfterSnapshot: unknown;
      previousReviewMessage: string | null;
      campaignTitle: string;
      creatorProfileId: string | null;
      creatorAccountId: string | null;
      thumbnailUrl: string | null;
    }>(
      `
        WITH latest_submission AS (
          SELECT DISTINCT ON (s."threadId")
            s."threadId",
            s."submissionId",
            s."submissionNumber",
            s."afterSnapshot"
          FROM "CampaignRevisionSubmissions" s
          WHERE s."threadId" = $1
          ORDER BY s."threadId", s."submissionNumber" DESC, s."createdAt" DESC
        )
        SELECT
          t."threadId" AS "threadId",
          t."campaignId" AS "campaignId",
          t."type" AS "type",
          t."status" AS "status",
          c."status" AS "liveCampaignStatus",
          ls."submissionId" AS "latestSubmissionId",
          ls."submissionNumber" AS "latestSubmissionNumber",
          ls."afterSnapshot" AS "latestAfterSnapshot",
          c."reviewMessage" AS "previousReviewMessage",
          c."title" AS "campaignTitle",
          c."profileId" AS "creatorProfileId",
          p."accountId" AS "creatorAccountId",
          NULLIF(BTRIM(c."media_items"->0->>'url'), '') AS "thumbnailUrl"
        FROM "CampaignRevisionThreads" t
        JOIN latest_submission ls ON ls."threadId" = t."threadId"
        JOIN "Campaigns" c ON c."campaignId" = t."campaignId"
        LEFT JOIN "Profiles" p ON p."profileId" = c."profileId"
        WHERE t."threadId" = $1
      `,
      [threadId],
    );

    if (!rows[0]) return null;

    let creatorEmail: string | null = null;
    if (rows[0].creatorAccountId) {
      try {
        const { rows: accountRows } = await sharedPool.query<{ email: string }>(
          `SELECT "email" FROM "Account" WHERE "accountId" = $1`,
          [rows[0].creatorAccountId],
        );
        creatorEmail = accountRows[0]?.email ?? null;
      } catch (error) {
        Logger.warn({ err: error, accountId: rows[0].creatorAccountId }, "[OjcCampaignRevisionRepo] Failed to load creator email");
        creatorEmail = null;
      }
    }

    return {
      threadId: rows[0].threadId,
      campaignId: rows[0].campaignId,
      type: rows[0].type,
      status: rows[0].status,
      liveCampaignStatus: rows[0].liveCampaignStatus,
      latestSubmissionId: rows[0].latestSubmissionId,
      latestSubmissionNumber: rows[0].latestSubmissionNumber,
      latestAfterSnapshot: this.toSnapshot(rows[0].latestAfterSnapshot) ?? {},
      previousReviewMessage: rows[0].previousReviewMessage,
      campaignTitle: rows[0].campaignTitle,
      creatorProfileId: rows[0].creatorProfileId,
      creatorEmail,
      thumbnailUrl: rows[0].thumbnailUrl,
    };
  }

  public async createFromReportAction(params: {
    campaignId: string;
    adminAccountId: string;
    creatorAccountId: string;
    message: string;
  }): Promise<void> {
    const { rows: campaignRows } = await ojcPool.query<{
      title: string;
      story: string;
      categoryId: string | null;
      country: string;
      city: string | null;
      goalAmount: string;
      durationDays: number | null;
      mediaItems: unknown;
    }>(
      `
        SELECT
          "title",
          "description" AS "story",
          "categoryId",
          "country",
          "city",
          "goalAmount",
          "durationDays",
          "media_items" AS "mediaItems"
        FROM "Campaigns"
        WHERE "campaignId" = $1
      `,
      [params.campaignId],
    );

    if (campaignRows.length === 0) return;

    const row = campaignRows[0];
    const snapshot: CampaignRevisionSnapshot = {
      title: row.title,
      story: row.story,
      categoryId: row.categoryId,
      country: row.country,
      city: row.city ?? "",
      goalAmount: Number(row.goalAmount),
      durationDays: row.durationDays,
      mediaItems: Array.isArray(row.mediaItems) ? (row.mediaItems as CampaignRevisionSnapshotMediaItem[]) : [],
    };

    const threadId = randomUUID();
    const submissionId = randomUUID();
    const client = await ojcPool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
          INSERT INTO "CampaignRevisionThreads" (
            "threadId", "campaignId", "type", "status", "openedByAccountId"
          )
          VALUES ($1, $2, 'LIVE_UPDATE', 'CHANGES_REQUESTED', $3)
        `,
        [threadId, params.campaignId, params.adminAccountId],
      );

      await client.query(
        `
          INSERT INTO "CampaignRevisionSubmissions" (
            "submissionId", "threadId", "submissionNumber",
            "submittedByAccountId", "beforeSnapshot", "afterSnapshot"
          )
          VALUES ($1, $2, 1, $3, NULL, $4::jsonb)
        `,
        [submissionId, threadId, params.creatorAccountId, JSON.stringify(snapshot)],
      );

      await this.insertReview(client, {
        threadId,
        submissionId,
        action: "CHANGES_REQUESTED",
        message: params.message,
        reviewedByAccountId: params.adminAccountId,
      });

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async applyModerationAction(params: {
    context: CampaignRevisionModerationContext;
    action: CampaignRevisionReviewAction;
    message?: string;
    reviewedByAccountId: string;
  }): Promise<void> {
    const client = await ojcPool.connect();

    try {
      await client.query("BEGIN");

      await this.insertReview(client, {
        threadId: params.context.threadId,
        submissionId: params.context.latestSubmissionId,
        action: this.toDbReviewAction(params.action),
        message: params.message?.trim() ?? "",
        reviewedByAccountId: params.reviewedByAccountId,
      });

      if (params.action === "approved") {
        await this.handleApprove(client, params.context);
      } else if (params.action === "changes_requested") {
        await this.handleRequestChanges(client, params.context, params.message?.trim() ?? "");
      } else {
        await this.handleReject(client, params.context, params.message?.trim() ?? "");
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async handleApprove(client: PoolClient, context: CampaignRevisionModerationContext): Promise<void> {
    if (context.type === "INITIAL_APPROVAL") {
      await this.applySnapshotToLiveCampaign(client, context.campaignId, context.latestAfterSnapshot, {
        nextStatus: "ACTIVE",
        nextReviewMessage: null,
      });
    } else if (context.liveCampaignStatus === "REVIEWING") {
      // Campaign was put into REVIEWING by an admin change request — restore to ACTIVE on approval
      await this.applySnapshotToLiveCampaign(client, context.campaignId, context.latestAfterSnapshot, {
        nextStatus: "ACTIVE",
        nextReviewMessage: null,
      });
    } else {
      await this.applySnapshotToLiveCampaign(client, context.campaignId, context.latestAfterSnapshot);
    }

    await client.query(
      `
        UPDATE "CampaignRevisionThreads"
        SET "status" = 'APPROVED',
            "closedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "threadId" = $1
      `,
      [context.threadId],
    );
  }

  private async handleRequestChanges(
    client: PoolClient,
    context: CampaignRevisionModerationContext,
    message: string,
  ): Promise<void> {
    if (context.type === "INITIAL_APPROVAL") {
      await client.query(
        `
          UPDATE "Campaigns"
          SET "status" = 'PENDING',
              "reviewMessage" = $2,
              "updatedAt" = NOW()
          WHERE "campaignId" = $1
        `,
        [context.campaignId, message],
      );
    }

    await client.query(
      `
        UPDATE "CampaignRevisionThreads"
        SET "status" = 'CHANGES_REQUESTED',
            "closedAt" = NULL,
            "updatedAt" = NOW()
        WHERE "threadId" = $1
      `,
      [context.threadId],
    );
  }

  private async handleReject(client: PoolClient, context: CampaignRevisionModerationContext, message: string): Promise<void> {
    if (context.type === "INITIAL_APPROVAL") {
      await client.query(
        `
          UPDATE "Campaigns"
          SET "status" = 'REJECTED',
              "reviewMessage" = $2,
              "updatedAt" = NOW()
          WHERE "campaignId" = $1
        `,
        [context.campaignId, message],
      );
    }

    await client.query(
      `
        UPDATE "CampaignRevisionThreads"
        SET "status" = 'REJECTED',
            "closedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "threadId" = $1
      `,
      [context.threadId],
    );
  }

  private async insertReview(
    client: PoolClient,
    params: {
      threadId: string;
      submissionId: string;
      action: DbReviewAction;
      message: string;
      reviewedByAccountId: string;
    },
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO "CampaignRevisionReviews" (
          "reviewId",
          "threadId",
          "submissionId",
          "action",
          "message",
          "reviewedByAccountId",
          "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `,
      [
        randomUUID(),
        params.threadId,
        params.submissionId,
        params.action,
        params.message,
        params.reviewedByAccountId,
      ],
    );
  }

  private async applySnapshotToLiveCampaign(
    client: PoolClient,
    campaignId: string,
    snapshot: CampaignRevisionSnapshot,
    options?: {
      nextStatus?: DbLiveCampaignStatus;
      nextReviewMessage?: string | null;
    },
  ): Promise<void> {
    const normalized = this.normalizeSnapshot(snapshot);
    const assignments = [
      `"title" = $2`,
      `"description" = $3`,
      `"categoryId" = $4`,
      `"country" = $5`,
      `"city" = $6`,
      `"goalAmount" = $7`,
      `"durationDays" = $8`,
      `"media_items" = $9::jsonb`,
    ];
    const values: unknown[] = [
      campaignId,
      normalized.title,
      normalized.story,
      normalized.categoryId,
      normalized.country,
      normalized.city,
      normalized.goalAmount,
      normalized.durationDays,
      JSON.stringify(normalized.mediaItems),
    ];

    if (options?.nextStatus) {
      assignments.push(`"status" = $${values.length + 1}`);
      values.push(options.nextStatus);
    }

    if (typeof options?.nextReviewMessage !== "undefined") {
      assignments.push(`"reviewMessage" = $${values.length + 1}`);
      values.push(options.nextReviewMessage);
    }

    assignments.push(`"updatedAt" = NOW()`);

    await client.query(
      `
        UPDATE "Campaigns"
        SET ${assignments.join(", ")}
        WHERE "campaignId" = $1
      `,
      values,
    );

    await this.replaceBudgetItems(client, campaignId, normalized.budgetItems);
  }

  private normalizeSnapshot(snapshot: CampaignRevisionSnapshot): Required<Omit<CampaignRevisionSnapshot, "acceptUSDC">> & {
    acceptUSDC: boolean;
  } {
    const title = typeof snapshot.title === "string" ? snapshot.title.trim() : "";
    const story = typeof snapshot.story === "string" ? snapshot.story : "";
    const categoryId =
      typeof snapshot.categoryId === "string" && snapshot.categoryId.trim().length > 0
        ? snapshot.categoryId.trim()
        : null;
    const country = typeof snapshot.country === "string" ? snapshot.country.trim() : "";
    const city = typeof snapshot.city === "string" ? snapshot.city.trim() : "";
    const goalAmount = Number.isFinite(snapshot.goalAmount) ? Number(snapshot.goalAmount) : 0;
    const durationDays =
      typeof snapshot.durationDays === "number" && Number.isFinite(snapshot.durationDays)
        ? snapshot.durationDays
        : null;

    return {
      title,
      story,
      categoryId,
      country,
      city,
      goalAmount,
      durationDays,
      mediaItems: this.normalizeMediaItems(snapshot),
      photoUrls: this.normalizePhotoUrls(snapshot.photoUrls),
      videoUrl:
        typeof snapshot.videoUrl === "string" && snapshot.videoUrl.trim().length > 0
          ? snapshot.videoUrl.trim()
          : null,
      acceptUSDC: snapshot.acceptUSDC !== false,
      budgetItems: this.normalizeBudgetItems(snapshot.budgetItems),
    };
  }

  private normalizeMediaItems(snapshot: CampaignRevisionSnapshot): CampaignRevisionSnapshotMediaItem[] {
    const fromMediaItems = Array.isArray(snapshot.mediaItems)
      ? snapshot.mediaItems
          .map((item): CampaignRevisionSnapshotMediaItem | null => {
            const url = typeof item?.url === "string" ? item.url.trim() : "";
            if (!url) return null;

            const type = item?.type === "video" ? "video" : "image";
            const processingStatus =
              item?.processingStatus === "ready" ||
              item?.processingStatus === "processing" ||
              item?.processingStatus === "error"
                ? item.processingStatus
                : undefined;

            return {
              url,
              type,
              processingStatus,
              processingJobId:
                typeof item?.processingJobId === "string" && item.processingJobId.trim().length > 0
                  ? item.processingJobId.trim()
                  : null,
              processingMessage:
                typeof item?.processingMessage === "string" && item.processingMessage.trim().length > 0
                  ? item.processingMessage.trim()
                  : null,
            };
          })
          .filter((item): item is CampaignRevisionSnapshotMediaItem => item !== null)
      : [];

    const fallbackPhotos = this.normalizePhotoUrls(snapshot.photoUrls);
    const fallbackVideo =
      typeof snapshot.videoUrl === "string" && snapshot.videoUrl.trim().length > 0
        ? snapshot.videoUrl.trim()
        : null;

    const items = fromMediaItems.length
      ? [...fromMediaItems]
      : [
          ...(fallbackVideo ? [{ url: fallbackVideo, type: "video" as const }] : []),
          ...fallbackPhotos.map((url) => ({ url, type: "image" as const })),
        ];

    const firstImageIndex = items.findIndex((item) => item.type === "image");
    if (firstImageIndex > 0) {
      const [coverImage] = items.splice(firstImageIndex, 1);
      items.unshift(coverImage);
    }

    return items;
  }

  private normalizePhotoUrls(photoUrls: unknown): string[] {
    if (!Array.isArray(photoUrls)) return [];

    return photoUrls
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0);
  }

  private normalizeBudgetItems(items: unknown): CampaignRevisionSnapshotBudgetItem[] {
    if (!Array.isArray(items)) return [];

    return items
      .map((item): CampaignRevisionSnapshotBudgetItem | null => {
        const label = typeof item?.label === "string" ? item.label.trim() : "";
        if (!label) return null;

        const amount =
          typeof item?.amount === "number" && Number.isFinite(item.amount)
            ? Math.max(item.amount, 0)
            : 0;

        return { label, amount };
      })
      .filter((item): item is CampaignRevisionSnapshotBudgetItem => item !== null);
  }

  private async replaceBudgetItems(
    client: PoolClient,
    campaignId: string,
    items: CampaignRevisionSnapshotBudgetItem[],
  ): Promise<void> {
    await client.query(`DELETE FROM "CampaignBudgetItems" WHERE "campaignId" = $1`, [campaignId]);

    if (items.length === 0) return;

    const values: Array<string | number> = [];
    const rows = items.map((item, index) => {
      const baseIndex = index * 4;
      values.push(randomUUID(), campaignId, item.label, item.amount ?? 0);
      return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
    });

    await client.query(
      `
        INSERT INTO "CampaignBudgetItems" ("budgetItemId", "campaignId", "label", "amount")
        VALUES ${rows.join(", ")}
      `,
      values,
    );
  }

  private async getThreadHeader(threadId: string): Promise<DetailHeaderRow | null> {
    const { rows } = await ojcPool.query<DetailHeaderRow>(
      `
        WITH latest_submission AS (
          SELECT DISTINCT ON (s."threadId")
            s."threadId",
            s."submissionId",
            s."submissionNumber",
            s."createdAt"
          FROM "CampaignRevisionSubmissions" s
          WHERE s."threadId" = $1
          ORDER BY s."threadId", s."submissionNumber" DESC, s."createdAt" DESC
        ),
        latest_review AS (
          SELECT DISTINCT ON (r."threadId")
            r."threadId",
            r."message"
          FROM "CampaignRevisionReviews" r
          WHERE r."threadId" = $1
          ORDER BY r."threadId", r."createdAt" DESC
        )
        SELECT
          t."threadId" AS "threadId",
          t."campaignId" AS "campaignId",
          t."type" AS "type",
          t."status" AS "status",
          c."status" AS "liveCampaignStatus",
          ls."submissionId" AS "latestSubmissionId",
          ls."submissionNumber" AS "latestSubmissionNumber",
          ls."createdAt" AS "latestSubmittedAt",
          lr."message" AS "lastAdminMessage",
          t."createdAt" AS "createdAt",
          t."updatedAt" AS "updatedAt",
          t."closedAt" AS "closedAt",
          c."title" AS "campaignTitle",
          p."firstName" AS "creatorFirstName",
          p."lastName" AS "creatorLastName",
          p."username" AS "creatorUsername",
          cat."name" AS "categoryName",
          c."country" AS "country",
          c."city" AS "city",
          c."amountRaised"::float AS "amountRaised",
          c."goalAmount"::float AS "goalAmount",
          NULLIF(BTRIM(c."media_items"->0->>'url'), '') AS "thumbnailUrl",
          c."reviewMessage" AS "reviewMessage"
        FROM "CampaignRevisionThreads" t
        JOIN latest_submission ls ON ls."threadId" = t."threadId"
        LEFT JOIN latest_review lr ON lr."threadId" = t."threadId"
        JOIN "Campaigns" c ON c."campaignId" = t."campaignId"
        LEFT JOIN "Profiles" p ON p."profileId" = c."profileId"
        LEFT JOIN "CampaignCategories" cat ON cat."campaignCategoryId" = c."categoryId"
        WHERE t."threadId" = $1
      `,
      [threadId],
    );

    return rows[0] ?? null;
  }

  private toThreadSummary(row: ListRow): CampaignRevisionThreadSummary {
    return {
      threadId: row.threadId,
      campaignId: row.campaignId,
      type: this.fromDbType(row.type),
      status: this.fromDbStatus(row.status),
      liveCampaignStatus: this.fromDbLiveCampaignStatus(row.liveCampaignStatus),
      latestSubmissionId: row.latestSubmissionId,
      latestSubmissionNumber: row.latestSubmissionNumber,
      latestSubmittedAt: row.latestSubmittedAt,
      lastAdminMessage: row.lastAdminMessage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      closedAt: row.closedAt,
      campaign: this.toCampaignSummary(row),
    };
  }

  private toThreadDetailBase(row: DetailHeaderRow): Omit<CampaignRevisionThreadDetail, "submissions" | "reviews"> {
    return {
      threadId: row.threadId,
      campaignId: row.campaignId,
      type: this.fromDbType(row.type),
      status: this.fromDbStatus(row.status),
      liveCampaignStatus: this.fromDbLiveCampaignStatus(row.liveCampaignStatus),
      latestSubmissionId: row.latestSubmissionId,
      latestSubmissionNumber: row.latestSubmissionNumber,
      latestSubmittedAt: row.latestSubmittedAt,
      lastAdminMessage: row.lastAdminMessage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      closedAt: row.closedAt,
      campaign: this.toCampaignSummary(row),
    };
  }

  private toCampaignSummary(
    row: Pick<
      DetailHeaderRow,
      | "campaignId"
      | "campaignTitle"
      | "creatorFirstName"
      | "creatorLastName"
      | "creatorUsername"
      | "categoryName"
      | "country"
      | "city"
      | "liveCampaignStatus"
      | "amountRaised"
      | "goalAmount"
      | "thumbnailUrl"
      | "reviewMessage"
    >,
  ): CampaignRevisionCampaignSummary {
    const fullName = `${row.creatorFirstName ?? ""} ${row.creatorLastName ?? ""}`.trim();
    const creatorUsername =
      row.creatorUsername && row.creatorUsername.trim().length > 0
        ? `@${row.creatorUsername.trim().replace(/^@/, "")}`
        : null;

    return {
      campaignId: row.campaignId,
      title: row.campaignTitle,
      creatorName: fullName || creatorUsername || "Creator",
      creatorUsername,
      categoryName: row.categoryName,
      country: row.country,
      city: row.city,
      liveCampaignStatus: this.fromDbLiveCampaignStatus(row.liveCampaignStatus),
      amountRaised: row.amountRaised,
      goalAmount: row.goalAmount,
      thumbnailUrl: row.thumbnailUrl,
      reviewMessage: row.reviewMessage,
    };
  }

  private toSnapshot(value: unknown): CampaignRevisionSnapshot | null {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        return JSON.parse(value) as CampaignRevisionSnapshot;
      } catch (error) {
        Logger.warn({ err: error }, "[OjcCampaignRevisionRepo] Failed to parse campaign revision snapshot");
        return null;
      }
    }
    if (typeof value === "object") {
      return value as CampaignRevisionSnapshot;
    }
    return null;
  }

  private fromDbType(value: DbThreadType): CampaignRevisionThreadType {
    return value === "LIVE_UPDATE" ? "live_update" : "initial_approval";
  }

  private toDbType(value: CampaignRevisionThreadType): DbThreadType {
    return value === "live_update" ? "LIVE_UPDATE" : "INITIAL_APPROVAL";
  }

  private fromDbStatus(value: DbThreadStatus): CampaignRevisionThreadStatus {
    switch (value) {
      case "CHANGES_REQUESTED":
        return "changes_requested";
      case "APPROVED":
        return "approved";
      case "REJECTED":
        return "rejected";
      case "CANCELLED":
        return "cancelled";
      default:
        return "pending";
    }
  }

  private toDbStatus(value: CampaignRevisionThreadStatus): DbThreadStatus {
    switch (value) {
      case "changes_requested":
        return "CHANGES_REQUESTED";
      case "approved":
        return "APPROVED";
      case "rejected":
        return "REJECTED";
      case "cancelled":
        return "CANCELLED";
      default:
        return "PENDING";
    }
  }

  private fromDbReviewAction(value: DbReviewAction): CampaignRevisionReviewAction {
    if (value === "CHANGES_REQUESTED") return "changes_requested";
    if (value === "REJECTED") return "rejected";
    return "approved";
  }

  private toDbReviewAction(value: CampaignRevisionReviewAction): DbReviewAction {
    if (value === "changes_requested") return "CHANGES_REQUESTED";
    if (value === "rejected") return "REJECTED";
    return "APPROVED";
  }

  private fromDbLiveCampaignStatus(value: DbLiveCampaignStatus): CampaignRevisionLiveCampaignStatus {
    switch (value) {
      case "INACTIVE":
        return "inactive";
      case "FINISHED":
        return "finished";
      case "PENDING":
        return "pending";
      case "REVIEWING":
        return "reviewing";
      case "REJECTED":
        return "rejected";
      case "DELETED":
        return "deleted";
      default:
        return "active";
    }
  }
}


