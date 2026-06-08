import { Router, Request, Response } from "express";
import { Container } from "typedi";
import { DepositMap } from "../../mappers/DepositMapper";
import type { IDepositRepo } from "../../repos/Deposits/IDepositRepo";
import type { IWalletsRepo } from "../../repos/Wallets/IWalletsRepo";
import Logger from "../../loaders/logger";
import config from "../../../config.js";

const route = Router();

interface AlchemyActivity {
  fromAddress: string;
  toAddress: string;
  hash: string;
  value: number;
  asset: string;
  category: string;
  rawContract?: { address?: string; decimals?: number };
}

interface AlchemyWebhookPayload {
  type: string;
  event: {
    network: string;
    activity: AlchemyActivity[];
  };
}

export default (app: Router) => {
  app.use("/webhooks", route);

  route.post("/alchemy", async (req: Request, res: Response) => {
    const payload = req.body as AlchemyWebhookPayload;

    if (payload.type !== "ADDRESS_ACTIVITY") {
      return res.status(200).json({ ok: true });
    }

    const depositRepo = Container.get(config.repos.deposit.name) as IDepositRepo;
    const walletsRepo = Container.get(config.repos.wallets.name) as IWalletsRepo;

    for (const activity of payload.event?.activity ?? []) {
      if (activity.category !== "token" || activity.asset !== "USDC" || !activity.toAddress) {
        continue;
      }

      try {
        const existing = await depositRepo.findDepositByTxHash(activity.hash);
        if (existing) continue;

        const amount = activity.value ?? 0;
        if (amount <= 0) continue;

        // Skip if sender is a registered wallet — it's a donation/tip, not an external deposit
        const senderWallet = await walletsRepo.getWalletByAddress(activity.fromAddress);
        if (senderWallet) continue;

        const wallet = await walletsRepo.getWalletByAddress(activity.toAddress);
        if (!wallet) continue;

        const pendingOnramp = await depositRepo.findPendingDepositByWallet(wallet.walletAddress);

        if (pendingOnramp) {
          // Onramp in progress — complete the existing pending deposit instead of creating a duplicate
          await depositRepo.completeDepositOnChain(
            pendingOnramp.depositId.toString(),
            activity.hash,
            amount,
          );
          Logger.info(
            { txHash: activity.hash, depositId: pendingOnramp.depositId.toString(), amount },
            "Pending onramp deposit completed on-chain via webhook",
          );
        } else {
          // Direct on-chain transfer — create new deposit
          const deposit = DepositMap.toDomain({
            depositId: crypto.randomUUID(),
            walletAddress: wallet.walletAddress,
            amount,
            amountFiat: amount,
            currency: "USD",
            provider: "OnChain",
            method: "USDC",
            application: "OnlyJustCauses",
            txHash: activity.hash,
            status: "COMPLETED",
            createdAt: new Date().toISOString(),
          });

          await depositRepo.createDeposit(deposit);
          Logger.info(
            { txHash: activity.hash, to: activity.toAddress, amount },
            "On-chain USDC deposit recorded via webhook",
          );
        }
      } catch (error) {
        Logger.error({ err: error, txHash: activity.hash }, "Error processing Alchemy webhook activity");
      }
    }

    return res.status(200).json({ ok: true });
  });
};
