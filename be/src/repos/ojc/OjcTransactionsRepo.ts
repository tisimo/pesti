import { Service } from "typedi";
import { sharedPool } from "../../loaders/postgresShared";
import { ojcPool } from "../../loaders/postgres";

export type AdminTransactionType = "DONATION" | "TIP" | "WITHDRAWAL" | "TRANSFER" | "UNKNOWN";

export interface AdminTransaction {
  transactionId: string;
  txHash: string;
  senderAddress: string;
  receiverAddress: string;
  type: AdminTransactionType;
  amount: number;
  fiatAmount: number;
  donationAmount: number;
  linkedDonationAmount: number | null;
  tipAmount: number;
  currency: string;
  token: string;
  commission: number;
  createdAt: string;
  campaignId: string | null;
  campaignTitle: string | null;
  donorName: string | null;
  donorUsername: string | null;
  donorProfileId: string | null;
  donationStatus: "COMPLETED" | "PENDING" | "FAILED" | null;
}

interface TransactionsSummary {
  totalMoved: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  donationCount: number;
  tipCount: number;
  withdrawalCount: number;
  transferCount: number;
}

export interface TransactionsPage {
  transactions: AdminTransaction[];
  total: number;
  summary: TransactionsSummary;
  overall: {
    total: number;
    summary: TransactionsSummary;
  };
}

function mapTransactionType(type: number): AdminTransactionType {
  if (type === 0) return "DONATION";
  if (type === 1) return "TIP";
  if (type === 2) return "WITHDRAWAL";
  if (type === 3) return "TRANSFER";
  return "UNKNOWN";
}

@Service()
export default class OjcTransactionsRepo {
  private async getTransactionsSummary(
    where: string,
    params: any[],
    completedDonationRows: { transactionId: string; amount: string }[],
    nonCompletedDonationRows: { transactionId: string; status: string }[],
  ): Promise<{ total: number; summary: TransactionsSummary }> {
    const countResult = await sharedPool.query<{
      total: number;
      donationCount: number;
      tipCount: number;
      withdrawalCount: number;
      transferCount: number;
    }>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE t."type" = 0)::int AS "donationCount",
         COUNT(*) FILTER (WHERE t."type" = 1)::int AS "tipCount",
         COUNT(*) FILTER (WHERE t."type" = 2)::int AS "withdrawalCount",
         COUNT(*) FILTER (WHERE t."type" = 3)::int AS "transferCount"
       FROM "Transaction" t
       ${where}`,
      params,
    );
    const summaryRow = countResult.rows[0];
    const total = summaryRow?.total ?? 0;

    const completedDonationAmountByTx = new Map<string, number>();
    for (const row of completedDonationRows) {
      completedDonationAmountByTx.set(
        row.transactionId,
        (completedDonationAmountByTx.get(row.transactionId) ?? 0) + (parseFloat(row.amount) || 0),
      );
    }
    const nonCompletedTxHashes = nonCompletedDonationRows.map((r) => r.transactionId);

    const movementResult = await sharedPool.query<{
      txHash: string;
      type: number;
      amount: string;
      fiatAmount: string;
      tipAmount: string;
    }>(
      `SELECT t."txHash", t."type", t."amount", t."fiatAmount", t."tipAmount"
       FROM "Transaction" t
       ${where}`,
      params,
    );
    const nonCompletedTxHashSet = new Set(nonCompletedTxHashes);
    const completedTxHashSet = new Set(completedDonationRows.map((row) => row.transactionId));
    const pendingTxHashSet = new Set(nonCompletedDonationRows.filter((row) => row.status === "PENDING").map((row) => row.transactionId));
    const failedTxHashSet = new Set(nonCompletedDonationRows.filter((row) => row.status === "FAILED").map((row) => row.transactionId));
    const totalMoved = movementResult.rows.reduce((sum, row) => {
      if (row.type === 0) {
        return sum + (completedDonationAmountByTx.get(row.txHash) ?? 0);
      }
      if (row.type === 1 && !nonCompletedTxHashSet.has(row.txHash)) {
        return sum + (parseFloat(row.tipAmount) || parseFloat(row.fiatAmount) || parseFloat(row.amount) || 0);
      }
      return sum;
    }, 0);
    const statusCounts = movementResult.rows.reduce(
      (counts, row) => {
        if (failedTxHashSet.has(row.txHash)) {
          counts.failedCount += 1;
        } else if (pendingTxHashSet.has(row.txHash)) {
          counts.pendingCount += 1;
        } else if (row.type === 1 || completedTxHashSet.has(row.txHash)) {
          counts.completedCount += 1;
        }
        return counts;
      },
      { completedCount: 0, pendingCount: 0, failedCount: 0 },
    );

    return {
      total,
      summary: {
        totalMoved,
        completedCount: statusCounts.completedCount,
        pendingCount: statusCounts.pendingCount,
        failedCount: statusCounts.failedCount,
        donationCount: Number(summaryRow?.donationCount ?? 0),
        tipCount: Number(summaryRow?.tipCount ?? 0),
        withdrawalCount: Number(summaryRow?.withdrawalCount ?? 0),
        transferCount: Number(summaryRow?.transferCount ?? 0),
      },
    };
  }

  public async listTransactions(
    type: string | undefined,
    status: string | undefined,
    search: string | undefined,
    limit: number,
    offset: number,
  ): Promise<TransactionsPage> {
    const params: any[] = [];
    const conditions: string[] = [`t."type" IN (0, 1)`];

    if (type) {
      params.push(type.toUpperCase());
      conditions.push(
        `CASE t."type"
           WHEN 0 THEN 'DONATION'
           WHEN 1 THEN 'TIP'
           WHEN 2 THEN 'WITHDRAWAL'
           WHEN 3 THEN 'TRANSFER'
           ELSE 'UNKNOWN'
         END = $${params.length}`,
      );
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const n = params.length;
      conditions.push(`(t."txHash" ILIKE $${n} OR t."senderAddress" ILIKE $${n} OR t."receiverAddress" ILIKE $${n})`);
    }

    if (status) {
      const { rows: donationRows } = await ojcPool.query<{ transactionId: string }>(
        `SELECT "transactionId"
         FROM "Donations"
         WHERE "status" = $1
           AND "transactionId" IS NOT NULL`,
        [status.toUpperCase()],
      );
      const txHashes = donationRows.map((r) => r.transactionId);
      if (txHashes.length === 0) {
        conditions.push("FALSE");
      } else {
        params.push(txHashes);
        conditions.push(`t."txHash" = ANY($${params.length}::text[])`);
      }
    } else {
      const { rows: failedDonationRows } = await ojcPool.query<{ transactionId: string }>(
        `SELECT "transactionId"
         FROM "Donations"
         WHERE "status" = 'FAILED'
           AND "transactionId" IS NOT NULL`,
      );
      const failedTxHashes = failedDonationRows.map((r) => r.transactionId);
      if (failedTxHashes.length > 0) {
        params.push(failedTxHashes);
        conditions.push(`NOT (t."txHash" = ANY($${params.length}::text[]))`);
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const overallWhere = `WHERE t."type" IN (0, 1)`;

    const { rows: completedDonationRows } = await ojcPool.query<{ transactionId: string; amount: string }>(
      `SELECT "transactionId", "amount"
       FROM "Donations"
       WHERE "status" = 'COMPLETED'
         AND "transactionId" IS NOT NULL`,
    );
    const { rows: nonCompletedDonationRows } = await ojcPool.query<{ transactionId: string; status: string }>(
      `SELECT "transactionId", "status"
       FROM "Donations"
       WHERE "status" IN ('PENDING', 'FAILED')
         AND "transactionId" IS NOT NULL`,
    );
    const filteredSummary = await this.getTransactionsSummary(
      where,
      params,
      completedDonationRows,
      nonCompletedDonationRows,
    );
    const overall = await this.getTransactionsSummary(
      overallWhere,
      [],
      completedDonationRows,
      nonCompletedDonationRows,
    );

    params.push(limit, offset);
    const { rows } = await sharedPool.query<{
      transactionId: string;
      txHash: string;
      senderAddress: string;
      receiverAddress: string;
      type: number;
      amount: string;
      fiatAmount: string;
      donationAmount: string;
      tipAmount: string;
      currency: string;
      token: string;
      commission: string;
      createdAt: string;
    }>(
      `SELECT
         t."transactionId",
         t."txHash",
         t."senderAddress",
         t."receiverAddress",
         t."type",
         t."amount",
         t."fiatAmount",
         t."donationAmount",
         t."tipAmount",
         t."currency",
         t."token",
         t."commission",
         t."createdAt"
       FROM "Transaction" t
       ${where}
       ORDER BY t."createdAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const transactionHashes = rows.map((row) => row.txHash).filter(Boolean);
    const donationContext = new Map<
      string,
      {
        campaignId: string | null;
        campaignTitle: string | null;
        donorName: string | null;
        donorUsername: string | null;
        donorProfileId: string | null;
        linkedDonationAmount: number | null;
        donationStatus: "COMPLETED" | "PENDING" | "FAILED" | null;
      }
    >();

    if (transactionHashes.length > 0) {
      const contextResult = await ojcPool.query<{
        transactionId: string;
        campaignId: string | null;
        campaignTitle: string | null;
        donorFirstName: string | null;
        donorLastName: string | null;
        donorUsername: string | null;
        profileId: string | null;
        linkedDonationAmount: string | null;
        isAnonymous: boolean;
        status: string | null;
      }>(
        `SELECT
           d."transactionId",
           d."campaignId",
           c."title" AS "campaignTitle",
           p."firstName" AS "donorFirstName",
           p."lastName" AS "donorLastName",
           p."username" AS "donorUsername",
           d."profileId",
           d."amount" AS "linkedDonationAmount",
           d."isAnonymous",
           d."status"
         FROM "Donations" d
         LEFT JOIN "Campaigns" c ON c."campaignId" = d."campaignId"
         LEFT JOIN "Profiles" p ON p."profileId" = d."profileId"
         WHERE d."transactionId" = ANY($1::text[])`,
        [transactionHashes],
      );

      for (const row of contextResult.rows) {
        if (donationContext.has(row.transactionId)) continue;
        donationContext.set(row.transactionId, {
          campaignId: row.campaignId,
          campaignTitle: row.campaignTitle,
          donorName: row.isAnonymous
            ? "Anonymous"
            : [row.donorFirstName, row.donorLastName].filter(Boolean).join(" ").trim() || row.donorUsername || null,
          donorUsername: row.isAnonymous ? null : row.donorUsername,
          donorProfileId: row.profileId,
          linkedDonationAmount: row.linkedDonationAmount !== null ? parseFloat(row.linkedDonationAmount) || 0 : null,
          donationStatus: row.status ? (row.status as "COMPLETED" | "PENDING" | "FAILED") : null,
        });
      }
    }

    const transactions: AdminTransaction[] = rows.map((row) => {
      const relatedDonation = donationContext.get(row.txHash);
      return {
        transactionId: row.transactionId,
        txHash: row.txHash,
        senderAddress: row.senderAddress,
        receiverAddress: row.receiverAddress,
        type: mapTransactionType(row.type),
        amount: parseFloat(row.amount) || 0,
        fiatAmount: parseFloat(row.fiatAmount) || 0,
        donationAmount: parseFloat(row.donationAmount) || 0,
        linkedDonationAmount: relatedDonation?.linkedDonationAmount ?? null,
        tipAmount: parseFloat(row.tipAmount) || 0,
        currency: row.currency,
        token: row.token,
        commission: parseFloat(row.commission) || 0,
        createdAt: row.createdAt,
        campaignId: relatedDonation?.campaignId ?? null,
        campaignTitle: relatedDonation?.campaignTitle ?? null,
        donorName: relatedDonation?.donorName ?? null,
        donorUsername: relatedDonation?.donorUsername ?? null,
        donorProfileId: relatedDonation?.donorProfileId ?? null,
        donationStatus: relatedDonation?.donationStatus ?? null,
      };
    });

    return {
      transactions,
      total: filteredSummary.total,
      summary: filteredSummary.summary,
      overall: {
        total: overall.total,
        summary: overall.summary,
      },
    };
  }
}
