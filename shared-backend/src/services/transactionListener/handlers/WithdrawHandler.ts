import { TransactionType } from "../../../utils/blockchain/eventDataSchema";
import type { ParsedTransaction, TransactionHandler } from "../types";
import type IWithdrawalService from "../../IServices/IWithdrawalService";
import Logger from "../../../loaders/logger";

export class WithdrawHandler implements TransactionHandler {
  readonly transactionType = TransactionType.Withdraw;

  constructor(private readonly withdrawalService: IWithdrawalService) {}

  async handle(event: ParsedTransaction): Promise<void> {
    Logger.info(
      { transactionHash: event.transactionHash, sender: event.sender },
      "Confirming withdrawal via on-chain event",
    );

    const result = await this.withdrawalService.confirmWithdrawal(event.sender, event.transactionHash);

    if (result.isFailure) {
      Logger.error(
        { transactionHash: event.transactionHash, sender: event.sender, error: result.error },
        "Failed to confirm withdrawal",
      );
      return;
    }

    Logger.info(
      { transactionHash: event.transactionHash, sender: event.sender },
      "Withdrawal confirmed successfully",
    );
  }
}
