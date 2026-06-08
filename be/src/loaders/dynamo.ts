// src/loaders/dynamo.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import config from "../../config";
import Logger from "./logger";

let dynamoClient: DynamoDBClient;

if (config.awsAccessKeyId && config.awsSecretAccessKey) {
  // Use explicit credentials
  dynamoClient = new DynamoDBClient({
    region: config.awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
      sessionToken: config.awsSecretToken, // Optional
    },
  });
  console.log("DynamoDB client initialized with explicit credentials.");
} else {
  // Use IAM Role (default credential provider chain)
  dynamoClient = new DynamoDBClient({
    region: config.awsRegion,
  });
}

const docClient = DynamoDBDocumentClient.from(dynamoClient);


export { dynamoClient, docClient };
