import { ethers } from "ethers";
import { ReconnectManager } from "../../utils/ReconnectManager";
import type { ReconnectableResource } from "../../utils/ReconnectManager";
import type { IDepositRepo } from "../../repos/Deposits/IDepositRepo";
import type { IWalletsRepo } from "../../repos/Wallets/IWalletsRepo";
import { DepositMap } from "../../mappers/DepositMapper";
import Logger from "../../loaders/logger";
import crypto from "crypto";

const ERC20_TRANSFER_ABI = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
const USDC_DECIMALS = 6;

export interface UsdcListenerConfig {
  wsUrl: string;
  usdcAddress: string;
}

export class UsdcDepositListener implements ReconnectableResource<ethers.WebSocketProvider> {
  private readonly reconnectManager: ReconnectManager<ethers.WebSocketProvider>;

  constructor(
    private readonly config: UsdcListenerConfig,
    private readonly depositRepo: IDepositRepo,
    private readonly walletsRepo: IWalletsRepo,
  ) {
    this.reconnectManager = new ReconnectManager<ethers.WebSocketProvider>(this, {
      label: "UsdcDepositListener",
    });
  }

  async start(): Promise<void> {
    if (this.reconnectManager.isRunning()) return;
    Logger.info({ usdcAddress: this.config.usdcAddress }, "Starting USDC deposit listener");
    await this.reconnectManager.start();
  }

  stop(): void {
    this.reconnectManager.stop();
    Logger.info("USDC deposit listener stopped");
  }

  async connect(): Promise<ethers.WebSocketProvider> {
    const iface = new ethers.Interface(ERC20_TRANSFER_ABI);
    const provider = new ethers.WebSocketProvider(this.config.wsUrl);

    provider.on("error", (error: Error) => {
      Logger.error({ err: error }, "USDC listener WebSocket error");
      this.reconnectManager.reconnect();
    });

    (provider.websocket as any).on("close", (code: number) => {
      Logger.warn({ code }, "USDC listener WebSocket closed, reconnecting");
      this.reconnectManager.reconnect();
    });

    const filter = {
      address: this.config.usdcAddress,
      topics: [iface.getEvent("Transfer")!.topicHash],
    };

    provider.on(filter, (log: ethers.Log) => this.handleTransfer(log, iface));

    Logger.info({ usdcAddress: this.config.usdcAddress }, "Subscribed to USDC Transfer events");
    return provider;
  }

  cleanup(provider: ethers.WebSocketProvider): void {
    provider.removeAllListeners();
    provider.destroy();
  }

  private async handleTransfer(log: ethers.Log, iface: ethers.Interface): Promise<void> {
    try {
      const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (!parsed) return;

      const to: string = parsed.args.to;
      const value: bigint = parsed.args.value;
      const amount = Number(value) / Math.pow(10, USDC_DECIMALS);

      if (amount <= 0) return;

      const wallet = await this.walletsRepo.getWalletByAddress(to);
      if (!wallet) return;

      const existing = await this.depositRepo.findDepositByTxHash(log.transactionHash);
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

      await this.depositRepo.createDeposit(deposit);

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
  }
}
