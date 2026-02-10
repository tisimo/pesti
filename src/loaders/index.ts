import expressLoader from "./express";
import dependencyInjectorLoader from "./dependencyInjector";
import { clientShared } from "./postgresShared";
import { docClient, dynamoClient } from "./dynamo";
import Logger from "./logger";
import config from "../../config";


export default async ({ expressApp }) => {

  // 1. Connect to Shared PostgreSQL
  try {
    await clientShared.connect();
    Logger.info("Connection to Shared PostgreSQL established successfully.");
  } catch (error) {
    Logger.error({ err: error }, "Error when connecting to Shared PostgreSQL:");
    throw error;
  }

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

  dependencyInjectorLoader({
    schemas: [],
    controllers: [
      accountController,
      recoveryCodesController,
    ],
    services: [accountService, recoveryCodesService],
    repos: [accountRepo, recoveryCodesRepo],
  });

  // 4. Load Express
  expressLoader({ app: expressApp });
  Logger.info("Express Loaded");
};
