import { Inject, Service } from "typedi";
import { Result } from "../core/logic/Result";
import { TransactionDTO } from "../dto/TransactionDTO";
import ITransactionsService from "./IServices/ITransactionsService";
import { ITransactionsRepo } from "../repos/Transactions/ITransactionsRepo";
import TransactionsRepo from "../repos/Transactions/TransactionsRepo";
import { TransactionMap } from "../mappers/TransactionMapper";
import { IWalletsRepo } from "../repos/Wallets/IWalletsRepo";
import WalletsRepo from "../repos/Wallets/WalletsRepo";

@Service()
export default class TransactionsService implements ITransactionsService {
  constructor(
    @Inject(() => TransactionsRepo) private transactionRepo: ITransactionsRepo,
    @Inject(() => WalletsRepo) private walletsRepo: IWalletsRepo,
  ) {}

  public async getTransactionById(transactionId: string): Promise<Result<TransactionDTO>> {
    try {
      const transaction = await this.transactionRepo.getTransactionById(transactionId);

      if (!transaction) {
        return Result.fail<TransactionDTO>("Transaction Not Found!");
      }

      return Result.ok<TransactionDTO>(TransactionMap.toDTO(transaction));
    } catch (error) {
      return Result.fail<TransactionDTO>(error?.message ?? "Error Getting Transaction By TransactionID!");
    }
  }

  public async createTransaction(transactionDTO: TransactionDTO): Promise<Result<TransactionDTO>> {
    try {
      const senderWallet = await this.walletsRepo.getWalletByAddress(transactionDTO.senderAddress);
      const receiverWallet = await this.walletsRepo.getWalletByAddress(transactionDTO.receiverAddress);

      if (!senderWallet && !receiverWallet) {
        return Result.fail<TransactionDTO>("Both Wallets Not Found!");
      }

      const transaction = TransactionMap.toDomain(transactionDTO);

      const saved = await this.transactionRepo.createTransaction(transaction);

      return Result.ok<TransactionDTO>(TransactionMap.toDTO(saved));
    } catch (error) {
      return Result.fail<TransactionDTO>(error?.message ?? "Error Creating Transaction!");
    }
  }
}
