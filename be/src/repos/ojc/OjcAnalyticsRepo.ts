import { Service } from "typedi";
import { ojcPool } from "../../loaders/postgres";
import { sharedPool } from "../../loaders/postgresShared";
import Logger from "../../loaders/logger";

export interface DataPoint {
  key: string;
  count: number;
  total?: number;
}

export interface TopCampaign {
  campaignId: string;
  title: string;
  category: string;
  amountRaised: number;
  goalAmount: number;
  donorCount: number;
}

export interface TopDonor {
  profileId: string | null;
  donorName: string;
  username: string | null;
  donationCount: number;
  totalDonated: number;
}

export interface TopCreator {
  profileId: string;
  creatorName: string;
  username: string | null;
  campaignCount: number;
  totalRaised: number;
}

export interface CategoryStat {
  category: string;
  campaignCount: number;
  totalRaised: number;
  activeCampaigns: number;
}

export interface DonationStatusStat {
  status: string;
  count: number;
  total: number;
}

export interface AnalyticsSummary {
  totalUsers: number;
  totalCampaigns: number;
  totalRaised: number;
  activeCampaigns: number;
  pendingApprovals: number;
  newUsers30d: number;
  donationFeeRevenue: number;
  tipRevenue: number;
  withdrawalFeeRevenue: number;
  platformRevenue: number;
}

export interface AnalyticsCustomRange {
  startDate: string;
  endDate: string;
}

export interface AnalyticsData {
  bucketTrunc: PeriodCfg["trunc"];
  summary: AnalyticsSummary;
  donationsByPeriod: DataPoint[];
  tipRevenueByPeriod: DataPoint[];
  withdrawalFeesByPeriod: DataPoint[];
  usersByPeriod: DataPoint[];
  campaignsByPeriod: DataPoint[];
  topCampaigns: TopCampaign[];
  topDonors: TopDonor[];
  topCreators: TopCreator[];
  donationsByStatus: DonationStatusStat[];
  categoryBreakdown: CategoryStat[];
}

type PeriodCfg = {
  interval: string | null;
  trunc: "hour" | "day" | "week" | "month" | "quarter" | "year";
  format: string;
  customRange?: AnalyticsCustomRange;
};

const PERIOD_CONFIG = {
  "1d": { interval: "1 day", trunc: "hour", format: "YYYY-MM-DD HH24" },
  "1w": { interval: "7 days", trunc: "day", format: "YYYY-MM-DD" },
  "2w": { interval: "14 days", trunc: "day", format: "YYYY-MM-DD" },
  "1m": { interval: "1 month", trunc: "day", format: "YYYY-MM-DD" },
  "3m": { interval: "3 months", trunc: "week", format: "YYYY-MM-DD" },
  "6m": { interval: "6 months", trunc: "week", format: "YYYY-MM-DD" },
  "1y": { interval: "1 year", trunc: "month", format: "YYYY-MM" },
  all: { interval: null, trunc: "month", format: "YYYY-MM" },
  custom: { interval: null, trunc: "day", format: "YYYY-MM-DD" },
} satisfies Record<string, PeriodCfg>;

export type AnalyticsPeriod = keyof typeof PERIOD_CONFIG;

export function resolvePeriod(raw: string): AnalyticsPeriod {
  return (raw in PERIOD_CONFIG ? raw : "1y") as AnalyticsPeriod;
}

const MAX_CHART_POINTS = 36;
const PERIOD_BUCKET_CANDIDATES: Record<AnalyticsPeriod, PeriodCfg["trunc"][]> = {
  "1d": ["hour", "day", "week", "month", "quarter", "year"],
  "1w": ["day", "week", "month", "quarter", "year"],
  "2w": ["day", "week", "month", "quarter", "year"],
  "1m": ["day", "week", "month", "quarter", "year"],
  "3m": ["day", "week", "month", "quarter", "year"],
  "6m": ["day", "week", "month", "quarter", "year"],
  "1y": ["day", "week", "month", "quarter", "year"],
  all: ["day", "week", "month", "quarter", "year"],
  custom: ["day", "week", "month", "quarter", "year"],
};
const BUCKET_METADATA: Record<PeriodCfg["trunc"], { format: string; approxDays: number }> = {
  hour: { format: "YYYY-MM-DD HH24", approxDays: 1 / 24 },
  day: { format: "YYYY-MM-DD", approxDays: 1 },
  week: { format: "YYYY-MM-DD", approxDays: 7 },
  month: { format: "YYYY-MM", approxDays: 30.4375 },
  quarter: { format: 'YYYY-"Q"Q', approxDays: 91.3125 },
  year: { format: "YYYY", approxDays: 365.25 },
};

const DONATION_FEE_RATE = 0.07;
const WITHDRAWAL_FEE_RATE = 0.03;

function estimatePointCount(spanDays: number, trunc: PeriodCfg["trunc"]): number {
  if (spanDays <= 0) {
    return 0;
  }

  return Math.ceil(spanDays / BUCKET_METADATA[trunc].approxDays);
}

@Service()
export default class OjcAnalyticsRepo {
  public async getAnalytics(
    period: AnalyticsPeriod,
    category?: string,
    customRange?: AnalyticsCustomRange,
  ): Promise<AnalyticsData> {
    const cfg = await this.resolveEffectivePeriodConfig(period, customRange);
    const [
      summary,
      donationsByPeriod,
      tipRevenueByPeriod,
      withdrawalFeesByPeriod,
      usersByPeriod,
      campaignsByPeriod,
      topCampaigns,
      topDonors,
      topCreators,
      donationsByStatus,
      categoryBreakdown,
    ] = await Promise.all([
      this.getSummary(),
      this.getDonationsByPeriod(cfg, category),
      this.getTipRevenueByPeriod(cfg, category),
      this.getWithdrawalFeesByPeriod(cfg, category),
      this.getUsersByPeriod(cfg),
      this.getCampaignsByPeriod(cfg, category),
      this.getTopCampaigns(cfg, category),
      this.getTopDonors(cfg, category),
      this.getTopCreators(cfg, category),
      this.getDonationsByStatus(cfg, category),
      this.getCategoryBreakdown(cfg),
    ]);
    return {
      bucketTrunc: cfg.trunc,
      summary,
      donationsByPeriod,
      tipRevenueByPeriod,
      withdrawalFeesByPeriod,
      usersByPeriod,
      campaignsByPeriod,
      topCampaigns,
      topDonors,
      topCreators,
      donationsByStatus,
      categoryBreakdown,
    };
  }

  private async resolveEffectivePeriodConfig(
    period: AnalyticsPeriod,
    customRange?: AnalyticsCustomRange,
  ): Promise<PeriodCfg> {
    const baseConfig = PERIOD_CONFIG[period];
    const spanDays = await this.getAnalyticsSpanDays(baseConfig.interval, customRange);
    const candidateBuckets = PERIOD_BUCKET_CANDIDATES[period];
    const chosenBucket =
      candidateBuckets.find(bucket => estimatePointCount(spanDays, bucket) <= MAX_CHART_POINTS) ??
      candidateBuckets[candidateBuckets.length - 1] ??
      baseConfig.trunc;

    return {
      interval: baseConfig.interval,
      trunc: chosenBucket,
      format: BUCKET_METADATA[chosenBucket].format,
      customRange,
    };
  }

  private hasTimeFilter(cfg: PeriodCfg): boolean {
    return Boolean(cfg.interval || cfg.customRange);
  }

  private buildTimeCondition(columnRef: string, cfg: PeriodCfg, params: (string | number)[]): string | null {
    if (cfg.customRange) {
      const startParam = params.push(cfg.customRange.startDate);
      const endParam = params.push(cfg.customRange.endDate);
      return `${columnRef} >= $${startParam}::date AND ${columnRef} < ($${endParam}::date + INTERVAL '1 day')`;
    }

    if (!cfg.interval) {
      return null;
    }

    return `${columnRef} >= NOW() - INTERVAL '${cfg.interval}'`;
  }

  private async getAnalyticsSpanDays(interval: string | null, customRange?: AnalyticsCustomRange): Promise<number> {
    if (customRange) {
      const startDate = new Date(`${customRange.startDate}T00:00:00Z`);
      const endDate = new Date(`${customRange.endDate}T00:00:00Z`);
      const millisecondsInDay = 1000 * 60 * 60 * 24;
      return Math.max(Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsInDay) + 1, 1);
    }

    const createdAtCondition = interval ? `"createdAt" >= NOW() - INTERVAL '${interval}'` : null;
    const where = createdAtCondition ? `WHERE ${createdAtCondition}` : "";
    const { rows } = await ojcPool.query<{ minCreated: string | null; maxCreated: string | null }>(`
      SELECT MIN("createdAt")::text AS "minCreated", MAX("createdAt")::text AS "maxCreated"
      FROM (
        SELECT "createdAt" FROM "Profiles" ${where}
        UNION ALL
        SELECT "createdAt" FROM "Campaigns" ${where}
        UNION ALL
        SELECT "createdAt" FROM "Donations" ${where}
      ) AS bounds
    `);

    const minCreated = rows[0]?.minCreated ? new Date(rows[0].minCreated) : null;
    const maxCreated = rows[0]?.maxCreated ? new Date(rows[0].maxCreated) : null;

    if (!minCreated || !maxCreated) {
      return 0;
    }

    const millisecondsInDay = 1000 * 60 * 60 * 24;
    return Math.max((maxCreated.getTime() - minCreated.getTime()) / millisecondsInDay, 0);
  }

  private async getSummary(): Promise<AnalyticsSummary> {
    const [summaryResult, tipResult, withdrawalResult] = await Promise.all([
      ojcPool.query<{
        totalUsers: number;
        totalCampaigns: number;
        totalRaised: string;
        activeCampaigns: number;
        pendingApprovals: number;
        newUsers30d: number;
      }>(`
        SELECT
          (SELECT COUNT(*)::int FROM "Profiles") AS "totalUsers",
          (SELECT COUNT(*)::int FROM "Campaigns") AS "totalCampaigns",
          (SELECT COALESCE(SUM("amount"), 0)::text FROM "Donations" WHERE "status" = 'COMPLETED') AS "totalRaised",
          (SELECT COUNT(*)::int FROM "Campaigns" WHERE "status" = 'ACTIVE') AS "activeCampaigns",
          (SELECT COUNT(*)::int FROM "Campaigns" WHERE "status" = 'PENDING') AS "pendingApprovals",
          (SELECT COUNT(*)::int FROM "Profiles" WHERE "createdAt" >= NOW() - INTERVAL '30 days') AS "newUsers30d"
      `),
      sharedPool
        .query<{ totalTips: string }>(
          `SELECT COALESCE(SUM(
            CASE
              WHEN t."tipAmount" > 0 THEN t."tipAmount"
              WHEN t."type" = 1 THEN t."fiatAmount"
              ELSE 0
            END
          ), 0)::text AS "totalTips"
         FROM "Transaction" t
         WHERE t."type" = 1 OR t."tipAmount" > 0`,
        )
        .catch(async error => {
          Logger.warn(
            { err: error },
            "[OjcAnalyticsRepo] Failed to load tip revenue summary from tipAmount, using legacy transaction fallback",
          );
          return sharedPool
            .query<{ totalTips: string }>(
              `SELECT COALESCE(SUM("fiatAmount"), 0)::text AS "totalTips"
           FROM "Transaction"
           WHERE "type" = 1`,
            )
            .catch(fallbackError => {
              Logger.warn({ err: fallbackError }, "[OjcAnalyticsRepo] Failed to load legacy tip revenue summary");
              return { rows: [{ totalTips: "0" }] };
            });
        }),
      sharedPool
        .query<{ totalWithdrawn: string }>(
          `SELECT COALESCE(SUM(COALESCE(NULLIF("amountFiat", 0), "amount")), 0)::text AS "totalWithdrawn"
         FROM "Withdrawals"
         WHERE "status" = 'COMPLETED'`,
        )
        .catch(error => {
          Logger.warn({ err: error }, "[OjcAnalyticsRepo] Failed to load withdrawal fee revenue summary");
          return { rows: [{ totalWithdrawn: "0" }] };
        }),
    ]);

    const row = summaryResult.rows[0];
    const totalRaised = parseFloat(row?.totalRaised ?? "0") || 0;
    const tipRevenue = parseFloat(tipResult.rows[0]?.totalTips ?? "0") || 0;
    const totalWithdrawn = parseFloat(withdrawalResult.rows[0]?.totalWithdrawn ?? "0") || 0;
    const donationFeeRevenue = totalRaised * DONATION_FEE_RATE;
    const withdrawalFeeRevenue = totalWithdrawn * WITHDRAWAL_FEE_RATE;

    return {
      totalUsers: row?.totalUsers ?? 0,
      totalCampaigns: row?.totalCampaigns ?? 0,
      totalRaised,
      activeCampaigns: row?.activeCampaigns ?? 0,
      pendingApprovals: row?.pendingApprovals ?? 0,
      newUsers30d: row?.newUsers30d ?? 0,
      donationFeeRevenue,
      tipRevenue,
      withdrawalFeeRevenue,
      platformRevenue: donationFeeRevenue + tipRevenue + withdrawalFeeRevenue,
    };
  }

  private async getDonationsByPeriod(cfg: PeriodCfg, category?: string): Promise<DataPoint[]> {
    const params: (string | number)[] = [];
    const conditions: string[] = ["d.\"status\" = 'COMPLETED'"];
    const createdAtCondition = this.buildTimeCondition(`d."createdAt"`, cfg, params);
    if (createdAtCondition) conditions.push(createdAtCondition);

    let joinClause = "";
    if (category) {
      params.push(category);
      joinClause = `LEFT JOIN "Campaigns" c ON c."campaignId" = d."campaignId"
                    LEFT JOIN "CampaignCategories" cc ON cc."campaignCategoryId" = c."categoryId"`;
      conditions.push(`cc."name" = $${params.length}`);
    }

    const { rows } = await ojcPool.query<{ key: string; count: number; total: string }>(
      `SELECT TO_CHAR(DATE_TRUNC('${cfg.trunc}', d."createdAt"), '${cfg.format}') AS key,
              COUNT(*)::int AS count, COALESCE(SUM(d."amount"), 0)::text AS total
       FROM "Donations" d ${joinClause} WHERE ${conditions.join(" AND ")}
       GROUP BY 1 ORDER BY 1`,
      params,
    );
    return rows.map(r => ({ key: r.key, count: r.count, total: parseFloat(r.total) || 0 }));
  }

  private async getTipRevenueByPeriod(cfg: PeriodCfg, category?: string): Promise<DataPoint[]> {
    if (category) {
      return [];
    }

    const params: (string | number)[] = [];
    const conditions: string[] = [`(t."type" = 1 OR t."tipAmount" > 0)`];
    const createdAtCondition = this.buildTimeCondition(`t."createdAt"`, cfg, params);
    if (createdAtCondition) conditions.push(createdAtCondition);

    let rows: Array<{ key: string; count: number; total: string }> = [];
    try {
      const result = await sharedPool.query<{ key: string; count: number; total: string }>(
        `SELECT TO_CHAR(DATE_TRUNC('${cfg.trunc}', t."createdAt"), '${cfg.format}') AS key,
                COUNT(*)::int AS count,
                COALESCE(SUM(
                  CASE
                    WHEN t."tipAmount" > 0 THEN t."tipAmount"
                    WHEN t."type" = 1 THEN t."fiatAmount"
                    ELSE 0
                  END
                ), 0)::text AS total
         FROM "Transaction" t
         WHERE ${conditions.join(" AND ")}
         GROUP BY 1
         ORDER BY 1`,
        params,
      );
      rows = result.rows;
    } catch (error) {
      Logger.warn(
        { err: error },
        "[OjcAnalyticsRepo] Failed to load tip revenue by period from tipAmount, using legacy transaction fallback",
      );
      try {
        const fallbackConditions = conditions.map(condition =>
          condition === `(t."type" = 1 OR t."tipAmount" > 0)` ? `t."type" = 1` : condition,
        );
        const fallbackResult = await sharedPool.query<{ key: string; count: number; total: string }>(
          `SELECT TO_CHAR(DATE_TRUNC('${cfg.trunc}', t."createdAt"), '${cfg.format}') AS key,
                  COUNT(*)::int AS count,
                  COALESCE(SUM(t."fiatAmount"), 0)::text AS total
           FROM "Transaction" t
           WHERE ${fallbackConditions.join(" AND ")}
           GROUP BY 1
           ORDER BY 1`,
          params,
        );
        rows = fallbackResult.rows;
      } catch (fallbackError) {
        Logger.warn({ err: fallbackError }, "[OjcAnalyticsRepo] Failed to load legacy tip revenue by period");
      }
    }

    return rows.map(r => ({ key: r.key, count: r.count, total: parseFloat(r.total) || 0 }));
  }

  private async getWithdrawalFeesByPeriod(cfg: PeriodCfg, category?: string): Promise<DataPoint[]> {
    if (category) {
      return [];
    }

    const params: (string | number)[] = [];
    const conditions: string[] = ["w.\"status\" = 'COMPLETED'"];
    const createdAtCondition = this.buildTimeCondition(`w."createdAt"`, cfg, params);
    if (createdAtCondition) conditions.push(createdAtCondition);

    let rows: Array<{ key: string; count: number; total: string }> = [];
    try {
      const result = await sharedPool.query<{ key: string; count: number; total: string }>(
        `SELECT TO_CHAR(DATE_TRUNC('${cfg.trunc}', w."createdAt"), '${cfg.format}') AS key,
                COUNT(*)::int AS count,
                COALESCE(SUM(COALESCE(NULLIF(w."amountFiat", 0), w."amount") * ${WITHDRAWAL_FEE_RATE}), 0)::text AS total
         FROM "Withdrawals" w
         WHERE ${conditions.join(" AND ")}
         GROUP BY 1
         ORDER BY 1`,
        params,
      );
      rows = result.rows;
    } catch (error) {
      Logger.warn({ err: error }, "[OjcAnalyticsRepo] Failed to load withdrawal fee revenue by period");
    }

    return rows.map(r => ({ key: r.key, count: r.count, total: parseFloat(r.total) || 0 }));
  }

  private async getUsersByPeriod(cfg: PeriodCfg): Promise<DataPoint[]> {
    const params: (string | number)[] = [];
    const createdAtCondition = this.buildTimeCondition(`"createdAt"`, cfg, params);
    const where = createdAtCondition ? `WHERE ${createdAtCondition}` : "";
    const { rows } = await ojcPool.query<{ key: string; count: number }>(
      `SELECT TO_CHAR(DATE_TRUNC('${cfg.trunc}', "createdAt"), '${cfg.format}') AS key, COUNT(*)::int AS count
       FROM "Profiles" ${where} GROUP BY 1 ORDER BY 1`,
      params,
    );
    return rows.map(r => ({ key: r.key, count: r.count }));
  }

  private async getCampaignsByPeriod(cfg: PeriodCfg, category?: string): Promise<DataPoint[]> {
    const params: (string | number)[] = [];
    const conditions: string[] = [];
    const createdAtCondition = this.buildTimeCondition(`c."createdAt"`, cfg, params);
    if (createdAtCondition) conditions.push(createdAtCondition);

    let joinClause = "";
    if (category) {
      params.push(category);
      joinClause = `LEFT JOIN "CampaignCategories" cc ON cc."campaignCategoryId" = c."categoryId"`;
      conditions.push(`cc."name" = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await ojcPool.query<{ key: string; count: number }>(
      `SELECT TO_CHAR(DATE_TRUNC('${cfg.trunc}', c."createdAt"), '${cfg.format}') AS key, COUNT(*)::int AS count
       FROM "Campaigns" c ${joinClause} ${where} GROUP BY 1 ORDER BY 1`,
      params,
    );
    return rows.map(r => ({ key: r.key, count: r.count }));
  }

  private async getTopCampaigns(cfg: PeriodCfg, category?: string): Promise<TopCampaign[]> {
    const params: (string | number)[] = [];
    const donationConditions: string[] = ["d.\"status\" = 'COMPLETED'"];
    const campaignConditions: string[] = [];
    const donationCreatedAtCondition = this.buildTimeCondition(`d."createdAt"`, cfg, params);
    if (donationCreatedAtCondition) donationConditions.push(donationCreatedAtCondition);
    if (category) {
      params.push(category);
      campaignConditions.push(`cc."name" = $${params.length}`);
    }

    const donationWhere = donationConditions.join(" AND ");
    const campaignWhere = campaignConditions.length ? `WHERE ${campaignConditions.join(" AND ")}` : "";
    const having = this.hasTimeFilter(cfg) ? `HAVING COALESCE(SUM(d."amount"), 0) > 0` : "";

    const { rows } = await ojcPool.query<{
      campaignId: string;
      title: string;
      category: string | null;
      amountRaised: string;
      goalAmount: string;
      donorCount: number;
    }>(
      `
      SELECT c."campaignId", c."title", cc."name" AS "category",
             COALESCE(SUM(d."amount"), 0)::text AS "amountRaised",
             c."goalAmount"::text,
             COUNT(DISTINCT d."donationId")::int AS "donorCount"
      FROM "Campaigns" c
      LEFT JOIN "CampaignCategories" cc ON cc."campaignCategoryId" = c."categoryId"
      LEFT JOIN "Donations" d ON d."campaignId" = c."campaignId" AND ${donationWhere}
      ${campaignWhere}
      GROUP BY c."campaignId", c."title", cc."name", c."goalAmount"
      ${having}
      ORDER BY COALESCE(SUM(d."amount"), 0) DESC LIMIT 10
    `,
      params,
    );
    return rows.map(r => ({
      campaignId: r.campaignId,
      title: r.title,
      category: r.category ?? "",
      amountRaised: parseFloat(r.amountRaised) || 0,
      goalAmount: parseFloat(r.goalAmount) || 0,
      donorCount: r.donorCount,
    }));
  }

  private async getTopDonors(cfg: PeriodCfg, category?: string): Promise<TopDonor[]> {
    const params: (string | number)[] = [];
    const conditions: string[] = ["d.\"status\" = 'COMPLETED'"];
    const createdAtCondition = this.buildTimeCondition(`d."createdAt"`, cfg, params);
    if (createdAtCondition) conditions.push(createdAtCondition);

    let campaignJoin = "";
    if (category) {
      params.push(category);
      campaignJoin = `LEFT JOIN "Campaigns" c ON c."campaignId" = d."campaignId"
                      LEFT JOIN "CampaignCategories" cc ON cc."campaignCategoryId" = c."categoryId"`;
      conditions.push(`cc."name" = $${params.length}`);
    }

    const { rows } = await ojcPool.query<{
      profileId: string | null;
      donorName: string;
      username: string | null;
      donationCount: number;
      totalDonated: string;
    }>(
      `SELECT d."profileId",
              COALESCE(NULLIF(TRIM(COALESCE(p."firstName",'') || ' ' || COALESCE(p."lastName",'')), ''), p."username", 'Unknown') AS "donorName",
              p."username",
              COUNT(DISTINCT d."donationId")::int AS "donationCount",
              COALESCE(SUM(d."amount"), 0)::text AS "totalDonated"
       FROM "Donations" d
       LEFT JOIN "Profiles" p ON p."profileId" = d."profileId"
       ${campaignJoin}
       WHERE ${conditions.join(" AND ")}
       GROUP BY d."profileId", p."username", p."firstName", p."lastName"
       ORDER BY COALESCE(SUM(d."amount"), 0) DESC LIMIT 10`,
      params,
    );
    return rows.map(r => ({
      profileId: r.profileId,
      donorName: r.donorName,
      username: r.username,
      donationCount: r.donationCount,
      totalDonated: parseFloat(r.totalDonated) || 0,
    }));
  }

  private async getTopCreators(cfg: PeriodCfg, category?: string): Promise<TopCreator[]> {
    const params: (string | number)[] = [];
    const campaignConditions: string[] = [];
    if (category) {
      params.push(category);
      campaignConditions.push(`cc."name" = $${params.length}`);
    }

    const campaignWhere = campaignConditions.length ? `WHERE ${campaignConditions.join(" AND ")}` : "";
    const donationConditions: string[] = ["d.\"status\" = 'COMPLETED'"];
    const donationCreatedAtCondition = this.buildTimeCondition(`d."createdAt"`, cfg, params);
    if (donationCreatedAtCondition) donationConditions.push(donationCreatedAtCondition);
    const having = this.hasTimeFilter(cfg) ? `HAVING COALESCE(SUM(d."amount"), 0) > 0` : "";

    const { rows } = await ojcPool.query<{
      profileId: string;
      creatorName: string;
      username: string | null;
      campaignCount: number;
      totalRaised: string;
    }>(
      `SELECT c."profileId",
              COALESCE(NULLIF(TRIM(COALESCE(p."firstName",'') || ' ' || COALESCE(p."lastName",'')), ''), p."username", 'Unknown') AS "creatorName",
              p."username",
              COUNT(DISTINCT c."campaignId")::int AS "campaignCount",
              COALESCE(SUM(d."amount"), 0)::text AS "totalRaised"
       FROM "Campaigns" c
       JOIN "Profiles" p ON p."profileId" = c."profileId"
       LEFT JOIN "CampaignCategories" cc ON cc."campaignCategoryId" = c."categoryId"
       LEFT JOIN "Donations" d ON d."campaignId" = c."campaignId" AND ${donationConditions.join(" AND ")}
       ${campaignWhere}
       GROUP BY c."profileId", p."username", p."firstName", p."lastName"
       ${having}
       ORDER BY COALESCE(SUM(d."amount"), 0) DESC LIMIT 10`,
      params,
    );
    return rows.map(r => ({
      profileId: r.profileId,
      creatorName: r.creatorName,
      username: r.username,
      campaignCount: r.campaignCount,
      totalRaised: parseFloat(r.totalRaised) || 0,
    }));
  }

  private async getDonationsByStatus(cfg: PeriodCfg, category?: string): Promise<DonationStatusStat[]> {
    const params: (string | number)[] = [];
    const conditions: string[] = [];
    const createdAtCondition = this.buildTimeCondition(`d."createdAt"`, cfg, params);
    if (createdAtCondition) conditions.push(createdAtCondition);

    let joinClause = "";
    if (category) {
      params.push(category);
      joinClause = `LEFT JOIN "Campaigns" c ON c."campaignId" = d."campaignId"
                    LEFT JOIN "CampaignCategories" cc ON cc."campaignCategoryId" = c."categoryId"`;
      conditions.push(`cc."name" = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await ojcPool.query<{ status: string; count: number; total: string }>(
      `
      SELECT d."status", COUNT(*)::int AS count, COALESCE(SUM(d."amount"), 0)::text AS total
      FROM "Donations" d ${joinClause} ${where}
      GROUP BY d."status" ORDER BY count DESC`,
      params,
    );
    return rows.map(r => ({ status: r.status, count: r.count, total: parseFloat(r.total) || 0 }));
  }

  private async getCategoryBreakdown(cfg: PeriodCfg): Promise<CategoryStat[]> {
    const params: (string | number)[] = [];
    const conditions: string[] = [];
    const createdAtCondition = this.buildTimeCondition(`c."createdAt"`, cfg, params);
    if (createdAtCondition) conditions.push(createdAtCondition);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await ojcPool.query<{
      category: string;
      campaignCount: number;
      totalRaised: string;
      activeCampaigns: number;
    }>(
      `
      SELECT cc."name" AS "category",
             COUNT(DISTINCT c."campaignId")::int AS "campaignCount",
             COALESCE(SUM(d."amount") FILTER (WHERE d."status" = 'COMPLETED'), 0)::text AS "totalRaised",
             COUNT(DISTINCT c."campaignId") FILTER (WHERE c."status" = 'ACTIVE')::int AS "activeCampaigns"
      FROM "CampaignCategories" cc
      LEFT JOIN "Campaigns" c ON c."categoryId" = cc."campaignCategoryId"
      LEFT JOIN "Donations" d ON d."campaignId" = c."campaignId"
      ${where}
      GROUP BY cc."campaignCategoryId", cc."name"
      ORDER BY "campaignCount" DESC`,
      params,
    );
    return rows.map(r => ({
      category: r.category,
      campaignCount: r.campaignCount,
      totalRaised: parseFloat(r.totalRaised) || 0,
      activeCampaigns: r.activeCampaigns,
    }));
  }
}
