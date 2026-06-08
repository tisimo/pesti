module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/unit/**/*.test.ts",
    "**/__tests__/integration/**/*.integration.test.ts"
  ],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      isolateModules: true,
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
    "^.+\\.js$": ["ts-jest", {
      isolateModules: true,
      useESM: false,
      tsconfig: {
        allowJs: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(uuid)/)",
  ],
  moduleNameMapper: {
    "^uuid$": "<rootDir>/src/__mocks__/uuid.js",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/__tests__/**",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
  ],
  testTimeout: 30000,
};
