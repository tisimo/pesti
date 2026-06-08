import { Pool } from "pg";
import config from "../../config";
import Logger from "./logger";
import path from "path";
import fs from "fs";

function buildSslConfig(): any {
  if (process.env.NODE_ENV === "test") return false;
  if (process.env.NODE_ENV !== "production") return { rejectUnauthorized: false };
  return {
    rejectUnauthorized: true,
    ca: fs.readFileSync(path.resolve(__dirname, "../../certs/shared.pem")).toString(),
  };
}

export const ojcPool = new Pool({
  host: config.auroraHost,
  port: Number.parseInt(config.auroraPort, 10) || 15433,
  user: config.auroraUser,
  password: config.auroraPassword,
  database: config.auroraDatabase,
  ssl: buildSslConfig(),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

ojcPool.on("error", (err) => {
  Logger.error({ err }, "OJC PostgreSQL pool error");
});

export async function connectWithRetry(): Promise<void> {
  try {
    const testClient = await ojcPool.connect();
    testClient.release();
  } catch (error) {
    Logger.warn({ err: error }, "OJC PostgreSQL unavailable — queries will fail until DB is reachable");
  }
}
