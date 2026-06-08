import dotenv from "dotenv";

// Set the NODE_ENV to 'development' by default

const result = dotenv.config();

if (!result.parsed) {
  throw new Error("⚠️  Couldn't find .env file  ⚠️");
}

export default {
  /**
   * Your favorite port : optional change to 4002 by JRT
   */
  port: parseInt(process.env.PORT, 10) || 4002,

  /**
   * Used by winston logger
   */
  logs: {
    level: process.env.LOG_LEVEL || "info",
  },

  /**
   * API configs
   */
  api: {
    prefix: "/api",
  },

  controllers: {},

  services: {},

  repos: {},

  awsRegion: process.env.AWS_REGION || "eu-west-1",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsSecretToken: process.env.AWS_SESSION_TOKEN,
  microsoftTenantId: process.env.MICROSOFT_TENANT_ID || "",
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID || "",
  microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
  microsoftUserEmail: process.env.MICROSOFT_USER_EMAIL || "",
  microsoftGraphScope: process.env.MICROSOFT_GRAPH_SCOPE || "https://graph.microsoft.com/.default",
  microsoftInboxMaxScan: parseInt(process.env.MICROSOFT_INBOX_MAX_SCAN || "250", 10),
  carsTableName: process.env.DYNAMO_CARS_TABLE || "cars",
  s3BucketName: process.env.S3_BUCKET_NAME || "",
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL || "",
  s3UploadExpirySeconds: parseInt(process.env.S3_UPLOAD_EXPIRY_SECONDS || "900", 10),

  auroraHost: process.env.DB_HOST,
  auroraPort: process.env.DB_PORT,
  auroraUser: process.env.DB_USER,
  auroraPassword: process.env.DB_PASSWORD,
  auroraDatabase: process.env.DB_NAME,

  auroraHostShared: process.env.DB_HOST_SHARED,
  auroraPortShared: process.env.DB_PORT_SHARED,
  auroraUserShared: process.env.DB_USER_SHARED,
  auroraPasswordShared: process.env.DB_PASSWORD_SHARED,
  auroraDatabaseShared: process.env.DB_NAME_SHARED,

  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID,
  cognitoClientId: process.env.COGNITO_CLIENT_ID,
};
