import { Router, Request, Response } from "express";
import { Container } from "typedi";
import crypto from "crypto";
import { DepositMap } from "../../mappers/DepositMapper";
import type { IDepositRepo } from "../../repos/Deposits/IDepositRepo";
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
    // Verify Alchemy signature
    const signingKey = config.alchemy.webhookSigningKey;
    if (signingKey) {
      const signature = req.headers["x-alchemy-signature"] as string;
      const rawBody = (req as any).rawBody as Buffer;

      if (!rawBody || !signature) {
        return res.status(401).json({ error: "Missing signature" });
      }

      const hmac = crypto.createHmac("sha256", signingKey).update(rawBody).digest("hex");
      if (hmac !== signature) {
        Logger.warn("Alchemy webhook signature mismatch — request rejected");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const payload = req.body as AlchemyWebhookPayload;

    if (payload.type !== "ADDRESS_ACTIVITY") {
      return res.status(200).json({ ok: true });
    }

    const depositRepo = Container.get(config.repos.deposit.name) as IDepositRepo;

    for (const activity of payload.event?.activity ?? []) {
      if (activity.category !== "token" || activity.asset !== "USDC" || !activity.toAddress) {
        continue;
      }

      try {
        const existing = await depositRepo.findDepositByTxHash(activity.hash);
        if (existing) continue;

        const amount = activity.value ?? 0;
        if (amount <= 0) continue;

        const deposit = DepositMap.toDomain({
          depositId: crypto.randomUUID(),
          walletAddress: activity.toAddress,
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
          { txHash: activity.hash, to: activity.toAddress, from: activity.fromAddress, amount },
          "On-chain USDC deposit recorded via webhook",
        );
      } catch (error) {
        Logger.error({ err: error, txHash: activity.hash }, "Error processing Alchemy webhook activity");
      }
    }

    return res.status(200).json({ ok: true });
  });
};
