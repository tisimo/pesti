import { Service } from "typedi";
import { ojcPool } from "../../loaders/postgres";

export interface AdminDonation {
  donationId: string;
  campaignId: string;
  campaignTitle: string | null;
  donorName: string | null;
  donorUsername: string | null;
  profileId: string | null;
  amount: number;
  status: "COMPLETED" | "PENDING" | "FAILED";
  isAnonymous: boolean;
  transactionId: string | null;
  createdAt: string;
}

export interface DonationsPage {
  donations: AdminDonation[];
  total: number;
  summary: {
    totalAmount: number;
    completedCount: number;
    pendingCount: number;
    failedCount: number;
  };
  overall: {
    total: number;
    summary: {
      totalAmount: number;
      completedCount: number;
      pendingCount: number;
      failedCount: number;
    };
  };
}

@Service()
export default class OjcDonationsRepo {
  public async listDonations(
    status: string | undefined,
    search: string | undefined,
    limit: number,
    offset: number,
  ): Promise<DonationsPage> {
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status.toUpperCase());
      conditions.push(`d."status" = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const n = params.length;
      conditions.push(`(c."title" ILIKE $${n} OR p."firstName" ILIKE $${n} OR p."lastName" ILIKE $${n} OR p."username" ILIKE $${n})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await ojcPool.query<{ total: number }>(
      `SELECT
         COUNT(*)::int AS total,
         COALESCE(SUM(d."amount") FILTER (WHERE d."status" = 'COMPLETED'), 0)::numeric AS "totalAmount",
         COUNT(*) FILTER (WHERE d."status" = 'COMPLETED')::int AS "completedCount",
         COUNT(*) FILTER (WHERE d."status" = 'PENDING')::int AS "pendingCount",
         COUNT(*) FILTER (WHERE d."status" = 'FAILED')::int AS "failedCount"
       FROM "Donations" d
       LEFT JOIN "Campaigns" c ON c."campaignId" = d."campaignId"
       LEFT JOIN "Profiles" p ON p."profileId" = d."profileId"
       ${where}`,
      params,
    );
    const summaryRow = countResult.rows[0];
    const total = summaryRow?.total ?? 0;

    const overallResult = await ojcPool.query<{
      total: number;
      totalAmount: string;
      completedCount: number;
      pendingCount: number;
      failedCount: number;
    }>(
      `SELECT
         COUNT(*)::int AS total,
         COALESCE(SUM(d."amount") FILTER (WHERE d."status" = 'COMPLETED'), 0)::numeric AS "totalAmount",
         COUNT(*) FILTER (WHERE d."status" = 'COMPLETED')::int AS "completedCount",
         COUNT(*) FILTER (WHERE d."status" = 'PENDING')::int AS "pendingCount",
         COUNT(*) FILTER (WHERE d."status" = 'FAILED')::int AS "failedCount"
       FROM "Donations" d`,
    );
    const overallRow = overallResult.rows[0];

    params.push(limit, offset);
    const { rows } = await ojcPool.query<{
      donationId: string;
      campaignId: string;
      campaignTitle: string | null;
      donorFirstName: string | null;
      donorLastName: string | null;
      donorUsername: string | null;
      profileId: string | null;
      amount: string;
      status: string;
      isAnonymous: boolean;
      transactionId: string | null;
      createdAt: string;
    }>(
      `SELECT
         d."donationId",
         d."campaignId",
         c."title" AS "campaignTitle",
         p."firstName" AS "donorFirstName",
         p."lastName" AS "donorLastName",
         p."username" AS "donorUsername",
         d."profileId",
         d."amount",
         d."status",
         d."isAnonymous",
         d."transactionId",
         d."createdAt"
       FROM "Donations" d
       LEFT JOIN "Campaigns" c ON c."campaignId" = d."campaignId"
       LEFT JOIN "Profiles" p ON p."profileId" = d."profileId"
       ${where}
       ORDER BY d."createdAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const donations: AdminDonation[] = rows.map((r) => ({
      donationId: r.donationId,
      campaignId: r.campaignId,
      campaignTitle: r.campaignTitle,
      profileId: r.profileId,
      amount: parseFloat(r.amount) || 0,
      status: r.status as AdminDonation["status"],
      isAnonymous: r.isAnonymous,
      transactionId: r.transactionId,
      createdAt: r.createdAt,
      donorName: r.isAnonymous
        ? "Anonymous"
        : [r.donorFirstName, r.donorLastName].filter(Boolean).join(" ").trim() || r.donorUsername || null,
      donorUsername: r.isAnonymous ? null : r.donorUsername,
    }));

    return {
      donations,
      total,
      summary: {
        totalAmount: Number((summaryRow as any)?.totalAmount ?? 0),
        completedCount: Number((summaryRow as any)?.completedCount ?? 0),
        pendingCount: Number((summaryRow as any)?.pendingCount ?? 0),
        failedCount: Number((summaryRow as any)?.failedCount ?? 0),
      },
      overall: {
        total: Number(overallRow?.total ?? 0),
        summary: {
          totalAmount: Number(overallRow?.totalAmount ?? 0),
          completedCount: Number(overallRow?.completedCount ?? 0),
          pendingCount: Number(overallRow?.pendingCount ?? 0),
          failedCount: Number(overallRow?.failedCount ?? 0),
        },
      },
    };
  }
}
