import { Transaction } from "domain/Transaction";

export interface ITransactionsRepo {
  getTransactionById(transactionId: string): Promise<Transaction | null>;
  createTransaction(transaction: Transaction): Promise<Transaction>;
}
