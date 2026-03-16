import { Service } from "typedi";
import { clientShared } from "../../loaders/postgresShared";
import { Transaction } from "../../domain/Transaction";
import { TransactionMap } from "../../mappers/TransactionMapper";
import { ITransactionsRepo } from "./ITransactionsRepo";
import Logger from "../../loaders/logger";

@Service()
export default class TransactionsRepo implements ITransactionsRepo {
  private table = `"Transaction"`;

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

    Logger.info({ accountId: accountId }, "Retrieved All Transactions.");

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
        "txHash",
        "token",
        "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
      raw.txHash,
      raw.token,
      raw.createdAt,
    ];

    await clientShared.query(query, values);
    Logger.info({ transactionId: raw.transactionId, txHash: raw.txHash }, "Inserted New Transaction.");

    return transaction;
  }
}
