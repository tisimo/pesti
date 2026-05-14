import { Service } from "typedi";
import { clientShared } from "../../loaders/postgresShared";
import { Withdrawal } from "../../domain/Withdrawal";
import { WithdrawalMap } from "../../mappers/WithdrawalMapper";
import { IWithdrawalRepo } from "./IWithdrawalRepo";
import Logger from "../../loaders/logger";

@Service()
export default class WithdrawalRepo implements IWithdrawalRepo {
  private table = `"Withdrawals"`;

  public async getAllWithdrawals(accountId: string, page: number): Promise<Withdrawal[]> {
    const offset = (page - 1) * 50;
    const query = `
        SELECT w.*
        FROM ${this.table} w
        JOIN "Wallet" wa ON wa."walletAddress" = w."walletAddress"
        WHERE wa."accountId" = $1
        AND w."status" = 'COMPLETED'
        ORDER BY w."createdAt" DESC
        LIMIT 50 OFFSET $2
    `;

    const result = await clientShared.query(query, [accountId, offset]);
    if (!result.rowCount) return [];

    Logger.info("Retrieved All Withdrawals.");

    return result.rows.map(row => WithdrawalMap.fromPersistence(row));
  }

  public async getWithdrawalById(withdrawalId: string): Promise<Withdrawal | null> {
    const query = `
      SELECT *
      FROM ${this.table}
      WHERE "withdrawalId" = $1
      LIMIT 1
    `;

    const result = await clientShared.query(query, [withdrawalId]);
    if (!result.rowCount) return null;

    return WithdrawalMap.fromPersistence(result.rows[0]);
  }

  public async createWithdrawal(withdrawal: Withdrawal): Promise<Withdrawal> {
    const raw = WithdrawalMap.toPersistence(withdrawal);

    const query = `
      INSERT INTO ${this.table} (
        "withdrawalId",
        "walletAddress",
        "amount",
        "amountFiat",
        "currency",
        "provider",
        "method",
        "application",
        "txHash",
        "status",
        "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      raw.withdrawalId,
      raw.walletAddress,
      raw.amount,
      raw.amountFiat,
      raw.currency,
      raw.provider,
      raw.method,
      raw.application,
      raw.txHash,
      raw.status,
      raw.createdAt,
    ];

    await clientShared.query(query, values);
    Logger.info({ withdrawalId: withdrawal.withdrawalId.toString() }, "Withdrawal created in DB");
    return withdrawal;
  }

  public async getLatestPendingWithdrawal(walletAddress: string): Promise<Withdrawal | null> {
    const query = `
      SELECT *
      FROM ${this.table}
      WHERE "walletAddress" = $1
      AND "status" = 'PENDING'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    const result = await clientShared.query(query, [walletAddress]);
    if (!result.rowCount) return null;

    return WithdrawalMap.fromPersistence(result.rows[0]);
  }

  public async updateWithdrawalStatus(withdrawalId: string, status: string, txHash?: string | null): Promise<void> {
    const query = txHash
      ? `UPDATE ${this.table} SET "status" = $1, "txHash" = $2 WHERE "withdrawalId" = $3`
      : `UPDATE ${this.table} SET "status" = $1 WHERE "withdrawalId" = $2`;

    const values = txHash ? [status, txHash, withdrawalId] : [status, withdrawalId];

    await clientShared.query(query, values);
    Logger.info({ withdrawalId, status, txHash }, "Withdrawal status updated in DB");
  }
}
