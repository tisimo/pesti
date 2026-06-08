import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Service } from "typedi";
import { docClient } from "../../loaders/dynamo";
import { ojcPool } from "../../loaders/postgres";
import { sharedPool } from "../../loaders/postgresShared";
import { hasProfileStrikeCountColumn } from "./ojcSchemaSupport";
import Logger from "../../loaders/logger";

export interface OverviewSnapshot {
  totalUsers: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalRaised: number;
  completedDonations: number;
}

export interface OverviewCampaignStats {
  total: number;
  pending: number;
  active: number;
  reviewing: number;
  inactive: number;
  finished: number;
  rejected: number;
}

export interface OverviewCampaignRevisionStats {
  pending: number;
  changesRequested: number;
  approved: number;
  rejected: number;
}

export interface OverviewReportStats {
  open: number;
  inReview: number;
  resolved: number;
  dismissed: number;
}

export interface OverviewCategoryStats {
  total: number;
  active: number;
  inactive: number;
  usedByCampaigns: number;
}

export interface OverviewUserStats {
  total: number;
  creators: number;
  donors: number;
  withStrikes: number;
  atSuspensionThreshold: number;
}

export interface OverviewOrganizationStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  activeCampaigns: number;
}

export interface OverviewDonationStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  completedAmount: number;
}

export interface OverviewKycStats {
  pending: number;
  verified: number;
  declined: number;
}

export interface OverviewWithdrawalStats {
  pending: number;
  completed: number;
  failed: number;
}

export interface OverviewDepositStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  totalAmountFiat: number;
}

export interface OverviewTransactionStats {
  total: number;
  donationCount: number;
  tipCount: number;
  withdrawalCount: number;
  transferCount: number;
  totalMoved: number;
}

export interface OverviewAnalyticsStats {
  totalRaised: number;
  revenue: number;
  newUsers30d: number;
  biggestDonorName: string | null;
  biggestDonorAmount: number;
}

export interface OverviewAuditLogStats {
  total: number;
  last24Hours: number;
  moderationActions: number;
  uniqueAdmins: number;
}

export interface OverviewStats {
  snapshot: OverviewSnapshot;
  campaigns: OverviewCampaignStats;
  campaignRevisions: OverviewCampaignRevisionStats;
  reports: OverviewReportStats;
  categories: OverviewCategoryStats;
  users: OverviewUserStats;
  organizations: OverviewOrganizationStats;
  donations: OverviewDonationStats;
  kyc: OverviewKycStats;
  deposits: OverviewDepositStats;
  transactions: OverviewTransactionStats;
  withdrawals: OverviewWithdrawalStats;
  analytics: OverviewAnalyticsStats;
  auditLogs: OverviewAuditLogStats;
}

const OJC_AUDIT_ACTIONS = new Set([
  "CAMPAIGN_STATUS_CHANGED",
  "REPORT_STATUS_CHANGED",
  "REPORT_SUMMARY_UPDATED",
  "REPORT_ACTION_TAKEN",
  "REPORT_NOTE_ADDED",
  "CATEGORY_CREATED",
  "CATEGORY_UPDATED",
  "CATEGORY_DELETED",
  "OJC_USER_STATUS_CHANGED",
  "OJC_USER_STRIKES_UPDATED",
  "KYC_MISMATCH_WARNING_SENT",
  "KYC_ACCOUNT_DEACTIVATED",
  "KYC_ACCOUNT_ACTIVATED",
  "KYC_VERIFICATION_RESET",
  "WITHDRAWAL_APPROVED",
  "WITHDRAWAL_REJECTED",
  "CAMPAIGN_REVISION_APPROVED",
  "CAMPAIGN_REVISION_CHANGES_REQUESTED",
  "CAMPAIGN_REVISION_REJECTED",
  "KYB_APPROVED",
  "KYB_REJECTED",
  "ORG_ACCOUNT_ACTIVATED",
  "ORG_ACCOUNT_DEACTIVATED",
]);

const DONATION_FEE_RATE = 0.07;
const WITHDRAWAL_FEE_RATE = 0.03;

@Service()
export default class OjcOverviewRepo {
  private readonly auditLogTableName = "BO_Logs";
  private readonly maxAuditLogsScanned = 50000;

  private async safeSharedQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await query();
    } catch (error) {
      Logger.warn({ err: error }, "[OjcOverviewRepo] Shared stats query failed");
      return fallback;
    }
  }

  private async safeDynamoQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await query();
    } catch (error) {
      Logger.warn({ err: error }, "[OjcOverviewRepo] DynamoDB stats query failed");
      return fallback;
    }
  }

  private async getAuditLogStats(fallback: OverviewAuditLogStats): Promise<OverviewAuditLogStats> {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const uniqueAdmins = new Set<string>();
    let total = 0;
    let last24Hours = 0;
    let moderationActions = 0;
    let scanned = 0;
    let cursor: Record<string, unknown> | undefined;

    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: this.auditLogTableName,
          ProjectionExpression: "#action, #adminEmail, #timestamp",
          ExpressionAttributeNames: {
            "#action": "action",
            "#adminEmail": "adminEmail",
            "#timestamp": "timestamp",
          },
          ExclusiveStartKey: cursor,
        }),
      );

      for (const item of result.Items ?? []) {
        scanned += 1;
        if (scanned > this.maxAuditLogsScanned) {
          Logger.warn("[OjcOverviewRepo] Audit log stats scan limit reached");
          return { total, last24Hours, moderationActions, uniqueAdmins: uniqueAdmins.size };
        }

        const action = typeof item.action === "string" ? item.action : "";
        if (!OJC_AUDIT_ACTIONS.has(action)) continue;

        total += 1;
        if (
          action.startsWith("CAMPAIGN") ||
          action.startsWith("REPORT") ||
          action.startsWith("KYC") ||
          action.startsWith("KYB") ||
          action.startsWith("OJC_USER") ||
          action.startsWith("ORG_")
        ) {
          moderationActions += 1;
        }
        if (typeof item.adminEmail === "string" && item.adminEmail.trim()) {
          uniqueAdmins.add(item.adminEmail);
        }

        const timestamp = typeof item.timestamp === "string" ? new Date(item.timestamp).getTime() : NaN;
        if (Number.isFinite(timestamp) && timestamp >= cutoff) {
          last24Hours += 1;
        }
      }

      cursor = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (cursor);

    return { total, last24Hours, moderationActions, uniqueAdmins: uniqueAdmins.size };
  }

  private async getTransactionStats(fallback: OverviewTransactionStats): Promise<OverviewTransactionStats> {
    try {
      const { rows: failedDonationRows } = await ojcPool.query<{ transactionId: string }>(
        `SELECT "transactionId"
         FROM "Donations"
         WHERE "status" = 'FAILED'
           AND "transactionId" IS NOT NULL`,
      );
      const { rows: nonCompletedDonationRows } = await ojcPool.query<{ transactionId: string }>(
        `SELECT "transactionId"
         FROM "Donations"
         WHERE "status" IN ('PENDING', 'FAILED')
           AND "transactionId" IS NOT NULL`,
      );
      const { rows: completedDonationRows } = await ojcPool.query<{ transactionId: string; amount: string }>(
        `SELECT "transactionId", "amount"
         FROM "Donations"
         WHERE "status" = 'COMPLETED'
           AND "transactionId" IS NOT NULL`,
      );

      const params: any[] = [];
      const conditions = [`t."type" IN (0, 1)`];
      const failedTxHashes = failedDonationRows.map((row) => row.transactionId);
      if (failedTxHashes.length > 0) {
        params.push(failedTxHashes);
        conditions.push(`NOT (t."txHash" = ANY($${params.length}::text[]))`);
      }
      const where = `WHERE ${conditions.join(" AND ")}`;

      const completedDonationAmountByTx = new Map<string, number>();
      for (const row of completedDonationRows) {
        completedDonationAmountByTx.set(
          row.transactionId,
          (completedDonationAmountByTx.get(row.transactionId) ?? 0) + (parseFloat(row.amount) || 0),
        );
      }
      const nonCompletedTxHashSet = new Set(nonCompletedDonationRows.map((row) => row.transactionId));

      const [countResult, movementResult] = await Promise.all([
        sharedPool.query<OverviewTransactionStats>(
          `SELECT
             COUNT(*)::int AS "total",
             COUNT(*) FILTER (WHERE t."type" = 0)::int AS "donationCount",
             COUNT(*) FILTER (WHERE t."type" = 1)::int AS "tipCount",
             0::int AS "withdrawalCount",
             0::int AS "transferCount",
             0::float AS "totalMoved"
           FROM "Transaction" t
           ${where}`,
          params,
        ),
        sharedPool.query<{ txHash: string; type: number; amount: string; fiatAmount: string; tipAmount: string }>(
          `SELECT t."txHash", t."type", t."amount", t."fiatAmount", t."tipAmount"
           FROM "Transaction" t
           ${where}`,
          params,
        ),
      ]);

      const totalMoved = movementResult.rows.reduce((sum, row) => {
        if (row.type === 0) {
          return sum + (completedDonationAmountByTx.get(row.txHash) ?? 0);
        }
        if (row.type === 1 && !nonCompletedTxHashSet.has(row.txHash)) {
          return sum + (parseFloat(row.tipAmount) || parseFloat(row.fiatAmount) || parseFloat(row.amount) || 0);
        }
        return sum;
      }, 0);

      return {
        ...(countResult.rows[0] ?? fallback),
        totalMoved,
      };
    } catch (error) {
      Logger.warn({ err: error }, "[OjcOverviewRepo] Transaction stats query failed");
      return fallback;
    }
  }

  public async getStats(): Promise<OverviewStats> {
    const hasStrikeCount = await hasProfileStrikeCountColumn();
    const strikeStatsSelect = hasStrikeCount
      ? `COUNT(*) FILTER (WHERE COALESCE("strikeCount", 0) > 0)::int AS "withStrikes",
             COUNT(*) FILTER (WHERE COALESCE("strikeCount", 0) >= 3)::int AS "atSuspensionThreshold"`
      : `0::int AS "withStrikes",
             0::int AS "atSuspensionThreshold"`;
    const snapshotFallback: OverviewSnapshot = {
      totalUsers: 0,
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalRaised: 0,
      completedDonations: 0,
    };

    const campaignsFallback: OverviewCampaignStats = {
      total: 0,
      pending: 0,
      active: 0,
      reviewing: 0,
      inactive: 0,
      finished: 0,
      rejected: 0,
    };

    const campaignRevisionsFallback: OverviewCampaignRevisionStats = {
      pending: 0,
      changesRequested: 0,
      approved: 0,
      rejected: 0,
    };

    const reportsFallback: OverviewReportStats = {
      open: 0,
      inReview: 0,
      resolved: 0,
      dismissed: 0,
    };

    const categoriesFallback: OverviewCategoryStats = {
      total: 0,
      active: 0,
      inactive: 0,
      usedByCampaigns: 0,
    };

    const usersFallback: OverviewUserStats = {
      total: 0,
      creators: 0,
      donors: 0,
      withStrikes: 0,
      atSuspensionThreshold: 0,
    };

    const organizationsFallback: OverviewOrganizationStats = {
      total: 0,
      verified: 0,
      pending: 0,
      rejected: 0,
      activeCampaigns: 0,
    };

    const donationsFallback: OverviewDonationStats = {
      total: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      completedAmount: 0,
    };

    const kycFallback: OverviewKycStats = {
      pending: 0,
      verified: 0,
      declined: 0,
    };

    const withdrawalsFallback: OverviewWithdrawalStats = {
      pending: 0,
      completed: 0,
      failed: 0,
    };

    const depositsFallback: OverviewDepositStats = {
      total: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      totalAmountFiat: 0,
    };

    const transactionsFallback: OverviewTransactionStats = {
      total: 0,
      donationCount: 0,
      tipCount: 0,
      withdrawalCount: 0,
      transferCount: 0,
      totalMoved: 0,
    };

    const analyticsFallback: OverviewAnalyticsStats = {
      totalRaised: 0,
      revenue: 0,
      newUsers30d: 0,
      biggestDonorName: null,
      biggestDonorAmount: 0,
    };

    const auditLogsFallback: OverviewAuditLogStats = {
      total: 0,
      last24Hours: 0,
      moderationActions: 0,
      uniqueAdmins: 0,
    };

    const [
      snapshot,
      campaigns,
      campaignRevisions,
      reports,
      categories,
      users,
      organizations,
      donations,
      kyc,
      deposits,
      transactions,
      withdrawals,
      analytics,
      auditLogs,
    ] = await Promise.all([
      ojcPool
        .query<OverviewSnapshot>(
          `SELECT
             (SELECT COUNT(*)::int FROM "Profiles") AS "totalUsers",
             (SELECT COUNT(*)::int FROM "Campaigns") AS "totalCampaigns",
             (SELECT COUNT(*)::int FROM "Campaigns" WHERE "status" = 'ACTIVE') AS "activeCampaigns",
             (SELECT COALESCE(SUM("amount"), 0)::float FROM "Donations" WHERE "status" = 'COMPLETED') AS "totalRaised",
             (SELECT COUNT(*)::int FROM "Donations" WHERE "status" = 'COMPLETED') AS "completedDonations"`,
        )
        .then((result) => result.rows[0] ?? snapshotFallback),
      ojcPool
        .query<OverviewCampaignStats>(
          `SELECT
             COUNT(*)::int AS "total",
             COUNT(*) FILTER (WHERE "status" = 'PENDING')::int AS "pending",
             COUNT(*) FILTER (WHERE "status" = 'ACTIVE')::int AS "active",
             COUNT(*) FILTER (WHERE "status" = 'REVIEWING')::int AS "reviewing",
             COUNT(*) FILTER (WHERE "status" = 'INACTIVE')::int AS "inactive",
             COUNT(*) FILTER (WHERE "status" = 'FINISHED')::int AS "finished",
             COUNT(*) FILTER (WHERE "status" = 'REJECTED')::int AS "rejected"
           FROM "Campaigns"`,
        )
        .then((result) => result.rows[0] ?? campaignsFallback),
      ojcPool
        .query<OverviewCampaignRevisionStats>(
          `SELECT
             COUNT(*) FILTER (WHERE "status" = 'PENDING')::int AS "pending",
             COUNT(*) FILTER (WHERE "status" = 'CHANGES_REQUESTED')::int AS "changesRequested",
             COUNT(*) FILTER (WHERE "status" = 'APPROVED')::int AS "approved",
             COUNT(*) FILTER (WHERE "status" = 'REJECTED')::int AS "rejected"
           FROM "CampaignRevisionThreads"`,
        )
        .then((result) => result.rows[0] ?? campaignRevisionsFallback),
      ojcPool
        .query<OverviewReportStats>(
          `SELECT
             COUNT(*) FILTER (WHERE "status" = 'OPEN')::int AS "open",
             COUNT(*) FILTER (WHERE "status" = 'IN_REVIEW')::int AS "inReview",
             COUNT(*) FILTER (WHERE "status" = 'RESOLVED')::int AS "resolved",
             COUNT(*) FILTER (WHERE "status" = 'DISMISSED')::int AS "dismissed"
           FROM "CampaignReports"`,
        )
        .then((result) => result.rows[0] ?? reportsFallback),
      ojcPool
        .query<OverviewCategoryStats>(
          `SELECT
             COUNT(*)::int AS "total",
             COUNT(*) FILTER (WHERE "isActive" = true)::int AS "active",
             COUNT(*) FILTER (WHERE "isActive" = false)::int AS "inactive",
             (
               SELECT COUNT(DISTINCT "categoryId")::int
               FROM "Campaigns"
               WHERE "categoryId" IS NOT NULL
             ) AS "usedByCampaigns"
           FROM "CampaignCategories"`,
        )
        .then((result) => result.rows[0] ?? categoriesFallback),
      ojcPool
        .query<OverviewUserStats>(
          `SELECT
             COUNT(*)::int AS "total",
             COUNT(*) FILTER (WHERE "userType" = 'CREATOR')::int AS "creators",
             COUNT(*) FILTER (WHERE "userType" = 'DONOR')::int AS "donors",
             ${strikeStatsSelect}
           FROM "Profiles"`,
        )
        .then((result) => result.rows[0] ?? usersFallback),
      ojcPool
        .query<OverviewOrganizationStats>(
          `SELECT
             COUNT(DISTINCT p."profileId")::int AS "total",
             COUNT(DISTINCT p."profileId") FILTER (WHERE LOWER(COALESCE(p."verificationStatus", '')) = 'verified')::int AS "verified",
             COUNT(DISTINCT p."profileId") FILTER (WHERE LOWER(COALESCE(p."verificationStatus", '')) = 'pending')::int AS "pending",
             COUNT(DISTINCT p."profileId") FILTER (WHERE LOWER(COALESCE(p."verificationStatus", '')) IN ('rejected', 'declined'))::int AS "rejected",
             COUNT(c."campaignId") FILTER (WHERE c."status" = 'ACTIVE')::int AS "activeCampaigns"
           FROM "Profiles" p
           LEFT JOIN "Campaigns" c ON c."profileId" = p."profileId"
           WHERE p."profileType" = 'organization'`,
        )
        .then((result) => result.rows[0] ?? organizationsFallback),
      ojcPool
        .query<OverviewDonationStats>(
          `SELECT
             COUNT(*)::int AS "total",
             COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::int AS "completed",
             COUNT(*) FILTER (WHERE "status" = 'PENDING')::int AS "pending",
             COUNT(*) FILTER (WHERE "status" = 'FAILED')::int AS "failed",
             COALESCE(SUM("amount") FILTER (WHERE "status" = 'COMPLETED'), 0)::float AS "completedAmount"
           FROM "Donations"`,
        )
        .then((result) => result.rows[0] ?? donationsFallback),
      this.safeSharedQuery(
        async () => {
          const result = await sharedPool.query<OverviewKycStats>(
            `SELECT
               COUNT(*) FILTER (WHERE "status" = 'PENDING')::int AS "pending",
               COUNT(*) FILTER (WHERE "status" = 'VERIFIED')::int AS "verified",
               COUNT(*) FILTER (WHERE "status" = 'DECLINED')::int AS "declined"
             FROM "Verifications"`,
          );
          return result.rows[0] ?? kycFallback;
        },
        kycFallback,
      ),
      this.safeSharedQuery(
        async () => {
          const result = await sharedPool.query<OverviewDepositStats>(
            `SELECT
               COUNT(*)::int AS "total",
               COUNT(*) FILTER (WHERE "status" = 'PENDING')::int AS "pending",
               COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::int AS "completed",
               COUNT(*) FILTER (WHERE "status" = 'FAILED')::int AS "failed",
               COALESCE(SUM("amountFiat") FILTER (WHERE "status" = 'COMPLETED'), 0)::float AS "totalAmountFiat"
             FROM "Deposits"`,
          );
          return result.rows[0] ?? depositsFallback;
        },
        depositsFallback,
      ),
      this.getTransactionStats(transactionsFallback),
      this.safeSharedQuery(
        async () => {
          const result = await sharedPool.query<OverviewWithdrawalStats>(
            `SELECT
               COUNT(*) FILTER (WHERE "status" = 'PENDING')::int AS "pending",
               COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::int AS "completed",
               COUNT(*) FILTER (WHERE "status" = 'FAILED')::int AS "failed"
             FROM "Withdrawals"`,
          );
          return result.rows[0] ?? withdrawalsFallback;
        },
        withdrawalsFallback,
      ),
      (async (): Promise<OverviewAnalyticsStats> => {
        const [ojcResult, sharedRevenue] = await Promise.all([
          ojcPool.query<{
            totalRaised: string;
            newUsers30d: number;
            biggestDonorName: string | null;
            biggestDonorAmount: string;
          }>(`
            WITH donor_totals AS (
              SELECT
                d."profileId",
                BOOL_OR(d."isAnonymous") AS "isAnonymous",
                COALESCE(SUM(d."amount"), 0)::text AS "totalDonated"
              FROM "Donations" d
              WHERE d."status" = 'COMPLETED'
              GROUP BY d."profileId"
              ORDER BY COALESCE(SUM(d."amount"), 0) DESC
              LIMIT 1
            )
            SELECT
              (SELECT COALESCE(SUM("amount"), 0)::text FROM "Donations" WHERE "status" = 'COMPLETED') AS "totalRaised",
              (SELECT COUNT(*)::int FROM "Profiles" WHERE "createdAt" >= NOW() - INTERVAL '30 days') AS "newUsers30d",
              CASE
                WHEN dt."isAnonymous" = true THEN 'Anonymous donor'
                ELSE COALESCE(NULLIF(TRIM(COALESCE(p."firstName", '') || ' ' || COALESCE(p."lastName", '')), ''), p."username", 'Unknown donor')
              END AS "biggestDonorName",
              COALESCE(dt."totalDonated", '0') AS "biggestDonorAmount"
            FROM donor_totals dt
            LEFT JOIN "Profiles" p ON p."profileId" = dt."profileId"
          `),
          this.safeSharedQuery(
            async () => {
              const result = await sharedPool.query<{ tipRevenue: string; withdrawnAmount: string }>(
                `SELECT
                   COALESCE(SUM(
                     CASE
                       WHEN t."tipAmount" > 0 THEN t."tipAmount"
                       WHEN t."type" = 1 THEN t."fiatAmount"
                       ELSE 0
                     END
                   ), 0)::text AS "tipRevenue",
                   (SELECT COALESCE(SUM(COALESCE(NULLIF("amountFiat", 0), "amount")), 0)::text FROM "Withdrawals" WHERE "status" = 'COMPLETED') AS "withdrawnAmount"
                 FROM "Transaction" t
                 WHERE t."type" = 1 OR t."tipAmount" > 0`,
              );
              return result.rows[0] ?? { tipRevenue: "0", withdrawnAmount: "0" };
            },
            { tipRevenue: "0", withdrawnAmount: "0" },
          ),
        ]);

        const row = ojcResult.rows[0];
        const totalRaised = parseFloat(row?.totalRaised ?? "0") || 0;
        const tipRevenue = parseFloat(sharedRevenue.tipRevenue ?? "0") || 0;
        const withdrawnAmount = parseFloat(sharedRevenue.withdrawnAmount ?? "0") || 0;

        return {
          totalRaised,
          revenue: totalRaised * DONATION_FEE_RATE + tipRevenue + withdrawnAmount * WITHDRAWAL_FEE_RATE,
          newUsers30d: row?.newUsers30d ?? 0,
          biggestDonorName: row?.biggestDonorName ?? null,
          biggestDonorAmount: parseFloat(row?.biggestDonorAmount ?? "0") || 0,
        };
      })().catch((error) => {
        Logger.warn({ err: error }, "[OjcOverviewRepo] Analytics stats query failed");
        return analyticsFallback;
      }),
      this.safeDynamoQuery(
        () => this.getAuditLogStats(auditLogsFallback),
        auditLogsFallback,
      ),
    ]);

    return {
      snapshot,
      campaigns,
      campaignRevisions,
      reports,
      categories,
      users,
      organizations,
      donations,
      kyc,
      deposits,
      transactions,
      withdrawals,
      analytics,
      auditLogs,
    };
  }
}
