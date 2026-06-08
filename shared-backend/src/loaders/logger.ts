import pino from "pino";
import config from "../../config";

const isProd = process.env.NODE_ENV === "production";

const LoggerInstance = pino({
  level: config.logs.level,
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        },
      }),
});

export default LoggerInstance;
