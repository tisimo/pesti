import { SESClient } from "@aws-sdk/client-ses";
import config from "../../config";
import Logger from "./logger";

let sesClient: SESClient;

if (config.awsAccessKeyId && config.awsSecretAccessKey) {
  sesClient = new SESClient({
    region: config.awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
  });
  Logger.info("Connected to SES with explicit credentials");
} else {
  sesClient = new SESClient({ region: config.awsRegion });
  Logger.info("Connected to SES using IAM role or default credentials");
}

export { sesClient };
