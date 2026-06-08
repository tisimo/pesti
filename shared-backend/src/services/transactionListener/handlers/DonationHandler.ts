import { TransactionType } from "../../../utils/blockchain/eventDataSchema";
import type { ParsedTransaction, TransactionHandler } from "../types";
import type { InternalApiClient } from "../InternalApiClient";
import type IWalletsService from "../../IServices/IWalletsService";
import Logger from "../../../loaders/logger";

export class DonationHandler implements TransactionHandler {
  readonly transactionType = TransactionType.DonateJC;

  constructor(
    private readonly apiClient: InternalApiClient,
    private readonly walletsService: IWalletsService,
  ) {}

  async handle(event: ParsedTransaction): Promise<void> {
    const { donationId } = event.decodedData;

    if (!donationId) {
      Logger.warn(
        { transactionHash: event.transactionHash },
        "Donation event missing donationId in data — skipping",
      );
      return;
    }

    let recipientAccountId: string | null = null;
    try {
      const walletResult = await this.walletsService.getWalletByAddress(event.recipient);
      if (walletResult.isSuccess) {
        recipientAccountId = walletResult.getValue().accountId;
      }
    } catch (error) {
      Logger.warn(
        { err: error, recipient: event.recipient },
        "Failed to resolve recipient wallet — continuing without accountId",
      );
    }

    const payload = {
      donationId,
      transactionHash: event.transactionHash,
      senderAddress: event.sender,
      recipientAddress: event.recipient,
      recipientAccountId,
      onChainAmountRaw: event.amount,
      commission: event.commission,
      token: event.token,
    };

    Logger.info(
      { donationId, transactionHash: event.transactionHash },
      "Confirming donation with OJC-backend",
    );

    await this.apiClient.post("/internal/donations/confirm", payload);

    Logger.info(
      { donationId, transactionHash: event.transactionHash },
      "Donation confirmation sent successfully",
    );
  }
}
