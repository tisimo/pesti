import { Withdrawal } from "domain/Withdrawal";

export interface IWithdrawalRepo {
    getAllWithdrawals(accountId: string, page: number): Promise<Withdrawal[]>;
    getWithdrawalById(withdrawalId: string): Promise<Withdrawal | null>;
    createWithdrawal(withdrawal: Withdrawal): Promise<Withdrawal>;
    updateWithdrawalStatus(withdrawalId: string, status: string): Promise<void>;
}