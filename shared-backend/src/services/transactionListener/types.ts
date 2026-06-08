import type { InternalApiClient } from "./InternalApiClient";
import type { Log } from "ethers";

export interface ParsedTransaction {
  transactionHash: string;
  blockNumber: number;
  blockTimestamp: number;
  logIndex: number;
  transactionType: number;
  sender: string;
  recipient: string;
  token: string;
  amount: string;
  commission: string;
  rawData: string;
  decodedData: Record<string, string>;
}

export interface TransactionHandler {
  readonly transactionType: number;
  handle(event: ParsedTransaction): Promise<void>;
}

export interface ListenerConfig {
  alchemyApiKey: string;
  alchemyNetwork: string;
  contractAddress: string;
}

/** Maps each transaction type number to the API client that handles it. */
export type BackendMapping = Record<number, InternalApiClient>;

export interface ExtraLogFilter {
  address: string;
  topics: string[];
  handler: (log: Log) => Promise<void>;
}
