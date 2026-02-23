import { Service } from "typedi";
import { clientShared } from "../../loaders/postgresShared";
import { Transaction } from "../../domain/Transaction";
import { TransactionMap } from "../../mappers/TransactionMapper";
import { ITransactionsRepo } from "./ITransactionsRepo";
import Logger from "../../loaders/logger";

@Service()
export default class TransactionsRepo implements ITransactionsRepo {
  private table = `"Transaction"`;

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
