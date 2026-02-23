import type { ParsedTransaction, TransactionHandler } from "./types";
import type ITransactionsService from "../IServices/ITransactionsService";
import type { TransactionDTO } from "../../dto/TransactionDTO";
import { rawToNumber } from "../../utils/TokenUtils";
import Logger from "../../loaders/logger";
import crypto from "crypto";  

function toTransactionDTO(event: ParsedTransaction): TransactionDTO {
  const amount = rawToNumber(event.amount);
  const commission = rawToNumber(event.commission);
  const currency = event.decodedData.currencySymbol || "USD";
  const fiatAmount = event.decodedData.fiatAmount
    ? Number(event.decodedData.fiatAmount)
    : amount;
  const rate = event.decodedData.rate
    ? Number(event.decodedData.rate)
    : 1;

  return {
    transactionId: crypto.randomUUID(),
    senderAddress: event.sender,
    receiverAddress: event.recipient,
    type: String(event.transactionType),
    amount,
    fiatAmount,
    currency,
    commission,
    rate,
    txHash: event.transactionHash,
    token: event.token,
    createdAt: new Date(event.blockTimestamp * 1000).toISOString(),
  };
}

export class TransactionRouter {
  private handlers = new Map<number, TransactionHandler>();

  constructor(private readonly transactionsService?: ITransactionsService) {}

  register(handler: TransactionHandler): void {
    this.handlers.set(handler.transactionType, handler);
    Logger.info(
      { transactionType: handler.transactionType },
      "Registered transaction handler",
    );
  }

  async dispatch(event: ParsedTransaction): Promise<void> {
    const handler = this.handlers.get(event.transactionType);

    if (!handler) {
      Logger.info(
        {
          transactionType: event.transactionType,
          transactionHash: event.transactionHash,
        },
        "No handler registered for transaction type — skipping",
      );
      return;
    }

    try {
      await handler.handle(event);
    } catch (error) {
      Logger.error(
        {
          err: error,
          transactionType: event.transactionType,
          transactionHash: event.transactionHash,
        },
        "Transaction handler failed",
      );
    }

    await this.recordTransaction(event);
  }

  private async recordTransaction(event: ParsedTransaction): Promise<void> {
    if (!this.transactionsService) return;

    try {
      const dto = toTransactionDTO(event);
      const result = await this.transactionsService.createTransaction(dto);

      if (result.isFailure) {
        Logger.warn(
          { transactionHash: event.transactionHash, error: result.error },
          "Failed to record transaction",
        );
        return;
      }

      Logger.info(
        { transactionHash: event.transactionHash, transactionId: dto.transactionId },
        "Transaction recorded in shared DB",
      );
    } catch (error) {
      Logger.error(
        { err: error, transactionHash: event.transactionHash },
        "Error recording transaction",
      );
    }
  }
}
