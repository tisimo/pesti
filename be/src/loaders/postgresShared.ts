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

export const sharedPool = new Pool({
  host: config.auroraHostShared,
  port: Number.parseInt(config.auroraPortShared, 10) || 15432,
  user: config.auroraUserShared,
  password: config.auroraPasswordShared,
  database: config.auroraDatabaseShared,
  ssl: buildSslConfig(),
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

sharedPool.on("error", (err) => {
  Logger.error({ err }, "Shared PostgreSQL pool error");
});
