import { Container } from "typedi";
import { UsdcDepositListener } from "../services/usdcDepositListener/UsdcDepositListener";
import type { IDepositRepo } from "../repos/Deposits/IDepositRepo";
import type { IWalletsRepo } from "../repos/Wallets/IWalletsRepo";
import Logger from "./logger";
import config from "../../config";

const ALCHEMY_WS_URLS: Record<string, string> = {
  "base-mainnet": "wss://base-mainnet.g.alchemy.com/v2",
  "base-sepolia": "wss://base-sepolia.g.alchemy.com/v2",
};

export async function startUsdcDepositListener(): Promise<void> {
  if (!config.alchemy.apiKey || !config.usdc.address) {
    Logger.warn("USDC Deposit Listener not started — missing ALCHEMY_API_KEY or USDC_CONTRACT_ADDRESS");
    return;
  }

  const baseWs = ALCHEMY_WS_URLS[config.alchemy.network];
  if (!baseWs) {
    Logger.warn({ network: config.alchemy.network }, "USDC Deposit Listener not started — unsupported network");
    return;
  }

  try {
    const depositRepo = Container.get(config.repos.deposit.name) as IDepositRepo;
    const walletsRepo = Container.get(config.repos.wallets.name) as IWalletsRepo;

    const listener = new UsdcDepositListener(
      {
        wsUrl: `${baseWs}/${config.alchemy.apiKey}`,
        usdcAddress: config.usdc.address,
      },
      depositRepo,
      walletsRepo,
    );

    await listener.start();
    Logger.info("USDC Deposit Listener started");
  } catch (error) {
    Logger.error({ err: error }, "Failed to start USDC Deposit Listener");
  }
}
