import { Service } from "typedi";
import { ojcPool } from "../../loaders/postgres";
import { sharedPool } from "../../loaders/postgresShared";
import Logger from "../../loaders/logger";

export interface OrganizationListItem {
  profileId: string;
  accountId: string;
  legalName: string | null;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  organizationType: string | null;
  role: string | null;
  website: string | null;
  country: string | null;
  city: string | null;
  createdAt: string;
  email: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "DECLINED" | null;
  accountStatus: string | null;
  campaignCount: number;
  activeCampaigns: number;
  totalRaised: number;
}

export interface OrganizationsPage {
  organizations: OrganizationListItem[];
  total: number;
}

export interface OrganizationCampaign {
  campaignId: string;
  title: string;
  status: string;
  amountRaised: number;
  goalAmount: number;
  createdAt: string;
}

export interface OrganizationProfile extends OrganizationListItem {
  taxId: string | null;
  socialLinks: string[];
  campaigns: OrganizationCampaign[];
}

type VerificationStatus = "PENDING" | "VERIFIED" | "DECLINED";

const VALID_ORGANIZATION_TYPES = new Set([
  "NGO",
  "CHARITY",
  "FOUNDATION",
  "ASSOCIATION",
  "RELIGIOUS",
  "OTHER",
]);

@Service()
export default class OjcOrganizationsRepo {
  public async listOrganizations(
    search: string | undefined,
    organizationType: string | undefined,
    accountStatus: string | undefined,
    order: "asc" | "desc",
    limit: number,
    offset: number,
  ): Promise<OrganizationsPage> {
    const params: Array<string | string[] | number> = [];
    const conditions: string[] = [`p."profileType" = 'organization'`];

    // Filter by account status — pre-fetch matching accountIds from shared pool
    if (accountStatus) {
      try {
        const { rows } = await sharedPool.query<{ accountId: string }>(
          `SELECT "accountId" FROM "Account" WHERE "status" = $1`,
          [accountStatus],
        );
        const statusAccountIds = rows.map((r) => r.accountId);
        if (statusAccountIds.length === 0) return { organizations: [], total: 0 };
        params.push(statusAccountIds);
        conditions.push(`p."accountId" = ANY($${params.length}::uuid[])`);
      } catch (error) {
        Logger.warn({ err: error, accountStatus }, "[OjcOrganizationsRepo] Failed to load account ids by status");
        return { organizations: [], total: 0 };
      }
    }

    let emailAccountIds: string[] = [];
    if (search?.trim()) {
      try {
        const { rows } = await sharedPool.query<{ accountId: string }>(
          `SELECT "accountId" FROM "Account" WHERE "email" ILIKE $1`,
          [`%${search.trim()}%`],
        );
        emailAccountIds = rows.map((row) => row.accountId);
      } catch (error) {
        Logger.warn({ err: error }, "[OjcOrganizationsRepo] Failed to load account ids by email search");
        emailAccountIds = [];
      }
    }

    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      const searchParam = params.length;
      const searchCondition = [
        `COALESCE(p."legalName", '') ILIKE $${searchParam}`,
        `p."username" ILIKE $${searchParam}`,
        `COALESCE(p."role", '') ILIKE $${searchParam}`,
        `COALESCE(p."website", '') ILIKE $${searchParam}`,
        `COALESCE(p."taxId", '') ILIKE $${searchParam}`,
        `COALESCE(p."country", '') ILIKE $${searchParam}`,
        `COALESCE(p."city", '') ILIKE $${searchParam}`,
        `p."accountId"::text ILIKE $${searchParam}`,
      ].join(" OR ");

      if (emailAccountIds.length > 0) {
        params.push(emailAccountIds);
        conditions.push(`((${searchCondition}) OR p."accountId" = ANY($${params.length}::uuid[]))`);
      } else {
        conditions.push(`(${searchCondition})`);
      }
    }

    if (organizationType && VALID_ORGANIZATION_TYPES.has(organizationType)) {
      params.push(organizationType);
      conditions.push(`p."organizationType" = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sortDirection = order === "asc" ? "ASC" : "DESC";

    const countResult = await ojcPool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM "Profiles" p
       ${where}`,
      params,
    );

    const total = countResult.rows[0]?.total ?? 0;
    if (total === 0) return { organizations: [], total };

    params.push(limit);
    params.push(offset);

    const { rows: profiles } = await ojcPool.query<{
      profileId: string;
      accountId: string;
      legalName: string | null;
      username: string;
      bio: string | null;
      avatarUrl: string | null;
      organizationType: string | null;
      role: string | null;
      website: string | null;
      country: string | null;
      city: string | null;
      createdAt: string;
      kybStatus: string | null;
    }>(
      `SELECT
         p."profileId",
         p."accountId",
         p."legalName",
         p."username",
         p."bio",
         p."avatarUrl",
         p."organizationType",
         p."role",
         p."website",
         p."country",
         p."city",
         p."createdAt",
         p."verificationStatus" AS "kybStatus"
       FROM "Profiles" p
       ${where}
       ORDER BY p."createdAt" ${sortDirection}
       LIMIT $${params.length - 1}
       OFFSET $${params.length}`,
      params,
    );

    if (profiles.length === 0) return { organizations: [], total };

    const accountIds = profiles.map((profile) => profile.accountId);
    const profileIds = profiles.map((profile) => profile.profileId);

    const [accountMap, campaignMap] = await Promise.all([
      this.getAccountMap(accountIds),
      this.getCampaignAggregateMap(profileIds),
    ]);

    const organizations: OrganizationListItem[] = profiles.map((profile) => {
      const aggregate = campaignMap[profile.profileId] ?? {
        campaignCount: 0,
        activeCampaigns: 0,
        totalRaised: 0,
      };

      return {
        ...profile,
        email: accountMap[profile.accountId]?.email ?? null,
        accountStatus: accountMap[profile.accountId]?.status ?? null,
        verificationStatus: this.mapKybStatus(profile.kybStatus),
        campaignCount: aggregate.campaignCount,
        activeCampaigns: aggregate.activeCampaigns,
        totalRaised: aggregate.totalRaised,
      };
    });

    return { organizations, total };
  }

  public async getOrganizationProfile(profileId: string): Promise<OrganizationProfile | null> {
    const { rows } = await ojcPool.query<{
      profileId: string;
      accountId: string;
      legalName: string | null;
      username: string;
      bio: string | null;
      avatarUrl: string | null;
      organizationType: string | null;
      role: string | null;
      taxId: string | null;
      website: string | null;
      socialLinks: unknown;
      country: string | null;
      city: string | null;
      createdAt: string;
      kybStatus: string | null;
    }>(
      `SELECT
         p."profileId",
         p."accountId",
         p."legalName",
         p."username",
         p."bio",
         p."avatarUrl",
         p."organizationType",
         p."role",
         p."taxId",
         p."website",
         p."socialLinks",
         p."country",
         p."city",
         p."createdAt",
         p."verificationStatus" AS "kybStatus"
       FROM "Profiles" p
       WHERE p."profileId" = $1
         AND p."profileType" = 'organization'
       LIMIT 1`,
      [profileId],
    );

    const profile = rows[0];
    if (!profile) return null;

    const [accountMap, campaignMap, campaigns] = await Promise.all([
      this.getAccountMap([profile.accountId]),
      this.getCampaignAggregateMap([profile.profileId]),
      this.getCampaigns(profile.profileId),
    ]);

    const aggregate = campaignMap[profile.profileId] ?? {
      campaignCount: 0,
      activeCampaigns: 0,
      totalRaised: 0,
    };

    return {
      profileId: profile.profileId,
      accountId: profile.accountId,
      legalName: profile.legalName,
      username: profile.username,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      organizationType: profile.organizationType,
      role: profile.role,
      website: profile.website,
      country: profile.country,
      city: profile.city,
      createdAt: profile.createdAt,
      email: accountMap[profile.accountId]?.email ?? null,
      verificationStatus: this.mapKybStatus(profile.kybStatus),
      accountStatus: accountMap[profile.accountId]?.status ?? null,
      campaignCount: aggregate.campaignCount,
      activeCampaigns: aggregate.activeCampaigns,
      totalRaised: aggregate.totalRaised,
      taxId: profile.taxId,
      socialLinks: this.parseStringArray(profile.socialLinks),
      campaigns,
    };
  }

  public async updateAccountStatus(
    profileId: string,
    status: "ACTIVE" | "INACTIVE",
  ): Promise<{ accountId: string; legalName: string | null; username: string; email: string | null; previousStatus: string | null } | null> {
    const { rows: profileRows } = await ojcPool.query<{ accountId: string; legalName: string | null; username: string }>(
      `SELECT "accountId", "legalName", "username" FROM "Profiles" WHERE "profileId" = $1 AND "profileType" = 'organization' LIMIT 1`,
      [profileId],
    );
    const profile = profileRows[0];
    if (!profile) return null;

    const { rows } = await sharedPool.query<{ previousStatus: string | null; email: string | null }>(
      `WITH before AS (SELECT "status", "email" FROM "Account" WHERE "accountId" = $2)
       UPDATE "Account"
       SET "status" = $1, "updatedAt" = NOW()
       WHERE "accountId" = $2
       RETURNING (SELECT "status" FROM before) AS "previousStatus", (SELECT "email" FROM before) AS "email"`,
      [status, profile.accountId],
    );

    return {
      accountId: profile.accountId,
      legalName: profile.legalName,
      username: profile.username,
      email: rows[0]?.email ?? null,
      previousStatus: rows[0]?.previousStatus ?? null,
    };
  }

  private async getAccountMap(accountIds: string[]) {
    if (accountIds.length === 0) return {} as Record<string, { email: string | null; status: string | null }>;

    try {
      const { rows } = await sharedPool.query<{
        accountId: string;
        email: string | null;
        status: string | null;
      }>(
        `SELECT "accountId", "email", "status"
         FROM "Account"
         WHERE "accountId" = ANY($1::uuid[])`,
        [accountIds],
      );

      return Object.fromEntries(
        rows.map((row) => [
          row.accountId,
          { email: row.email, status: row.status },
        ]),
      );
    } catch (error) {
      Logger.warn({ err: error, accountCount: accountIds.length }, "[OjcOrganizationsRepo] Failed to load account map");
      return {} as Record<string, { email: string | null; status: string | null }>;
    }
  }

  private async getVerificationMap(accountIds: string[]) {
    if (accountIds.length === 0) return {} as Record<string, VerificationStatus>;

    try {
      const { rows } = await sharedPool.query<{
        accountId: string;
        status: VerificationStatus;
      }>(
        `SELECT DISTINCT ON ("accountId") "accountId", "status"
         FROM "Verifications"
         WHERE "accountId" = ANY($1::uuid[])
         ORDER BY "accountId", "createdAt" DESC`,
        [accountIds],
      );

      return Object.fromEntries(rows.map((row) => [row.accountId, row.status]));
    } catch (error) {
      Logger.warn({ err: error, accountCount: accountIds.length }, "[OjcOrganizationsRepo] Failed to load verification map");
      return {} as Record<string, VerificationStatus>;
    }
  }

  private async getCampaignAggregateMap(profileIds: string[]) {
    if (profileIds.length === 0) {
      return {} as Record<string, { campaignCount: number; activeCampaigns: number; totalRaised: number }>;
    }

    const { rows } = await ojcPool.query<{
      profileId: string;
      campaignCount: number;
      activeCampaigns: number;
      totalRaised: string;
    }>(
      `SELECT
         c."profileId",
         COUNT(DISTINCT c."campaignId")::int AS "campaignCount",
         COUNT(DISTINCT c."campaignId") FILTER (WHERE c."status" = 'ACTIVE')::int AS "activeCampaigns",
         COALESCE(SUM(d."amount") FILTER (WHERE d."status" = 'COMPLETED'), 0)::text AS "totalRaised"
       FROM "Campaigns" c
       LEFT JOIN "Donations" d ON d."campaignId" = c."campaignId"
       WHERE c."profileId" = ANY($1::uuid[])
       GROUP BY c."profileId"`,
      [profileIds],
    );

    return Object.fromEntries(
      rows.map((row) => [
        row.profileId,
        {
          campaignCount: row.campaignCount,
          activeCampaigns: row.activeCampaigns,
          totalRaised: this.parseNumber(row.totalRaised),
        },
      ]),
    );
  }

  private async getCampaigns(profileId: string): Promise<OrganizationCampaign[]> {
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

    return rows;
  }

  private mapKybStatus(value: string | null | undefined): VerificationStatus | null {
    if (value === "verified") return "VERIFIED";
    if (value === "rejected") return "DECLINED";
    if (value === "pending") return "PENDING";
    return null;
  }

  private parseNumber(value: string | number | null | undefined) {
    if (typeof value === "number") return value;
    if (!value) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private parseStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
