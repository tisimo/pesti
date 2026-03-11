import { Deposit } from "domain/Deposit";

export interface IDepositRepo {
    getDepositById(depositId: string): Promise<Deposit | null>;
    createDeposit(deposit: Deposit): Promise<Deposit>;
    updateDepositStatus(depositId: string, status: string): Promise<void>;
}  