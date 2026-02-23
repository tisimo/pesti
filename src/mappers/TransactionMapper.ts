import { Mapper } from "../core/infra/Mapper";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { Transaction } from "../domain/Transaction";
import { TransactionDTO } from "../dto/TransactionDTO";
import { TransactionPersistence } from "../dataschema/TransactionPersistence";

export class TransactionMap extends Mapper<Transaction> {
  /**
   * DOMAIN -> DTO
   */
  public static toDTO(transaction: Transaction): TransactionDTO {
    return {
      transactionId: transaction.transactionId.toString(),
      senderAddress: transaction.senderAddress,
      receiverAddress: transaction.receiverAddress,
      type: String(transaction.type),
      amount: transaction.amount,
      fiatAmount: transaction.fiatAmount,
      currency: transaction.currency,
      commission: transaction.commission,
      rate: transaction.rate,
      txHash: transaction.txHash,
      token: transaction.token,
      createdAt: transaction.createdAt.toISOString(),
    };
  }

  /**
   * DTO -> DOMAIN
   */
  public static toDomain(transactionDTO: TransactionDTO): Transaction {
    const transactionOrError = Transaction.create(
      {
        senderAddress: transactionDTO.senderAddress,
        receiverAddress: transactionDTO.receiverAddress,
        type: Number(transactionDTO.type),
        amount: transactionDTO.amount,
        fiatAmount: transactionDTO.fiatAmount,
        currency: transactionDTO.currency,
        commission: transactionDTO.commission,
        rate: transactionDTO.rate,
        txHash: transactionDTO.txHash,
        token: transactionDTO.token,
        createdAt: new Date(transactionDTO.createdAt),
      },
      new UniqueEntityID(transactionDTO.transactionId),
    );

    if (transactionOrError.isFailure) {
      throw new Error(`TransactionMap.toDomain Failed: ${transactionOrError.error}`);
    }

    return transactionOrError.getValue();
  }

  /**
   * DOMAIN -> PERSISTENCE
   */
  public static toPersistence(transaction: Transaction): TransactionPersistence {
    return {
      transactionId: transaction.transactionId.toString(),
      senderAddress: transaction.senderAddress,
      receiverAddress: transaction.receiverAddress,
      type: transaction.type,
      amount: transaction.amount,
      fiatAmount: transaction.fiatAmount,
      currency: transaction.currency,
      commission: transaction.commission,
      rate: transaction.rate,
      txHash: transaction.txHash,
      token: transaction.token,
      createdAt: transaction.createdAt,
    };
  }

  /**
   * PERSISTENCE -> DOMAIN
   */
  public static fromPersistence(raw: TransactionPersistence): Transaction {
    const transactionOrError = Transaction.create(
      {
        senderAddress: raw.senderAddress,
        receiverAddress: raw.receiverAddress,
        type: raw.type,
        amount: raw.amount,
        fiatAmount: raw.fiatAmount,
        currency: raw.currency,
        commission: raw.commission,
        rate: raw.rate,
        txHash: raw.txHash,
        token: raw.token,
        createdAt: raw.createdAt,
      },
      new UniqueEntityID(raw.transactionId),
    );

    if (transactionOrError.isFailure) {
      throw new Error(`TransactionMap.fromPersistence Failed: ${transactionOrError.error}`);
    }

    return transactionOrError.getValue();
  }
}
