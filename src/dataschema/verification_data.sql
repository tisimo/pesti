CREATE TABLE IF NOT EXISTS "VerificationData" (
    "verificationId"     UUID PRIMARY KEY REFERENCES "Verifications" ("verificationId") ON DELETE CASCADE,
    "firstName"          VARCHAR(100),
    "lastName"           VARCHAR(100),
    "birthDate"          DATE,
    "gender"             VARCHAR(10),
    "country"            VARCHAR(10),
    "documentType"       VARCHAR(50),
    "createdAt"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
