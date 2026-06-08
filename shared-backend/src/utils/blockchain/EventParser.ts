import { ethers } from "ethers";
import { TRANSACTION_EXECUTED_EVENT } from "./OnlyPaymentsAbi";
import {
  TransactionType,
  DONATE_DATA_SCHEMA_BASE,
  DONATE_DATA_SCHEMA_WITH_FIAT,
  TIP_DATA_SCHEMA_BASE,
  TIP_DATA_SCHEMA_WITH_FIAT,
} from "./eventDataSchema";
import type { ParsedTransaction } from "../../services/transactionListener/types";

const eventIface = new ethers.Interface([TRANSACTION_EXECUTED_EVENT]);
const abiCoder = ethers.AbiCoder.defaultAbiCoder();

export function getEventTopicHash(): string {
  return eventIface.getEvent("TransactionExecuted")!.topicHash;
}

export function parseTransactionLog(log: {
  transactionHash: string;
  blockNumber: number;
  blockTimestamp: number;
  logIndex: number;
  topics: string[];
  data: string;
}): ParsedTransaction | null {
  try {
    const parsed = eventIface.parseLog({ topics: log.topics, data: log.data });
    if (!parsed) return null;

    const transactionType = Number(parsed.args.transactionType);
    const sender = parsed.args.sender as string;
    const recipient = parsed.args.recipient as string;
    const token = parsed.args.token as string;
    const amount = (parsed.args.amount as bigint).toString();
    const commission = (parsed.args.commission as bigint).toString();
    const rawData = parsed.args.data as string;

    const decodedData = decodeTransactionData(transactionType, rawData);

    return {
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
      blockTimestamp: log.blockTimestamp,
      logIndex: log.logIndex,
      transactionType,
      sender,
      recipient,
      token,
      amount,
      commission,
      rawData,
      decodedData,
    };
  } catch {
    return null;
  }
}

function decodeTransactionData(
  transactionType: number,
  rawData: string,
): Record<string, string> {
  if (!rawData || rawData === "0x" || rawData.length <= 2) {
    return {};
  }

  try {
    if (transactionType === TransactionType.DonateJC) {
      return decodeDonationData(rawData);
    }

    if (transactionType === TransactionType.TipJC) {
      return decodeTipData(rawData);
    }

    return {};
  } catch {
    return {};
  }
}

function decodeDonationData(rawData: string): Record<string, string> {
  const withFiatTypes = DONATE_DATA_SCHEMA_WITH_FIAT.map((f) => f.type);
  const withFiatNames = DONATE_DATA_SCHEMA_WITH_FIAT.map((f) => f.name);

  try {
    const decoded = abiCoder.decode(withFiatTypes, rawData);
    const result: Record<string, string> = {};
    withFiatNames.forEach((name, i) => {
      result[name] = decoded[i]?.toString() ?? "";
    });
    return result;
  } catch {
    // Fall back to base schema (2 fields)
  }

  const baseTypes = DONATE_DATA_SCHEMA_BASE.map((f) => f.type);
  const baseNames = DONATE_DATA_SCHEMA_BASE.map((f) => f.name);

  const decoded = abiCoder.decode(baseTypes, rawData);
  const result: Record<string, string> = {};
  baseNames.forEach((name, i) => {
    result[name] = decoded[i]?.toString() ?? "";
  });
  return result;
}

function decodeTipData(rawData: string): Record<string, string> {
  const withFiatTypes = TIP_DATA_SCHEMA_WITH_FIAT.map((f) => f.type);
  const withFiatNames = TIP_DATA_SCHEMA_WITH_FIAT.map((f) => f.name);

  try {
    const decoded = abiCoder.decode(withFiatTypes, rawData);
    const result: Record<string, string> = {};
    withFiatNames.forEach((name, i) => {
      result[name] = decoded[i]?.toString() ?? "";
    });
    return result;
  } catch {
    // Fall back to base schema (3 fields)
  }

  const baseTypes = TIP_DATA_SCHEMA_BASE.map((f) => f.type);
  const baseNames = TIP_DATA_SCHEMA_BASE.map((f) => f.name);

  const decoded = abiCoder.decode(baseTypes, rawData);
  const result: Record<string, string> = {};
  baseNames.forEach((name, i) => {
    result[name] = decoded[i]?.toString() ?? "";
  });
  return result;
}
