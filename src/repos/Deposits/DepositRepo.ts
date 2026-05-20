import { Service } from "typedi";
import { clientShared } from "../../loaders/postgresShared";
import { Deposit } from "../../domain/Deposit";
import { DepositMap } from "../../mappers/DepositMapper";
import { IDepositRepo } from "./IDepositRepo";
import Logger from "../../loaders/logger";

@Service()
export default class DepositRepo implements IDepositRepo {
  private table = `"Deposits"`;

  public async getAllDeposits(accountId: string, page: number): Promise<Deposit[]> {
    const offset = (page - 1) * 50;
    const query = `
      SELECT d.*
      FROM ${this.table} d
      JOIN "Wallet" w ON LOWER(w."walletAddress") = LOWER(d."walletAddress")
      WHERE w."accountId" = $1
      AND d."status" = 'COMPLETED'
      ORDER BY d."createdAt" DESC
      LIMIT 50 OFFSET $2
    `;

    const result = await clientShared.query(query, [accountId, offset]);
    if (!result.rowCount) return [];

    Logger.info("Retrieved All Deposits.");

    return result.rows.map(row => DepositMap.fromPersistence(row));
  }

  public async findDepositByTxHash(txHash: string): Promise<Deposit | null> {
    const query = `
      SELECT *
        FROM ${this.table}
        WHERE "txHash" = $1
        LIMIT 1
    `;

    const result = await clientShared.query(query, [txHash]);
    if (!result.rowCount) return null;

    return DepositMap.fromPersistence(result.rows[0]);
  }

  public async getDepositById(depositId: string): Promise<Deposit | null> {
    const query = `
      SELECT *
        FROM ${this.table}
        WHERE "depositId" = $1
        LIMIT 1
    `;

    const result = await clientShared.query(query, [depositId]);
    if (!result.rowCount) return null;

    return DepositMap.fromPersistence(result.rows[0]);
  }

  public async createDeposit(deposit: Deposit): Promise<Deposit> {
    const raw = DepositMap.toPersistence(deposit);

    const query = `
        INSERT INTO ${this.table} (
            "depositId",
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
        ON CONFLICT ("depositId") DO NOTHING
    `;

    const values = [
      raw.depositId,
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
    Logger.info({ depositId: deposit.depositId.toString() }, "Deposit created in DB");
    return deposit;
  }

  public async updateDepositStatus(depositId: string, status: string, amount?: number): Promise<void> {
    const query = amount != null
      ? `UPDATE ${this.table} SET "status" = $1, "amount" = $2 WHERE "depositId" = $3`
      : `UPDATE ${this.table} SET "status" = $1 WHERE "depositId" = $2`;

    const values = amount != null ? [status, amount, depositId] : [status, depositId];

    await clientShared.query(query, values);
    Logger.info({ depositId, status, amount }, "Deposit status updated in DB");
  }
}
