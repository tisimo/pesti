import { Withdrawal } from "domain/Withdrawal";

export interface IWithdrawalRepo {
    getAllWithdrawals(accountId: string, page: number): Promise<Withdrawal[]>;
    getWithdrawalById(withdrawalId: string): Promise<Withdrawal | null>;
    createWithdrawal(withdrawal: Withdrawal): Promise<Withdrawal>;
    getLatestPendingWithdrawal(walletAddress: string): Promise<Withdrawal | null>;
    updateWithdrawalStatus(withdrawalId: string, status: string, txHash?: string | null): Promise<void>;
}