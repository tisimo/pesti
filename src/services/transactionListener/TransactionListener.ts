import { ethers } from "ethers";
import { getEventTopicHash, parseTransactionLog } from "../../utils/blockchain/EventParser";
import { ReconnectManager } from "../../utils/ReconnectManager";
import type { ReconnectableResource } from "../../utils/ReconnectManager";
import { TransactionRouter } from "./TransactionRouter";
import type { ListenerConfig } from "./types";
import Logger from "../../loaders/logger";

const ALCHEMY_WS_URLS: Record<string, string> = {
  "base-mainnet": "wss://base-mainnet.g.alchemy.com/v2",
  "base-sepolia": "wss://base-sepolia.g.alchemy.com/v2",
};

export class TransactionListener implements ReconnectableResource<ethers.WebSocketProvider> {
  private readonly wsUrl: string;
  private readonly contractAddress: string;
  private readonly router: TransactionRouter;
  private readonly reconnectManager: ReconnectManager<ethers.WebSocketProvider>;

  constructor(config: ListenerConfig, router: TransactionRouter) {
    const baseWs = ALCHEMY_WS_URLS[config.alchemyNetwork];
    if (!baseWs) {
      throw new Error(`Unsupported Alchemy network: ${config.alchemyNetwork}`);
    }

    this.wsUrl = `${baseWs}/${config.alchemyApiKey}`;
    this.contractAddress = config.contractAddress;
    this.router = router;
    this.reconnectManager = new ReconnectManager<ethers.WebSocketProvider>(this, {
      label: "TransactionListener",
    });
  }

  async start(): Promise<void> {
    if (this.reconnectManager.isRunning()) return;

    Logger.info(
      { contractAddress: this.contractAddress },
      "Starting transaction listener",
    );

    await this.reconnectManager.start();
  }

  stop(): void {
    this.reconnectManager.stop();
    Logger.info("Transaction listener stopped");
  }

  async connect(): Promise<ethers.WebSocketProvider> {
    const topicHash = getEventTopicHash();
    const provider = new ethers.WebSocketProvider(this.wsUrl);

    provider.on("error", (error: Error) => {
      Logger.error({ err: error }, "WebSocket provider error");
      this.reconnectManager.reconnect();
    });

    const filter = {
      address: this.contractAddress,
      topics: [topicHash],
    };

    provider.on(filter, (log: ethers.Log) => this.handleLog(log));

    Logger.info(
      { topicHash, contractAddress: this.contractAddress },
      "Subscribed to TransactionExecuted events",
    );

    return provider;
  }

  cleanup(provider: ethers.WebSocketProvider): void {
    provider.removeAllListeners();
    provider.destroy();
  }

  private async handleLog(log: ethers.Log): Promise<void> {
    try {
      const provider = this.reconnectManager.getResource();
      const block = provider
        ? await provider.getBlock(log.blockNumber)
        : null;
      const blockTimestamp = block?.timestamp ?? Math.floor(Date.now() / 1000);

      const parsed = parseTransactionLog({
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        blockTimestamp,
        logIndex: log.index,
        topics: [...log.topics],
        data: log.data,
      });

      if (!parsed) {
        Logger.warn(
          { transactionHash: log.transactionHash },
          "Failed to parse transaction log",
        );
        return;
      }

      Logger.info(
        {
          transactionType: parsed.transactionType,
          transactionHash: parsed.transactionHash,
          sender: parsed.sender,
          recipient: parsed.recipient,
        },
        "Received TransactionExecuted event",
      );

      await this.router.dispatch(parsed);
    } catch (error) {
      Logger.error(
        { err: error, transactionHash: log?.transactionHash },
        "Error handling transaction log",
      );
    }
  }
}
