import expressLoader from "./express";
import dependencyInjectorLoader from "./dependencyInjector";
import { connectWithRetry } from "./postgresShared";
import { docClient, dynamoClient } from "./dynamo";
import Logger from "./logger";
import config from "../../config";
import { startTransactionListener } from "./transactionListener";

export default async ({ expressApp }) => {
  // 1. Connect to Shared PostgreSQL
  await connectWithRetry();
  Logger.info("Connection to Shared PostgreSQL established successfully.");

  // 2. Connect to DynamoDB
  try {
    docClient;
    dynamoClient;
    Logger.info("Connection to DynamoDB established successfully.");
  } catch (error) {
    Logger.error({ err: error }, "Error when connecting to DynamoDB:");
    throw error;
  }

  const accountController = {
    name: config.controllers.account.name,
    path: config.controllers.account.path,
  };

  const accountService = {
    name: config.services.account.name,
    path: config.services.account.path,
  };

  const accountRepo = {
    name: config.repos.account.name,
    path: config.repos.account.path,
  };

  const recoveryCodesController = {
    name: config.controllers.recoveryCodes.name,
    path: config.controllers.recoveryCodes.path,
  };

  const recoveryCodesService = {
    name: config.services.recoveryCodes.name,
    path: config.services.recoveryCodes.path,
  };

  const recoveryCodesRepo = {
    name: config.repos.recoveryCodes.name,
    path: config.repos.recoveryCodes.path,
  };

  const walletsController = {
    name: config.controllers.wallets.name,
    path: config.controllers.wallets.path,
  };

  const walletsService = {
    name: config.services.wallets.name,
    path: config.services.wallets.path,
  };

  const walletsRepo = {
    name: config.repos.wallets.name,
    path: config.repos.wallets.path,
  };

  const transactionsService = {
    name: config.services.transactions.name,
    path: config.services.transactions.path,
  };

  const transactionsRepo = {
    name: config.repos.transactions.name,
    path: config.repos.transactions.path,
  };

  const verificationController = {
    name: config.controllers.verification.name,
    path: config.controllers.verification.path,
  };

  const verificationService = {
    name: config.services.verification.name,
    path: config.services.verification.path,
  };

  const verificationRepo = {
    name: config.repos.verification.name,
    path: config.repos.verification.path,
  };

  const depositController = {
    name: config.controllers.deposit.name,
    path: config.controllers.deposit.path,
  };

  const depositService = {
    name: config.services.deposit.name,
    path: config.services.deposit.path,
  };

  dependencyInjectorLoader({
    schemas: [],
    controllers: [
      accountController,
      depositController,
      recoveryCodesController,
      verificationController,
      walletsController,
    ],
    services: [
      accountService,
      depositService,
      recoveryCodesService,
      transactionsService,
      verificationService,
      walletsService,
    ],
    repos: [accountRepo, recoveryCodesRepo, transactionsRepo, verificationRepo, walletsRepo],
  });

  // 4. Load Express
  expressLoader({ app: expressApp });
  Logger.info("Express Loaded");

  // 5. Start Transaction Listener
  await startTransactionListener();
};
