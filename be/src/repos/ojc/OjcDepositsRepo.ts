import { Service } from "typedi";
import { sharedPool } from "../../loaders/postgresShared";
import { ojcPool } from "../../loaders/postgres";

export interface AdminDeposit {
  depositId: string;
  walletAddress: string;
  amount: number;
  amountFiat: number;
  currency: string;
  provider: string;
  method: string;
  application: string;
  txHash: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
  accountId: string | null;
  email: string | null;
  profileId: string | null;
  username: string | null;
  displayName: string | null;
}

export interface DepositsPage {
  deposits: AdminDeposit[];
  total: number;
  summary: {
    totalAmountFiat: number;
    pendingCount: number;
    completedCount: number;
    failedCount: number;
  };
  overall: {
    total: number;
    summary: {
      totalAmountFiat: number;
      pendingCount: number;
      completedCount: number;
      failedCount: number;
    };
  };
}

@Service()
export default class OjcDepositsRepo {
  public async listDeposits(
    status: string | undefined,
    search: string | undefined,
    onlyJustCauses: boolean,
    limit: number,
    offset: number,
  ): Promise<DepositsPage> {
    const params: any[] = [];
    const conditions: string[] = [];
    const overallConditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`d."status" = $${params.length}`);
    }

    if (onlyJustCauses) {
      conditions.push(`d."application" = 'OnlyJustCauses'`);
      overallConditions.push(`"application" = 'OnlyJustCauses'`);
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const n = params.length;
      conditions.push(`(d."walletAddress" ILIKE $${n} OR COALESCE(a."email", '') ILIKE $${n} OR COALESCE(d."txHash", '') ILIKE $${n} OR COALESCE(d."application", '') ILIKE $${n})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const overallWhere = overallConditions.length > 0 ? `WHERE ${overallConditions.join(" AND ")}` : "";

    params.push(limit);
    params.push(offset);

    const { rows } = await sharedPool.query<{
      depositId: string;
      walletAddress: string;
      amount: string;
      amountFiat: string;
      currency: string;
      provider: string;
      method: string;
      application: string;
      txHash: string | null;
      status: string;
      createdAt: string;
      accountId: string | null;
      email: string | null;
    }>(
      `SELECT d."depositId", d."walletAddress", d."amount", d."amountFiat", d."currency",
              d."provider", d."method", d."application", d."txHash", d."status", d."createdAt",
              wa."accountId", a."email"
       FROM "Deposits" d
       LEFT JOIN "Wallet" wa ON wa."walletAddress" = d."walletAddress"
       LEFT JOIN "Account" a ON a."accountId" = wa."accountId"
       ${where}
       ORDER BY d."createdAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const countResult = await sharedPool.query<{
      total: string;
      totalAmountFiat: string;
      pendingCount: string;
      completedCount: string;
      failedCount: string;
    }>(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(d."amountFiat") FILTER (WHERE d."status" = 'COMPLETED'), 0) AS "totalAmountFiat",
         COUNT(*) FILTER (WHERE d."status" = 'PENDING') AS "pendingCount",
         COUNT(*) FILTER (WHERE d."status" = 'COMPLETED') AS "completedCount",
         COUNT(*) FILTER (WHERE d."status" = 'FAILED') AS "failedCount"
       FROM "Deposits" d
       LEFT JOIN "Wallet" wa ON wa."walletAddress" = d."walletAddress"
       LEFT JOIN "Account" a ON a."accountId" = wa."accountId"
       ${where}`,
      params.slice(0, params.length - 2),
    );
    const summaryRow = countResult.rows[0];

    const overallResult = await sharedPool.query<{
      total: string;
      totalAmountFiat: string;
      pendingCount: string;
      completedCount: string;
      failedCount: string;
    }>(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM("amountFiat") FILTER (WHERE "status" = 'COMPLETED'), 0) AS "totalAmountFiat",
         COUNT(*) FILTER (WHERE "status" = 'PENDING') AS "pendingCount",
         COUNT(*) FILTER (WHERE "status" = 'COMPLETED') AS "completedCount",
         COUNT(*) FILTER (WHERE "status" = 'FAILED') AS "failedCount"
       FROM "Deposits"
       ${overallWhere}`,
      [],
    );
    const overallRow = overallResult.rows[0];

    const accountIds = rows.map((row) => row.accountId).filter((value): value is string => !!value);
    let profileMap: Record<string, { profileId: string; username: string | null; displayName: string | null }> = {};

    if (accountIds.length > 0) {
      const profileResult = await ojcPool.query<{
        accountId: string;
        profileId: string;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        legalName: string | null;
      }>(
        `SELECT "accountId", "profileId", "username", "firstName", "lastName", "legalName"
         FROM "Profiles"
         WHERE "accountId" = ANY($1::uuid[])`,
        [accountIds],
      );

      profileMap = Object.fromEntries(
        profileResult.rows.map((row) => {
          const personName = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
          return [
            row.accountId,
            {
              profileId: row.profileId,
              username: row.username,
              displayName: row.legalName || personName || row.username,
            },
          ];
        }),
      );
    }

    const deposits: AdminDeposit[] = rows.map((r) => ({
      depositId: r.depositId,
      walletAddress: r.walletAddress,
      amount: parseFloat(r.amount),
      amountFiat: parseFloat(r.amountFiat),
      currency: r.currency,
      provider: r.provider,
      method: r.method,
      application: r.application,
      txHash: r.txHash,
      status: r.status as AdminDeposit["status"],
      createdAt: r.createdAt,
      accountId: r.accountId,
      email: r.email,
      profileId: r.accountId ? profileMap[r.accountId]?.profileId ?? null : null,
      username: r.accountId ? profileMap[r.accountId]?.username ?? null : null,
      displayName: r.accountId ? profileMap[r.accountId]?.displayName ?? null : null,
    }));

    return {
      deposits,
      total: parseInt(summaryRow?.total ?? "0", 10),
      summary: {
        totalAmountFiat: parseFloat(summaryRow?.totalAmountFiat ?? "0"),
        pendingCount: parseInt(summaryRow?.pendingCount ?? "0", 10),
        completedCount: parseInt(summaryRow?.completedCount ?? "0", 10),
        failedCount: parseInt(summaryRow?.failedCount ?? "0", 10),
      },
      overall: {
        total: parseInt(overallRow?.total ?? "0", 10),
        summary: {
          totalAmountFiat: parseFloat(overallRow?.totalAmountFiat ?? "0"),
          pendingCount: parseInt(overallRow?.pendingCount ?? "0", 10),
          completedCount: parseInt(overallRow?.completedCount ?? "0", 10),
          failedCount: parseInt(overallRow?.failedCount ?? "0", 10),
        },
      },
    };
  }
}
