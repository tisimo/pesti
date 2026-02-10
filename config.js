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
