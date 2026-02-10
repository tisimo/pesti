import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import config from "../../config";
import Logger from "./logger";

let cognitoClient: CognitoIdentityProviderClient;

if (config.awsAccessKeyId && config.awsSecretAccessKey) {
  cognitoClient = new CognitoIdentityProviderClient({
    region: config.awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
  });
  Logger.info("Connected to Cognito with explicit credentials");
} else {
  cognitoClient = new CognitoIdentityProviderClient({
    region: config.awsRegion,
  });
  Logger.info("Connected to Cognito using IAM role or default credentials");
}

export { cognitoClient };
