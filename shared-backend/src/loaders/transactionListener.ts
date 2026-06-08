import { Container } from "typedi";
import { TransactionListener } from "../services/transactionListener/TransactionListener";
import { TransactionRouter } from "../services/transactionListener/TransactionRouter";
import { InternalApiClient } from "../services/transactionListener/InternalApiClient";
import { TransactionType } from "../utils/blockchain/eventDataSchema";
import { DonationHandler } from "../services/transactionListener/handlers/DonationHandler";
import { TipHandler } from "../services/transactionListener/handlers/TipHandler";
import { WithdrawHandler } from "../services/transactionListener/handlers/WithdrawHandler";
import type IWalletsService from "../services/IServices/IWalletsService";
import type ITransactionsService from "../services/IServices/ITransactionsService";
import type IWithdrawalService from "../services/IServices/IWithdrawalService";
import Logger from "./logger";
import config from "../../config";

/**
 * Maps each transaction type to a backend key in `config.backends`.
 * Add new entries here when integrating additional backends.
 */
const transactionTypeBackend: Record<number, keyof typeof config.backends> = {
  [TransactionType.DonateJC]: "causes",
  [TransactionType.TipJC]: "causes",
};

/** Creates one InternalApiClient per unique backend URL (deduplicates). */
function buildApiClients(): Map<string, InternalApiClient> {
  const clients = new Map<string, InternalApiClient>();

  for (const backend of Object.values(config.backends)) {
    if (!clients.has(backend.url)) {
      clients.set(backend.url, new InternalApiClient(backend.url));
    }
  }

  return clients;
}

function getApiClient(
  clients: Map<string, InternalApiClient>,
  transactionType: number,
): InternalApiClient {
  const backendKey = transactionTypeBackend[transactionType];
  if (!backendKey) {
    throw new Error(`No backend configured for transaction type ${transactionType}`);
  }

  const backend = config.backends[backendKey];
  const client = clients.get(backend.url);
  if (!client) {
    throw new Error(`No API client found for backend "${String(backendKey)}"`);
  }

  return client;
}

export async function startTransactionListener(): Promise<void> {
  if (!config.alchemy.apiKey || !config.onlyPayments.address) {
    Logger.warn("Transaction Listener not started — missing ALCHEMY_API_KEY or ONLY_PAYMENTS_ADDRESS");
    return;
  }

  try {
    const walletsService = Container.get(config.services.wallets.name) as IWalletsService;
    const transactionsService = Container.get(config.services.transactions.name) as ITransactionsService;
    const withdrawalService = Container.get(config.services.withdrawal.name) as IWithdrawalService;
    const clients = buildApiClients();

    const router = new TransactionRouter(transactionsService);
    router.register(new DonationHandler(getApiClient(clients, TransactionType.DonateJC), walletsService));
    router.register(new TipHandler(getApiClient(clients, TransactionType.TipJC)));
    router.register(new WithdrawHandler(withdrawalService));

    const listener = new TransactionListener(
      {
        alchemyApiKey: config.alchemy.apiKey,
        alchemyNetwork: config.alchemy.network,
        contractAddress: config.onlyPayments.address,
      },
      router,
    );

    await listener.start();
    Logger.info("Transaction Listener started");
  } catch (error) {
    Logger.error({ err: error }, "Failed to start Transaction Listener");
  }
}
