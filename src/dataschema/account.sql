-- Account Table
-- Run this SQL to create the required table in your PostgreSQL database

CREATE TABLE IF NOT EXISTS "Account" (
    "accountId" UUID PRIMARY KEY,
    "cognitoSub" VARCHAR(255) NOT NULL UNIQUE,
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_account_cognitoSub" ON "Account" ("cognitoSub");
