import { Service } from "typedi";
import { clientShared } from "../../loaders/postgresShared";
import { Transaction } from "../../domain/Transaction";
import { ITransactionsRepo } from "./ITransactionsRepo";

@Service()
export default class TransactionsRepo implements ITransactionsRepo {
  private table = `"Transactions"`;

  public async getTransactionById(transactionId: string): Promise<Transaction | null> {
    throw new Error("Not implemented");
  }

  public async createTransaction(transaction: Transaction): Promise<Transaction> {
    throw new Error("Not implemented");
  }
}
