import { Deposit } from "domain/Deposit";

export interface IDepositRepo {
    getAllDeposits(accountId: string, page: number): Promise<Deposit[]>;
    getDepositById(depositId: string): Promise<Deposit | null>;
    findDepositByTxHash(txHash: string): Promise<Deposit | null>;
    findPendingDepositByWallet(walletAddress: string): Promise<Deposit | null>;
    createDeposit(deposit: Deposit): Promise<Deposit>;
    updateDepositStatus(depositId: string, status: string, amount?: number): Promise<void>;
}