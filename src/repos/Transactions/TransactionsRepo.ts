import { Service } from "typedi";
import { clientShared } from "../../loaders/postgresShared";
import { Transaction } from "../../domain/Transaction";
import { TransactionMap } from "../../mappers/TransactionMapper";
import { ITransactionsRepo } from "./ITransactionsRepo";
import Logger from "../../loaders/logger";

@Service()
export default class TransactionsRepo implements ITransactionsRepo {
  private table = `"Transaction"`;
  private hasAmountBreakdownColumns = false;
  private ensureColumnsPromise: Promise<void> | null = null;

  private async ensureAmountBreakdownColumns(): Promise<void> {
    if (this.hasAmountBreakdownColumns) return;

    if (!this.ensureColumnsPromise) {
      this.ensureColumnsPromise = (async () => {
        const addColumnsQuery = `
          ALTER TABLE ${this.table}
          ADD COLUMN IF NOT EXISTS "donationAmount" NUMERIC(28, 18) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS "tipAmount" NUMERIC(28, 18) NOT NULL DEFAULT 0
        `;

        const backfillQuery = `
          UPDATE ${this.table}
          SET
            "donationAmount" = CASE
              WHEN "type" = 0 THEN "amount"
              ELSE "donationAmount"
            END,
            "tipAmount" = CASE
              WHEN "type" = 1 THEN "amount"
              ELSE "tipAmount"
            END
          WHERE ("type" = 0 AND "donationAmount" = 0)
             OR ("type" = 1 AND "tipAmount" = 0)
        `;

        await clientShared.query(addColumnsQuery);
        await clientShared.query(backfillQuery);
        this.hasAmountBreakdownColumns = true;

        Logger.info("Transaction amount breakdown columns are ready.");
      })().catch((error) => {
        this.ensureColumnsPromise = null;
        throw error;
      });
    }

    await this.ensureColumnsPromise;
  }

  public async getAllTransactions(accountId: string, page: number): Promise<Transaction[]> {
    const offset = (page - 1) * 50;
    const query = `
      SELECT t.*
      FROM ${this.table} t
      JOIN "Wallet" w ON w."accountId" = $1
      WHERE t."senderAddress" = w."walletAddress"
         OR t."receiverAddress" = w."walletAddress"
      ORDER BY t."createdAt" DESC
      LIMIT 50 OFFSET $2
    `;

    const result = await clientShared.query(query, [accountId, offset]);
    if (!result.rowCount) return [];

    Logger.info("Retrieved All Transactions.");

    return result.rows.map(row => TransactionMap.fromPersistence(row));
  }

  public async getTransactionById(transactionId: string): Promise<Transaction | null> {
    const query = `
      SELECT *
      FROM ${this.table}
      WHERE "transactionId" = $1
      LIMIT 1
    `;

    const result = await clientShared.query(query, [transactionId]);
    if (!result.rowCount) return null;

    return TransactionMap.fromPersistence(result.rows[0]);
  }

  public async createTransaction(transaction: Transaction): Promise<Transaction> {
    await this.ensureAmountBreakdownColumns();

    const raw = TransactionMap.toPersistence(transaction);

    const query = `
      INSERT INTO ${this.table} (
        "transactionId",
        "senderAddress",
        "receiverAddress",
        "type",
        "amount",
        "fiatAmount",
        "currency",
        "commission",
        "rate",
        "donationAmount",
        "tipAmount",
        "txHash",
        "token",
        "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT ("txHash") DO UPDATE
      SET
        "senderAddress" = CASE
          WHEN EXCLUDED."type" = 1 AND ${this.table}."type" = 0 THEN ${this.table}."senderAddress"
          ELSE EXCLUDED."senderAddress"
        END,
        "receiverAddress" = CASE
          WHEN EXCLUDED."type" = 1 AND ${this.table}."type" = 0 THEN ${this.table}."receiverAddress"
          ELSE EXCLUDED."receiverAddress"
        END,
        "donationAmount" = CASE
          WHEN EXCLUDED."type" = 0 THEN EXCLUDED."donationAmount"
          ELSE ${this.table}."donationAmount"
        END,
        "tipAmount" = CASE
          WHEN EXCLUDED."type" = 1 THEN EXCLUDED."tipAmount"
          ELSE ${this.table}."tipAmount"
        END,
        "amount" = CASE
          WHEN EXCLUDED."type" IN (0, 1) OR ${this.table}."type" IN (0, 1)
            THEN
              (CASE
                WHEN EXCLUDED."type" = 0 THEN EXCLUDED."donationAmount"
                ELSE ${this.table}."donationAmount"
              END)
              +
              (CASE
                WHEN EXCLUDED."type" = 1 THEN EXCLUDED."tipAmount"
                ELSE ${this.table}."tipAmount"
              END)
          ELSE EXCLUDED."amount"
        END,
        "fiatAmount" = CASE
          WHEN EXCLUDED."type" IN (0, 1) OR ${this.table}."type" IN (0, 1)
            THEN
              (CASE
                WHEN EXCLUDED."type" = 0 THEN EXCLUDED."donationAmount"
                ELSE ${this.table}."donationAmount"
              END)
              +
              (CASE
                WHEN EXCLUDED."type" = 1 THEN EXCLUDED."tipAmount"
                ELSE ${this.table}."tipAmount"
              END)
          ELSE EXCLUDED."fiatAmount"
        END,
        "type" = CASE
          WHEN EXCLUDED."type" IN (2, 3) THEN EXCLUDED."type"
          WHEN (
            CASE
              WHEN EXCLUDED."type" = 0 THEN EXCLUDED."donationAmount"
              ELSE ${this.table}."donationAmount"
            END
          ) > 0 THEN 0
          WHEN (
            CASE
              WHEN EXCLUDED."type" = 1 THEN EXCLUDED."tipAmount"
              ELSE ${this.table}."tipAmount"
            END
          ) > 0 THEN 1
          ELSE EXCLUDED."type"
        END,
        "currency" = CASE
          WHEN EXCLUDED."type" = 1 AND ${this.table}."type" = 0 THEN ${this.table}."currency"
          ELSE EXCLUDED."currency"
        END,
        "commission" = CASE
          WHEN EXCLUDED."type" = 1 AND ${this.table}."type" = 0 THEN ${this.table}."commission"
          ELSE EXCLUDED."commission"
        END,
        "rate" = CASE
          WHEN EXCLUDED."type" = 1 AND ${this.table}."type" = 0 THEN ${this.table}."rate"
          ELSE EXCLUDED."rate"
        END,
        "token" = CASE
          WHEN EXCLUDED."type" = 1 AND ${this.table}."type" = 0 THEN ${this.table}."token"
          ELSE EXCLUDED."token"
        END,
        "createdAt" = CASE
          WHEN EXCLUDED."type" = 1 AND ${this.table}."type" = 0 THEN ${this.table}."createdAt"
          ELSE EXCLUDED."createdAt"
        END
        RETURNING *
    `;

    const values = [
      raw.transactionId,
      raw.senderAddress,
      raw.receiverAddress,
      raw.type,
      raw.amount,
      raw.fiatAmount,
      raw.currency,
      raw.commission,
      raw.rate,
      raw.type === 0 ? raw.amount : 0,
      raw.type === 1 ? raw.amount : 0,
      raw.txHash,
      raw.token,
      raw.createdAt,
    ];

    const result = await clientShared.query(query, values);

    Logger.info({ transactionId: raw.transactionId, txHash: raw.txHash }, "Inserted or Updated Transaction.");

    return transaction;
  }
}
