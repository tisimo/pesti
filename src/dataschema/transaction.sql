-- Transaction Table

CREATE TABLE IF NOT EXISTS "Transaction" (
    "transactionId" UUID PRIMARY KEY NOT NULL,
    "senderAddress" VARCHAR(255) NOT NULL,
    "receiverAddress" VARCHAR(255) NOT NULL,
    "type" SMALLINT NOT NULL,
    "amount" NUMERIC(28, 18) NOT NULL,
    "fiatAmount" NUMERIC(18, 2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "commission" NUMERIC(28, 18) NOT NULL DEFAULT 0,
    "rate" NUMERIC(28, 18) NOT NULL DEFAULT 0,
    "donationAmount" NUMERIC(28, 18) NOT NULL DEFAULT 0,
    "tipAmount" NUMERIC(28, 18) NOT NULL DEFAULT 0,
    "txHash" VARCHAR(255) NOT NULL UNIQUE,
    "token" VARCHAR(100) NOT NULL DEFAULT 'USDC',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Transaction"
    ADD COLUMN IF NOT EXISTS "donationAmount" NUMERIC(28, 18) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "tipAmount" NUMERIC(28, 18) NOT NULL DEFAULT 0;

UPDATE "Transaction"
SET
    "donationAmount" = CASE
        WHEN "type" = 0 THEN "amount"
        ELSE "donationAmount"
    END,
    "tipAmount" = CASE
        WHEN "type" = 1 THEN "amount"
        ELSE "tipAmount"
    END
WHERE ("type" = 0 AND "donationAmount" = 0)
   OR ("type" = 1 AND "tipAmount" = 0);

CREATE INDEX IF NOT EXISTS "idx_transaction_senderAddress" ON "Transaction" ("senderAddress");
CREATE INDEX IF NOT EXISTS "idx_transaction_receiverAddress" ON "Transaction" ("receiverAddress");