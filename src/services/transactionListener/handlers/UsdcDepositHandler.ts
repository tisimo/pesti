import { ethers } from "ethers";
import type { IDepositRepo } from "../../../repos/Deposits/IDepositRepo";
import type { IWalletsRepo } from "../../../repos/Wallets/IWalletsRepo";
import { DepositMap } from "../../../mappers/DepositMapper";
import Logger from "../../../loaders/logger";
import crypto from "crypto";

const ERC20_TRANSFER_ABI = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
const USDC_DECIMALS = 6;

export function buildUsdcTransferTopic(): string {
  const iface = new ethers.Interface(ERC20_TRANSFER_ABI);
  return iface.getEvent("Transfer")!.topicHash;
}

export function createUsdcDepositHandler(
  depositRepo: IDepositRepo,
  walletsRepo: IWalletsRepo,
) {
  const iface = new ethers.Interface(ERC20_TRANSFER_ABI);

  return async (log: ethers.Log): Promise<void> => {
    try {
      const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (!parsed) return;

      const to: string = parsed.args.to;
      const value: bigint = parsed.args.value;
      const amount = Number(value) / Math.pow(10, USDC_DECIMALS);

      if (amount <= 0) return;

      const wallet = await walletsRepo.getWalletByAddress(to);
      if (!wallet) return;

      const existing = await depositRepo.findDepositByTxHash(log.transactionHash);
      if (existing) return;

      const from: string = parsed.args.from;

      const deposit = DepositMap.toDomain({
        depositId: crypto.randomUUID(),
        walletAddress: to,
        amount,
        amountFiat: amount,
        currency: "USD",
        provider: "OnChain",
        method: "USDC",
        application: "OnlyJustCauses",
        txHash: log.transactionHash,
        status: "COMPLETED",
        createdAt: new Date().toISOString(),
      });

      await depositRepo.createDeposit(deposit);

      Logger.info(
        { txHash: log.transactionHash, to, from, amount },
        "On-chain USDC deposit recorded",
      );
    } catch (error) {
      Logger.error(
        { err: error, txHash: log?.transactionHash },
        "Error handling USDC Transfer event",
      );
    }
  };
}
