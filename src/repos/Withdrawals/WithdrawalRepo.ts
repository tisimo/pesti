import { Service } from "typedi";
import { clientShared } from "../../loaders/postgresShared";
import { Withdrawal } from "../../domain/Withdrawal";
import { WithdrawalMap } from "../../mappers/WithdrawalMapper";
import { IWithdrawalRepo } from "./IWithdrawalRepo";
import Logger from "../../loaders/logger";

@Service()
export default class WithdrawalRepo implements IWithdrawalRepo {
    private table = `"Withdrawal"`;

    public async getAllWithdrawals(accountId: string, page: number): Promise<Withdrawal[]> {
        const offset = (page - 1) * 50;
        const query = `
        SELECT w.*
        FROM ${this.table} w
        JOIN "Wallet" wa ON wa."walletAddress" = w."walletAddress"
        WHERE wa."accountId" = $1
        ORDER BY w."createdAt" DESC
        LIMIT 50 OFFSET $2
    `;

    const result = await clientShared.query(query, [accountId, offset]);
    if (!result.rowCount) return [];

    Logger.info({ accountId }, "Retrieved All Withdrawals.");

    return result.rows.map(row => WithdrawalMap.fromPersistence(row));
    }

    public async getWithdrawalById(withdrawalId: string): Promise<Withdrawal | null> {
        throw new Error("Method not implemented.");
    }

    public async createWithdrawal(withdrawal: Withdrawal): Promise<Withdrawal> {
        throw new Error("Method not implemented.");
    }

    public async updateWithdrawalStatus(withdrawalId: string, status: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
    