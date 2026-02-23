import { TransactionType } from "../../../utils/blockchain/eventDataSchema";
import type { ParsedTransaction, TransactionHandler } from "../types";
import type { InternalApiClient } from "../InternalApiClient";
import Logger from "../../../loaders/logger";

export class TipHandler implements TransactionHandler {
  readonly transactionType = TransactionType.TipJC;

  constructor(private readonly apiClient: InternalApiClient) {}

  async handle(event: ParsedTransaction): Promise<void> {
    const { tipId } = event.decodedData;

    if (!tipId) {
      Logger.warn(
        { transactionHash: event.transactionHash },
        "Tip event missing tipId in data — skipping",
      );
      return;
    }

    const payload = {
      tipId,
      transactionHash: event.transactionHash,
      onChainAmountRaw: event.amount,
      commission: event.commission,
    };

    Logger.info(
      { tipId, transactionHash: event.transactionHash },
      "Confirming tip with OJC-backend",
    );

    await this.apiClient.post("/internal/tips/confirm", payload);

    Logger.info(
      { tipId, transactionHash: event.transactionHash },
      "Tip confirmation sent successfully",
    );
  }
}
