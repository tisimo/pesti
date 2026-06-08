import { Service } from "typedi";
import { ojcPool } from "../../loaders/postgres";
import { sharedPool } from "../../loaders/postgresShared";
import Logger from "../../loaders/logger";

export interface KybFile {
  key: string;
  fileUrl: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface KybSubmission {
  submissionId: string;
  profileId: string;
  accountId: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string | null;
  businessRegistrationFile: KybFile;
  representativeIdFile: KybFile;
  representativeSelfieFile: KybFile;
  submittedAt: string;
  updatedAt: string;
  legalName: string | null;
  username: string;
}

type KybRow = {
  submissionId: string;
  profileId: string;
  accountId: string;
  status: string;
  adminNote: string | null;
  businessRegistrationFile: KybFile;
  representativeIdFile: KybFile;
  representativeSelfieFile: KybFile;
  createdAt: string;
  updatedAt: string;
  legalName: string | null;
  username: string;
};

function toSubmission(row: KybRow): KybSubmission {
  const status = row.status === "approved" || row.status === "rejected" ? row.status : "pending";
  return {
    submissionId: row.submissionId,
    profileId: row.profileId,
    accountId: row.accountId,
    status,
    adminNote: row.adminNote,
    businessRegistrationFile: row.businessRegistrationFile,
    representativeIdFile: row.representativeIdFile,
    representativeSelfieFile: row.representativeSelfieFile,
    submittedAt: row.createdAt,
    updatedAt: row.updatedAt,
    legalName: row.legalName,
    username: row.username,
  };
}

@Service()
export default class OjcOrganizationKybRepo {
  public async getByProfileId(profileId: string): Promise<KybSubmission | null> {
    const { rows } = await ojcPool.query<KybRow>(
      `SELECT
         s."submissionId",
         s."profileId",
         s."accountId",
         s."status",
         s."adminNote",
         s."businessRegistrationFile",
         s."representativeIdFile",
         s."representativeSelfieFile",
         s."createdAt",
         s."updatedAt",
         p."legalName",
         p."username"
       FROM "OrganizationKycSubmissions" s
       JOIN "Profiles" p ON p."profileId" = s."profileId"
       WHERE s."profileId" = $1
       LIMIT 1`,
      [profileId],
    );
    return rows[0] ? toSubmission(rows[0]) : null;
  }

  public async review(
    profileId: string,
    decision: "approved" | "rejected",
    adminNote: string | null,
  ): Promise<KybSubmission | null> {
    const profileVerificationStatus = decision === "approved" ? "verified" : "rejected";

    const client = await ojcPool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query<KybRow>(
        `UPDATE "OrganizationKycSubmissions" s
         SET "status" = $1, "adminNote" = $2, "updatedAt" = NOW()
         FROM "Profiles" p
         WHERE s."profileId" = $3
           AND p."profileId" = s."profileId"
         RETURNING
           s."submissionId", s."profileId", s."accountId", s."status", s."adminNote",
           s."businessRegistrationFile", s."representativeIdFile", s."representativeSelfieFile",
           s."createdAt", s."updatedAt",
           p."legalName", p."username"`,
        [decision, adminNote ?? null, profileId],
      );

      if (!rows[0]) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `UPDATE "Profiles" SET "verificationStatus" = $1 WHERE "profileId" = $2`,
        [profileVerificationStatus, profileId],
      );

      await client.query("COMMIT");
      return toSubmission(rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  public async getEmailByAccountId(accountId: string): Promise<string | null> {
    try {
      const { rows } = await sharedPool.query<{ email: string }>(
        `SELECT "email" FROM "Account" WHERE "accountId" = $1`,
        [accountId],
      );
      return rows[0]?.email ?? null;
    } catch (error) {
      Logger.warn({ err: error, accountId }, "[OjcOrganizationKybRepo] Failed to load account email");
      return null;
    }
  }
}
