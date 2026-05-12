import "reflect-metadata";
import config from "../config";
import express from "express";
import Logger from "./loaders/logger";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger";

async function startServer() {
  const app = express();

  await require("./loaders").default({ expressApp: app });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app
    .listen(config.port, () => {
      Logger.info(`
      ################################################
              Server Listening On Port: ${config.port}  
      ################################################
    `);
    })
    .on("error", err => {
      Logger.error(err);
      process.exit(1);
    });
}

startServer();
