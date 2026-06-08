import type { Result } from "core/logic/Result";
import type { TransactionDTO } from "dto/TransactionDTO";

export default interface ITransactionsService {
  getAllTransactions(accountId: string, page: number): Promise<Result<TransactionDTO[]>>;
  getTransactionById(transactionId: string): Promise<Result<TransactionDTO>>;
  createTransaction(transactionDTO: TransactionDTO): Promise<Result<TransactionDTO>>;
}
