import { Service } from "typedi";
import { ojcPool } from "../../loaders/postgres";
import { sharedPool } from "../../loaders/postgresShared";
import { hasProfileStrikeCountColumn } from "./ojcSchemaSupport";
import Logger from "../../loaders/logger";

export interface AdminUser {
  profileId: string;
  accountId: string;
  firstName: string;
  lastName: string;
  username: string;
  country: string;
  city: string;
  userType: "DONOR" | "CREATOR";
  verificationStatus: string | null;
  avatarUrl: string | null;
  createdAt: string;
  email: string | null;
  role: string | null;
  accountStatus: string | null;
  strikeCount: number;
  completedDonationCount: number;
}

export interface UsersPage {
  users: AdminUser[];
  total: number;
}

export interface KycInfo {
  verificationId: string;
  status: "PENDING" | "VERIFIED" | "DECLINED";
  veriffSessionId: string | null;
  verifiedAt: string | null;
  submittedAt: string;
  updatedAt: string;
}

export interface UserCampaign {
  campaignId: string;
  title: string;
  status: string;
  amountRaised: number;
  goalAmount: number;
  createdAt: string;
}

export interface UserDonation {
  donationId: string;
  campaignId: string;
  campaignTitle: string | null;
  amount: number;
  status: string;
  isAnonymous: boolean;
  createdAt: string;
}

export interface UserProfile extends AdminUser {
  bio: string | null;
  causes: string | null;
  kyc: KycInfo | null;
  campaigns: UserCampaign[];
  donations: UserDonation[];
}

export interface UserStatusUpdateResult {
  profileId: string | null;
  email: string | null;
  username: string | null;
  previousStatus: "ACTIVE" | "INACTIVE";
  nextStatus: "ACTIVE" | "INACTIVE";
  previousStrikeCount: number;
  nextStrikeCount: number;
  clearedStrikes: boolean;
}

export interface UserStrikeUpdateResult {
  profileId: string | null;
  email: string | null;
  username: string | null;
  previousStatus: "ACTIVE" | "INACTIVE";
  nextStatus: "ACTIVE" | "INACTIVE";
  previousStrikeCount: number;
  nextStrikeCount: number;
  operation: "ADD_ONE" | "REMOVE_ONE" | "CLEAR_ALL";
}

@Service()
export default class OjcUsersRepo {
  public async listUsers(
    search: string | undefined,
    type: "DONOR" | "CREATOR" | undefined,
    kycStatus: "PENDING" | "VERIFIED" | "DECLINED" | "NONE" | undefined,
    strikedOnly: boolean,
    order: "asc" | "desc",
    limit: number,
    offset: number,
  ): Promise<UsersPage> {
    const hasStrikeCount = await hasProfileStrikeCountColumn();
    const strikeCountSelect = hasStrikeCount ? `COALESCE(p."strikeCount", 0)::int` : `0::int`;
    const params: any[] = [];
    const conditions: string[] = [`COALESCE(p."profileType", 'user') <> 'organization'`];

    // Email search: pre-fetch matching accountIds from shared db
    let emailAccountIds: string[] = [];
    if (search) {
      try {
        const { rows } = await sharedPool.query<{ accountId: string }>(
          `SELECT "accountId" FROM "Account" WHERE "email" ILIKE $1`,
          [`%${search.trim()}%`],
        );
        emailAccountIds = rows.map(r => r.accountId);
      } catch (error) {
        Logger.warn({ err: error }, "[OjcUsersRepo] Failed to load account ids by email search");
        /* continue without email search */
      }
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const n = params.length;
      const nameCond = `(p."firstName" ILIKE $${n} OR p."lastName" ILIKE $${n} OR p."username" ILIKE $${n} OR p."accountId"::text ILIKE $${n})`;
      if (emailAccountIds.length > 0) {
        params.push(emailAccountIds);
        conditions.push(`(${nameCond} OR p."accountId" = ANY($${params.length}::uuid[]))`);
      } else {
        conditions.push(nameCond);
      }
    }

    if (type === "DONOR" || type === "CREATOR") {
      params.push(type);
      conditions.push(`p."userType" = $${params.length}`);
    }

    if (kycStatus) {
      try {
        const { rows } = await sharedPool.query<{ accountId: string }>(
          `SELECT "accountId"
           FROM (
             SELECT DISTINCT ON ("accountId") "accountId", "status"
             FROM "Verifications"
             ORDER BY "accountId", "createdAt" DESC
           ) latest
           ${kycStatus === "NONE" ? "" : `WHERE latest."status" = $1`}`,
          kycStatus === "NONE" ? [] : [kycStatus],
        );
        const matchingAccountIds = rows.map((row) => row.accountId);

        if (kycStatus === "NONE") {
          if (matchingAccountIds.length > 0) {
            params.push(matchingAccountIds);
            conditions.push(`NOT (p."accountId" = ANY($${params.length}::uuid[]))`);
          }
        } else if (matchingAccountIds.length > 0) {
          params.push(matchingAccountIds);
          conditions.push(`p."accountId" = ANY($${params.length}::uuid[])`);
        } else {
          conditions.push("FALSE");
        }
      } catch (error) {
        Logger.warn({ err: error, kycStatus }, "[OjcUsersRepo] Failed to apply KYC status filter");
        conditions.push("FALSE");
      }
    }

    if (strikedOnly && hasStrikeCount) {
      conditions.push(`COALESCE(p."strikeCount", 0) > 0`);
    } else if (strikedOnly) {
      conditions.push("FALSE");
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sortDirection = order === "asc" ? "ASC" : "DESC";
    const orderBy = strikedOnly && hasStrikeCount
      ? `COALESCE(p."strikeCount", 0) DESC, p."createdAt" DESC`
      : `p."createdAt" ${sortDirection}`;

    const countResult = await ojcPool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM "Profiles" p ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total ?? 0;

    if (total === 0) return { users: [], total };

    params.push(limit);
    params.push(offset);

    const { rows: profiles } = await ojcPool.query<{
      profileId: string;
      accountId: string;
      firstName: string;
      lastName: string;
      username: string;
      country: string;
      city: string;
      userType: "DONOR" | "CREATOR";
      avatarUrl: string | null;
      createdAt: string;
      strikeCount: number;
    }>(
      `SELECT
         p."profileId",
         p."accountId",
         p."firstName",
         p."lastName",
         p."username",
         p."country",
         p."city",
         p."userType",
         p."avatarUrl",
         p."createdAt",
         ${strikeCountSelect} AS "strikeCount"
       FROM "Profiles" p
         ${where}
       ORDER BY ${orderBy}
         LIMIT $${params.length - 1}
       OFFSET $${params.length}`,
      params,
    );

    if (profiles.length === 0) return { users: [], total };

    const accountIds = profiles.map(p => p.accountId);
    const profileIds = profiles.map(p => p.profileId);
    let accountMap: Record<string, { email: string; role: string; status: string }> = {};
    let kycMap: Record<string, string> = {};
    let completedDonationCountMap: Record<string, number> = {};

    try {
      const { rows: accounts } = await sharedPool.query<{
        accountId: string;
        email: string;
        role: string;
        status: string;
      }>(
        `SELECT "accountId", "email", "role", "status"
         FROM "Account"
         WHERE "accountId" = ANY($1::uuid[])`,
        [accountIds],
      );
      accountMap = Object.fromEntries(accounts.map(a => [a.accountId, a]));
    } catch (error) {
      Logger.warn({ err: error, accountCount: accountIds.length }, "[OjcUsersRepo] Failed to load account map");
      /* continue without email/role */
    }

    try {
      const { rows: verifications } = await sharedPool.query<{
        accountId: string;
        status: string;
      }>(
        `SELECT DISTINCT ON ("accountId") "accountId", "status"
         FROM "Verifications"
         WHERE "accountId" = ANY($1::uuid[])
         ORDER BY "accountId", "createdAt" DESC`,
        [accountIds],
      );
      kycMap = Object.fromEntries(verifications.map(v => [v.accountId, v.status]));
    } catch (error) {
      Logger.warn({ err: error, accountCount: accountIds.length }, "[OjcUsersRepo] Failed to load KYC map");
      /* continue without KYC */
    }

    try {
      const { rows: donationCounts } = await ojcPool.query<{
        profileId: string;
        completedDonationCount: number;
      }>(
        `SELECT "profileId", COUNT(*)::int AS "completedDonationCount"
         FROM "Donations"
         WHERE "profileId" = ANY($1::uuid[])
           AND "status" = 'COMPLETED'
         GROUP BY "profileId"`,
        [profileIds],
      );
      completedDonationCountMap = Object.fromEntries(
        donationCounts.map((row) => [row.profileId, Number(row.completedDonationCount ?? 0)]),
      );
    } catch (error) {
      Logger.warn({ err: error, profileCount: profileIds.length }, "[OjcUsersRepo] Failed to load completed donation counts");
      /* continue without donation counts */
    }

    const users: AdminUser[] = profiles.map(p => ({
      ...p,
      verificationStatus: (kycMap[p.accountId] ?? null) as AdminUser["verificationStatus"],
      email: accountMap[p.accountId]?.email ?? null,
      role: accountMap[p.accountId]?.role ?? null,
      accountStatus: accountMap[p.accountId]?.status ?? null,
      completedDonationCount: completedDonationCountMap[p.profileId] ?? 0,
    }));

    return { users, total };
  }

  public async getUserProfile(profileId: string): Promise<UserProfile | null> {
    const hasStrikeCount = await hasProfileStrikeCountColumn();
    const strikeCountSelect = hasStrikeCount ? `COALESCE("strikeCount", 0)::int` : `0::int`;
    const { rows: profileRows } = await ojcPool.query<{
      profileId: string;
      accountId: string;
      firstName: string;
      lastName: string;
      username: string;
      bio: string | null;
      country: string;
      city: string;
      userType: "DONOR" | "CREATOR";
      causes: string | null;
      avatarUrl: string | null;
      createdAt: string;
      strikeCount: number;
    }>(
      `SELECT "profileId", "accountId", "firstName", "lastName", "username",
              "bio", "country", "city", "userType", "causes", "avatarUrl", "createdAt",
              ${strikeCountSelect} AS "strikeCount"
       FROM "Profiles"
       WHERE "profileId" = $1
         AND COALESCE("profileType", 'user') <> 'organization'`,
      [profileId],
    );

    if (!profileRows[0]) return null;
    const profile = profileRows[0];

    // Account data
    let account: { email: string; role: string; status: string } | null = null;
    try {
      const { rows } = await sharedPool.query<{ email: string; role: string; status: string }>(
        `SELECT "email", "role", "status" FROM "Account" WHERE "accountId" = $1`,
        [profile.accountId],
      );
      account = rows[0] ?? null;
    } catch (error) {
      Logger.warn({ err: error, accountId: profile.accountId }, "[OjcUsersRepo] Failed to load account data");
      /* continue without account data */
    }

    // KYC from Verifications table
    let kyc: KycInfo | null = null;
    try {
      const { rows } = await sharedPool.query<{
        verificationId: string;
        status: "PENDING" | "VERIFIED" | "DECLINED";
        veriffSessionId: string | null;
        verifiedAt: string | null;
        createdAt: string;
        updatedAt: string;
      }>(
        `SELECT "verificationId", "status", "veriffSessionId", "verifiedAt", "createdAt", "updatedAt"
         FROM "Verifications"
         WHERE "accountId" = $1
         ORDER BY "createdAt" DESC
         LIMIT 1`,
        [profile.accountId],
      );
      if (rows[0]) {
        kyc = {
          verificationId: rows[0].verificationId,
          status: rows[0].status,
          veriffSessionId: rows[0].veriffSessionId,
          verifiedAt: rows[0].verifiedAt,
          submittedAt: rows[0].createdAt,
          updatedAt: rows[0].updatedAt,
        };
      }
    } catch (error) {
      Logger.warn({ err: error, accountId: profile.accountId }, "[OjcUsersRepo] Failed to load KYC info");
      /* continue without KYC */
    }

    // Campaigns (CREATOR only)
    let campaigns: UserCampaign[] = [];
    if (profile.userType === "CREATOR") {
      try {
        const { rows } = await ojcPool.query<{
          campaignId: string;
          title: string;
          status: string;
          amountRaised: number;
          goalAmount: number;
          createdAt: string;
        }>(
          `SELECT
             c."campaignId",
             c."title",
             c."status",
             COALESCE(SUM(d."amount") FILTER (WHERE d."status" = 'COMPLETED'), 0)::float AS "amountRaised",
             c."goalAmount",
             c."createdAt"
           FROM "Campaigns" c
           LEFT JOIN "Donations" d ON d."campaignId" = c."campaignId"
           WHERE c."profileId" = $1
           GROUP BY c."campaignId"
           ORDER BY c."createdAt" DESC
           LIMIT 20`,
          [profileId],
        );
        campaigns = rows;
      } catch (error) {
        Logger.warn({ err: error, profileId }, "[OjcUsersRepo] Failed to load campaigns");
        /* continue without campaigns */
      }
    }

    // Donations
    let donations: UserDonation[] = [];
    try {
      const { rows } = await ojcPool.query<{
        donationId: string;
        campaignId: string;
        campaignTitle: string | null;
        amount: number;
        status: string;
        isAnonymous: boolean;
        createdAt: string;
      }>(
        `SELECT d."donationId", d."campaignId", c."title" AS "campaignTitle",
                d."amount", d."status", d."isAnonymous", d."createdAt"
         FROM "Donations" d
         LEFT JOIN "Campaigns" c ON c."campaignId" = d."campaignId"
         WHERE d."profileId" = $1
         ORDER BY d."createdAt" DESC
         LIMIT 30`,
        [profileId],
      );
      donations = rows;
    } catch (error) {
      Logger.warn({ err: error, profileId }, "[OjcUsersRepo] Failed to load donations");
      /* continue without donations */
    }

    return {
      ...profile,
      completedDonationCount: donations.filter((donation) => donation.status === "COMPLETED").length,
      verificationStatus: null,
      email: account?.email ?? null,
      role: account?.role ?? null,
      accountStatus: account?.status ?? null,
      kyc,
      campaigns,
      donations,
    };
  }

  public async updateUserStatus(
    accountId: string,
    status: "ACTIVE" | "INACTIVE",
    clearStrikesOnActivate = false,
  ): Promise<UserStatusUpdateResult | null> {
    const hasStrikeCount = await hasProfileStrikeCountColumn();
    const strikeCountSelect = hasStrikeCount ? `COALESCE("strikeCount", 0)::int` : `0::int`;
    const [accountResult, profileResult] = await Promise.all([
      sharedPool.query<{ email: string | null; status: "ACTIVE" | "INACTIVE" }>(
        `SELECT "email", "status" FROM "Account" WHERE "accountId" = $1`,
        [accountId],
      ),
      ojcPool.query<{ profileId: string; username: string | null; strikeCount: number }>(
        `SELECT "profileId", "username", ${strikeCountSelect} AS "strikeCount"
         FROM "Profiles"
         WHERE "accountId" = $1
           LIMIT 1`,
        [accountId],
      ),
    ]);

    const currentAccount = accountResult.rows[0];
    if (!currentAccount) return null;

    const currentProfile = profileResult.rows[0] ?? null;
    const previousStrikeCount = currentProfile?.strikeCount ?? 0;

    await sharedPool.query(`UPDATE "Account" SET "status" = $1, "updatedAt" = NOW() WHERE "accountId" = $2`, [
      status,
      accountId,
    ]);

    let nextStrikeCount = previousStrikeCount;
    const clearedStrikes = clearStrikesOnActivate && status === "ACTIVE" && previousStrikeCount > 0;

    if (hasStrikeCount && clearStrikesOnActivate && status === "ACTIVE") {
      const strikeResetResult = await ojcPool.query<{ strikeCount: number }>(
        `UPDATE "Profiles"
         SET "strikeCount" = 0
         WHERE "accountId" = $1
           RETURNING COALESCE("strikeCount", 0)::int AS "strikeCount"`,
        [accountId],
      );
      nextStrikeCount = strikeResetResult.rows[0]?.strikeCount ?? 0;
    }

    return {
      profileId: currentProfile?.profileId ?? null,
      email: currentAccount.email ?? null,
      username: currentProfile?.username ?? null,
      previousStatus: currentAccount.status,
      nextStatus: status,
      previousStrikeCount,
      nextStrikeCount,
      clearedStrikes,
    };
  }

  public async updateUserStrikes(
    accountId: string,
    operation: "ADD_ONE" | "REMOVE_ONE" | "CLEAR_ALL",
  ): Promise<UserStrikeUpdateResult | null> {
    const hasStrikeCount = await hasProfileStrikeCountColumn();
    if (!hasStrikeCount) return null;

    const [accountResult, profileResult] = await Promise.all([
      sharedPool.query<{ email: string | null; status: "ACTIVE" | "INACTIVE" }>(
        `SELECT "email", "status" FROM "Account" WHERE "accountId" = $1`,
        [accountId],
      ),
      ojcPool.query<{ profileId: string; username: string | null; strikeCount: number }>(
        `SELECT "profileId", "username", COALESCE("strikeCount", 0)::int AS "strikeCount"
         FROM "Profiles"
         WHERE "accountId" = $1
           LIMIT 1`,
        [accountId],
      ),
    ]);

    const currentAccount = accountResult.rows[0];
    const currentProfile = profileResult.rows[0];
    if (!currentAccount || !currentProfile) return null;

    const previousStrikeCount = currentProfile.strikeCount;
    const nextStrikeCount =
      operation === "CLEAR_ALL"
        ? 0
        : operation === "ADD_ONE"
          ? Math.min(previousStrikeCount + 1, 3)
          : Math.max(previousStrikeCount - 1, 0);
    const nextStatus = operation === "ADD_ONE" && nextStrikeCount >= 3 ? "INACTIVE" : currentAccount.status;

    await Promise.all([
      ojcPool.query(
        `UPDATE "Profiles"
         SET "strikeCount" = $1
         WHERE "accountId" = $2`,
        [nextStrikeCount, accountId],
      ),
      nextStatus !== currentAccount.status
        ? sharedPool.query(`UPDATE "Account" SET "status" = $1, "updatedAt" = NOW() WHERE "accountId" = $2`, [
            nextStatus,
            accountId,
          ])
        : Promise.resolve(),
    ]);

    return {
      profileId: currentProfile.profileId,
      email: currentAccount.email ?? null,
      username: currentProfile.username ?? null,
      previousStatus: currentAccount.status,
      nextStatus,
      previousStrikeCount,
      nextStrikeCount,
      operation,
    };
  }
}
