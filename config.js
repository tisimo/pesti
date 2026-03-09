import dotenv from "dotenv";

// Set the NODE_ENV to 'development' by default

const result = dotenv.config();

if (!result.parsed) {
  throw new Error("⚠️  Couldn't find .env file  ⚠️");
}

export default {
  /**
   * Your favorite port : optional change to 4000 by JRT
   */
  port: parseInt(process.env.PORT, 10) || 4001,

  /**
   * That long string from mlab
   */
  databaseURL: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/test",

  /**
   * Your secret sauce
   */
  jwtSecret: process.env.JWT_SECRET || "my sakdfho2390asjod$%jl)!sdjas0i secret",

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

  controllers: {
    account: {
      name: "AccountController",
      path: "../controllers/AccountController",
    },
    recoveryCodes: {
      name: "RecoveryCodesController",
      path: "../controllers/RecoveryCodesController",
    },
    role: {
      name: "RoleController",
      path: "../controllers/roleController",
    },
    verification: {
      name: "VerificationController",
      path: "../controllers/VerificationController",
    },
    wallets: {
      name: "WalletsController",
      path: "../controllers/WalletsController",
    },
    deposit: {
      name: "DepositController",
      path: "../controllers/DepositController",
    },
  },

  services: {
    account: {
      name: "AccountService",
      path: "../services/AccountService",
    },
    recoveryCodes: {
      name: "RecoveryCodesService",
      path: "../services/RecoveryCodesService",
    },
    role: {
      name: "RoleService",
      path: "../services/roleService",
    },
    wallets: {
      name: "WalletsService",
      path: "../services/WalletsService",
    },
    transactions: {
      name: "TransactionsService",
      path: "../services/TransactionsService",
    },
    deposit: {
      name: "DepositService",
      path: "../services/DepositService",
    },
    verification: {
      name: "VerificationService",
      path: "../services/VerificationService",
    },
  },

  repos: {
    account: {
      name: "AccountRepo",
      path: "../repos/Account/AccountRepo",
    },
    recoveryCodes: {
      name: "RecoveryCodesRepo",
      path: "../repos/RecoveryCodes/RecoveryCodesRepo",
    },
    role: {
      name: "RoleRepo",
      path: "../repos/roleRepo",
    },
    wallets: {
      name: "WalletsRepo",
      path: "../repos/Wallets/WalletsRepo",
    },
    transactions: {
      name: "TransactionsRepo",
      path: "../repos/Transactions/TransactionsRepo",
    },
    verification: {
      name: "VerificationRepo",
      path: "../repos/Verification/VerificationRepo",
    },
  },

  alchemy: {
    apiKey: process.env.ALCHEMY_API_KEY || "",
    network: process.env.ALCHEMY_NETWORK || "base-mainnet",
  },

  onlyPayments: {
    address: process.env.ONLY_PAYMENTS_ADDRESS || "",
  },

  cdp: {
    apiKeyId: process.env.CDP_API_KEY_ID || "",
    apiKeySecret: process.env.CDP_API_KEY_SECRET || "",
  },

  backends: {
    causes: { url: process.env.BACKEND_CAUSES_URL || "http://localhost:4000/api" },
  },

  awsRegion: process.env.AWS_REGION || 'eu-west-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,

  auroraHostShared: process.env.DB_HOST_SHARED,
  auroraPortShared: process.env.DB_PORT_SHARED,
  auroraUserShared: process.env.DB_USER_SHARED,
  auroraPasswordShared: process.env.DB_PASSWORD_SHARED,
  auroraDatabaseShared: process.env.DB_NAME_SHARED,
};
