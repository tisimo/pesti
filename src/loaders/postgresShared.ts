import { Client } from "pg";
import config from "../../config";
import Logger from "./logger";
import path from "path";
import fs from "fs";

let sslConfig: any = false;

if (process.env.NODE_ENV !== "production") {
  if (process.env.NODE_ENV !== "test") {
    sslConfig = { rejectUnauthorized: false };
  } else {
    sslConfig = false;
  }
} else {
  sslConfig = {
    rejectUnauthorized: true,
    ca: fs.readFileSync(path.resolve(__dirname, "../../certs/shared.pem")).toString(),
  };
}

console.log(sslConfig);

const clientConfig = {
  host: config.auroraHostShared,
  port: Number.parseInt(config.auroraPortShared, 10) || 5432,
  user: config.auroraUserShared,
  password: config.auroraPasswordShared,
  database: config.auroraDatabaseShared,
  ssl: sslConfig,
};

export let clientShared!: Client;

export async function connectWithRetry(): Promise<void> {
  while (true) {
    const newClient = new Client(clientConfig);
    try {
      await newClient.connect();
      clientShared = newClient;
      return;
    } catch (error) {
      Logger.error({ err: error }, "Failed Connecting To Shared PostgreSQL, Retrying In 30 Seconds...");
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
}