import { Service } from "typedi";
import { sharedPool } from "../../loaders/postgresShared";
import { ojcPool } from "../../loaders/postgres";
import Logger from "../../loaders/logger";

export interface KycEntry {
  verificationId: string;
  accountId: string;
  profileId: string | null;
  status: "PENDING" | "VERIFIED" | "DECLINED";
  veriffSessionId: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  country: string | null;
  email: string | null;
  accountStatus: string | null;
  verificationData: KycVerificationData | null;
  comparison: KycComparison;
}

export interface KycPage {
  entries: KycEntry[];
  total: number;
  stats: KycStats;
  filterOptions: KycFilterOptions;
}

export interface KycStats {
  total: number;
  pending: number;
  verified: number;
  declined: number;
  mismatches: number;
  missingProviderData: number;
  stalePending: number;
  inactiveAccounts: number;
}

export interface KycFilterOptions {
  countries: string[];
  documentTypes: string[];
}

export interface KycListFilters {
  status?: string;
  search?: string;
  comparison?: "mismatch" | "match" | "no_provider";
  documentType?: string;
  country?: string;
  overdue?: boolean;
}

export interface KycVerificationData {
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  gender: string | null;
  country: string | null;
  documentType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface KycComparisonField {
  key: "firstName" | "lastName" | "country";
  label: string;
  platformValue: string | null;
  verificationValue: string | null;
  matches: boolean | null;
}

export interface KycComparison {
  checkedFields: KycComparisonField[];
  mismatchCount: number;
  missingVerificationData: boolean;
}

@Service()
export default class OjcKycRepo {
  public async getByVerificationId(verificationId: string): Promise<KycEntry | null> {
    const { rows } = await sharedPool.query<{
      verificationId: string;
      accountId: string;
      status: "PENDING" | "VERIFIED" | "DECLINED";
      veriffSessionId: string | null;
      verifiedAt: string | null;
      createdAt: string;
      updatedAt: string;
      email: string | null;
      accountStatus: string | null;
      dataFirstName: string | null;
      dataLastName: string | null;
      dataBirthDate: string | null;
      dataGender: string | null;
      dataCountry: string | null;
      dataDocumentType: string | null;
      dataCreatedAt: string | null;
      dataUpdatedAt: string | null;
    }>(
      `SELECT v."verificationId", v."accountId", v."status", v."veriffSessionId",
              v."verifiedAt", v."createdAt", v."updatedAt",
              a."email",
              a."status" AS "accountStatus",
              vd."firstName" AS "dataFirstName",
              vd."lastName" AS "dataLastName",
              vd."birthDate"::text AS "dataBirthDate",
              vd."gender" AS "dataGender",
              vd."country" AS "dataCountry",
              vd."documentType" AS "dataDocumentType",
              vd."createdAt" AS "dataCreatedAt",
              vd."updatedAt" AS "dataUpdatedAt"
       FROM "Verifications" v
       LEFT JOIN "VerificationData" vd ON vd."verificationId" = v."verificationId"
       LEFT JOIN "Account" a ON a."accountId" = v."accountId"
       WHERE v."verificationId" = $1
       LIMIT 1`,
      [verificationId],
    );

    const verification = rows[0];
    if (!verification) return null;

    let profile: { profileId: string; firstName: string; lastName: string; username: string; country: string } | null = null;
    try {
      const { rows: profiles } = await ojcPool.query<{
        profileId: string;
        firstName: string;
        lastName: string;
        username: string;
        country: string;
      }>(
        `SELECT "profileId", "firstName", "lastName", "username", "country"
         FROM "Profiles"
         WHERE "accountId" = $1
         LIMIT 1`,
        [verification.accountId],
      );
      profile = profiles[0] ?? null;
    } catch (error) {
      Logger.warn({ err: error, accountId: verification.accountId }, "[OjcKycRepo] Failed to load profile for verification");
      /* continue without profile data */
    }

    return this.buildEntry(verification, profile, {
      email: verification.email ?? null,
      status: verification.accountStatus ?? null,
    });
  }

  public async list(filters: KycListFilters, limit: number, offset: number): Promise<KycPage> {
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`v."status" = $${params.length}`);
    }

    if (filters.documentType) {
      params.push(filters.documentType);
      conditions.push(`vd."documentType" = $${params.length}`);
    }

    const profileAccountIds = filters.search ? await this.findProfileAccountIds(filters.search) : [];
    if (filters.search) {
      const searchParam = `%${filters.search.trim()}%`;
      params.push(searchParam);
      const searchIndex = params.length;
      params.push(profileAccountIds);
      const accountIdsIndex = params.length;
      conditions.push(`(
        v."verificationId"::text ILIKE $${searchIndex}
        OR v."accountId"::text ILIKE $${searchIndex}
        OR COALESCE(v."veriffSessionId", '') ILIKE $${searchIndex}
        OR COALESCE(a."email", '') ILIKE $${searchIndex}
        OR COALESCE(vd."firstName", '') ILIKE $${searchIndex}
        OR COALESCE(vd."lastName", '') ILIKE $${searchIndex}
        OR COALESCE(vd."country", '') ILIKE $${searchIndex}
        OR COALESCE(vd."documentType", '') ILIKE $${searchIndex}
        OR v."accountId" = ANY($${accountIdsIndex}::uuid[])
      )`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const overallEntries = await this.loadAllEntriesForStats();
    const overallStats = this.buildStats(overallEntries);
    const overallFilterOptions = await this.buildFilterOptions(overallEntries);

    const { rows: verifications } = await sharedPool.query<{
      verificationId: string;
      accountId: string;
      status: "PENDING" | "VERIFIED" | "DECLINED";
      veriffSessionId: string | null;
      verifiedAt: string | null;
      createdAt: string;
      updatedAt: string;
      dataFirstName: string | null;
      dataLastName: string | null;
      dataBirthDate: string | null;
      dataGender: string | null;
      dataCountry: string | null;
      dataDocumentType: string | null;
      dataCreatedAt: string | null;
      dataUpdatedAt: string | null;
      email: string | null;
      accountStatus: string | null;
    }>(
      `SELECT v."verificationId", v."accountId", v."status", v."veriffSessionId",
              v."verifiedAt", v."createdAt", v."updatedAt",
              a."email",
              a."status" AS "accountStatus",
              vd."firstName" AS "dataFirstName",
              vd."lastName" AS "dataLastName",
              vd."birthDate"::text AS "dataBirthDate",
              vd."gender" AS "dataGender",
              vd."country" AS "dataCountry",
              vd."documentType" AS "dataDocumentType",
              vd."createdAt" AS "dataCreatedAt",
              vd."updatedAt" AS "dataUpdatedAt"
       FROM "Verifications" v
       LEFT JOIN "VerificationData" vd ON vd."verificationId" = v."verificationId"
       LEFT JOIN "Account" a ON a."accountId" = v."accountId"
       ${where}
       ORDER BY v."createdAt" DESC`,
      params,
    );

    if (verifications.length === 0) {
      return {
        entries: [],
        total: 0,
        stats: overallStats,
        filterOptions: overallFilterOptions,
      };
    }

    const accountIds = verifications.map(v => v.accountId);

    let profileMap: Record<string, { profileId: string; firstName: string; lastName: string; username: string; country: string }> = {};
    try {
      const { rows: profiles } = await ojcPool.query<{
        accountId: string;
        profileId: string;
        firstName: string;
        lastName: string;
        username: string;
        country: string;
      }>(
        `SELECT "accountId", "profileId", "firstName", "lastName", "username", "country"
         FROM "Profiles"
         WHERE "accountId" = ANY($1::uuid[])`,
        [accountIds],
      );
      profileMap = Object.fromEntries(profiles.map(p => [p.accountId, p]));
    } catch (error) {
      Logger.warn({ err: error, accountCount: accountIds.length }, "[OjcKycRepo] Failed to load profiles for list");
      /* continue without profile data */
    }

    const allEntries = verifications.map(v => this.buildEntry(v, profileMap[v.accountId] ?? null, {
      email: v.email,
      status: v.accountStatus,
    }));
    const filteredEntries = this.applyEntryFilters(allEntries, filters);
    const entries = filteredEntries.slice(offset, offset + limit);

    return {
      entries,
      total: filteredEntries.length,
      stats: overallStats,
      filterOptions: overallFilterOptions,
    };
  }

  private async loadAllEntriesForStats(): Promise<KycEntry[]> {
    const { rows: verifications } = await sharedPool.query<{
      verificationId: string;
      accountId: string;
      status: "PENDING" | "VERIFIED" | "DECLINED";
      veriffSessionId: string | null;
      verifiedAt: string | null;
      createdAt: string;
      updatedAt: string;
      dataFirstName: string | null;
      dataLastName: string | null;
      dataBirthDate: string | null;
      dataGender: string | null;
      dataCountry: string | null;
      dataDocumentType: string | null;
      dataCreatedAt: string | null;
      dataUpdatedAt: string | null;
      email: string | null;
      accountStatus: string | null;
    }>(
      `SELECT v."verificationId", v."accountId", v."status", v."veriffSessionId",
              v."verifiedAt", v."createdAt", v."updatedAt",
              a."email",
              a."status" AS "accountStatus",
              vd."firstName" AS "dataFirstName",
              vd."lastName" AS "dataLastName",
              vd."birthDate"::text AS "dataBirthDate",
              vd."gender" AS "dataGender",
              vd."country" AS "dataCountry",
              vd."documentType" AS "dataDocumentType",
              vd."createdAt" AS "dataCreatedAt",
              vd."updatedAt" AS "dataUpdatedAt"
       FROM "Verifications" v
       LEFT JOIN "VerificationData" vd ON vd."verificationId" = v."verificationId"
       LEFT JOIN "Account" a ON a."accountId" = v."accountId"`,
      [],
    );

    if (verifications.length === 0) return [];

    const accountIds = verifications.map(v => v.accountId);
    let profileMap: Record<string, { profileId: string; firstName: string; lastName: string; username: string; country: string }> = {};
    try {
      const { rows: profiles } = await ojcPool.query<{
        accountId: string;
        profileId: string;
        firstName: string;
        lastName: string;
        username: string;
        country: string;
      }>(
        `SELECT "accountId", "profileId", "firstName", "lastName", "username", "country"
         FROM "Profiles"
         WHERE "accountId" = ANY($1::uuid[])`,
        [accountIds],
      );
      profileMap = Object.fromEntries(profiles.map(p => [p.accountId, p]));
    } catch (error) {
      Logger.warn({ err: error, accountCount: accountIds.length }, "[OjcKycRepo] Failed to load profiles for KYC stats");
      /* continue without profile data */
    }

    return verifications.map(v => this.buildEntry(v, profileMap[v.accountId] ?? null, {
      email: v.email,
      status: v.accountStatus,
    }));
  }

  private async findProfileAccountIds(search: string): Promise<string[]> {
    const trimmed = search.trim();
    if (!trimmed) return [];

    try {
      const { rows } = await ojcPool.query<{ accountId: string }>(
        `SELECT "accountId"
         FROM "Profiles"
         WHERE "accountId" IS NOT NULL
           AND (
             "profileId"::text ILIKE $1
             OR "accountId"::text ILIKE $1
             OR COALESCE("firstName", '') ILIKE $1
             OR COALESCE("lastName", '') ILIKE $1
             OR COALESCE("username", '') ILIKE $1
             OR COALESCE("country", '') ILIKE $1
           )
         LIMIT 500`,
        [`%${trimmed}%`],
      );
      return rows.map((row) => row.accountId);
    } catch (error) {
      Logger.warn({ err: error, search: trimmed }, "[OjcKycRepo] Failed to search OJC profiles for KYC list");
      return [];
    }
  }

  private applyEntryFilters(entries: KycEntry[], filters: KycListFilters): KycEntry[] {
    return entries.filter((entry) => {
      if (filters.country) {
        const countryMatches = [entry.country, entry.verificationData?.country ?? null]
          .some((value) => this.normalizeComparable(value) === this.normalizeComparable(filters.country));
        if (!countryMatches) return false;
      }

      if (filters.comparison === "mismatch" && entry.comparison.mismatchCount === 0) return false;
      if (filters.comparison === "match" && (entry.comparison.missingVerificationData || entry.comparison.mismatchCount > 0)) return false;
      if (filters.comparison === "no_provider" && !entry.comparison.missingVerificationData) return false;
      if (filters.overdue && !this.isStalePending(entry)) return false;

      return true;
    });
  }

  private buildStats(entries: KycEntry[]): KycStats {
    return {
      total: entries.length,
      pending: entries.filter((entry) => entry.status === "PENDING").length,
      verified: entries.filter((entry) => entry.status === "VERIFIED").length,
      declined: entries.filter((entry) => entry.status === "DECLINED").length,
      mismatches: entries.filter((entry) => entry.comparison.mismatchCount > 0).length,
      missingProviderData: entries.filter((entry) => entry.comparison.missingVerificationData).length,
      stalePending: entries.filter((entry) => this.isStalePending(entry)).length,
      inactiveAccounts: entries.filter((entry) => entry.accountStatus === "INACTIVE").length,
    };
  }

  private async buildFilterOptions(entries: KycEntry[]): Promise<KycFilterOptions> {
    const countries = new Set<string>();
    const documentTypes = new Set<string>();

    entries.forEach((entry) => {
      if (entry.country) countries.add(entry.country);
      if (entry.verificationData?.country) countries.add(entry.verificationData.country);
      if (entry.verificationData?.documentType) documentTypes.add(entry.verificationData.documentType);
    });

    try {
      const { rows } = await sharedPool.query<{ documentType: string }>(
        `SELECT DISTINCT "documentType"
         FROM "VerificationData"
         WHERE "documentType" IS NOT NULL
           AND TRIM("documentType") <> ''
         ORDER BY "documentType" ASC`,
      );
      rows.forEach((row) => documentTypes.add(row.documentType));
    } catch (error) {
      Logger.warn({ err: error }, "[OjcKycRepo] Failed to load KYC document type filter options");
    }

    return {
      countries: Array.from(countries).sort(),
      documentTypes: Array.from(documentTypes).sort(),
    };
  }

  private isStalePending(entry: KycEntry): boolean {
    if (entry.status !== "PENDING") return false;

    const submittedAt = new Date(entry.createdAt).getTime();
    return Number.isFinite(submittedAt) && Date.now() - submittedAt >= 7 * 24 * 60 * 60 * 1000;
  }

  public async resetPendingVerification(verificationId: string): Promise<KycEntry | null> {
    const entry = await this.getByVerificationId(verificationId);
    if (!entry) return null;

    const client = await sharedPool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query<{ accountId: string; status: "PENDING" | "VERIFIED" | "DECLINED"; createdAt: string }>(
        `SELECT "accountId", "status", "createdAt"
         FROM "Verifications"
         WHERE "verificationId" = $1
         FOR UPDATE`,
        [verificationId],
      );
      const existing = rows[0];
      if (!existing) {
        await client.query("ROLLBACK");
        return null;
      }

      if (existing.status !== "PENDING") {
        throw new Error("Only pending KYC submissions can be reset from this action.");
      }

      const submittedAt = new Date(existing.createdAt).getTime();
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      if (!Number.isFinite(submittedAt) || Date.now() - submittedAt < oneWeekMs) {
        throw new Error("This KYC submission is not older than 7 days yet.");
      }

      await client.query(
        `DELETE FROM "Verifications"
         WHERE "verificationId" = $1`,
        [verificationId],
      );

      await client.query("COMMIT");
      return entry;
    } catch (error) {
      await client.query("ROLLBACK");
      Logger.error({ err: error, verificationId }, "[OjcKycRepo] Failed to reset pending verification");
      throw error;
    } finally {
      client.release();
    }
  }

  private buildEntry(
    verification: {
      verificationId: string;
      accountId: string;
      status: "PENDING" | "VERIFIED" | "DECLINED";
      veriffSessionId: string | null;
      verifiedAt: string | null;
      createdAt: string;
      updatedAt: string;
      dataFirstName: string | null;
      dataLastName: string | null;
      dataBirthDate: string | null;
      dataGender: string | null;
      dataCountry: string | null;
      dataDocumentType: string | null;
      dataCreatedAt: string | null;
      dataUpdatedAt: string | null;
    },
    profile: { profileId?: string; firstName: string; lastName: string; username: string; country: string } | null,
    account: { email?: string | null; status?: string | null } | null,
  ): KycEntry {
    const verificationData = this.toVerificationData(verification);
    const firstName = profile?.firstName ?? null;
    const lastName = profile?.lastName ?? null;
    const country = profile?.country ?? null;

    return {
      verificationId: verification.verificationId,
      accountId: verification.accountId,
      profileId: profile?.profileId ?? null,
      status: verification.status,
      veriffSessionId: verification.veriffSessionId,
      verifiedAt: verification.verifiedAt,
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
      firstName,
      lastName,
      username: profile?.username ?? null,
      country,
      email: account?.email ?? null,
      accountStatus: account?.status ?? null,
      verificationData,
      comparison: this.compareProfileToVerification({ firstName, lastName, country }, verificationData),
    };
  }

  private toVerificationData(row: {
    dataFirstName: string | null;
    dataLastName: string | null;
    dataBirthDate: string | null;
    dataGender: string | null;
    dataCountry: string | null;
    dataDocumentType: string | null;
    dataCreatedAt: string | null;
    dataUpdatedAt: string | null;
  }): KycVerificationData | null {
    const hasData = [
      row.dataFirstName,
      row.dataLastName,
      row.dataBirthDate,
      row.dataGender,
      row.dataCountry,
      row.dataDocumentType,
    ].some((value) => value !== null && String(value).trim() !== "");

    if (!hasData) return null;

    return {
      firstName: row.dataFirstName,
      lastName: row.dataLastName,
      birthDate: row.dataBirthDate,
      gender: row.dataGender,
      country: row.dataCountry,
      documentType: row.dataDocumentType,
      createdAt: row.dataCreatedAt,
      updatedAt: row.dataUpdatedAt,
    };
  }

  private compareProfileToVerification(
    profile: { firstName: string | null; lastName: string | null; country: string | null },
    verificationData: KycVerificationData | null,
  ): KycComparison {
    const checkedFields = [
      this.compareField("firstName", "First name", profile.firstName, verificationData?.firstName ?? null),
      this.compareField("lastName", "Last name", profile.lastName, verificationData?.lastName ?? null),
      this.compareField("country", "Country", profile.country, verificationData?.country ?? null),
    ];

    return {
      checkedFields,
      mismatchCount: checkedFields.filter((field) => field.matches === false).length,
      missingVerificationData: verificationData === null,
    };
  }

  private compareField(
    key: KycComparisonField["key"],
    label: string,
    platformValue: string | null,
    verificationValue: string | null,
  ): KycComparisonField {
    const matches = key === "firstName" || key === "lastName"
      ? this.compareNameField(platformValue, verificationValue)
      : this.compareExactField(platformValue, verificationValue);

    return {
      key,
      label,
      platformValue,
      verificationValue,
      matches,
    };
  }

  private compareExactField(platformValue: string | null | undefined, verificationValue: string | null | undefined): boolean | null {
    const normalizedPlatform = this.normalizeComparable(platformValue);
    const normalizedVerification = this.normalizeComparable(verificationValue);

    return normalizedPlatform && normalizedVerification
      ? normalizedPlatform === normalizedVerification
      : null;
  }

  private compareNameField(platformValue: string | null | undefined, verificationValue: string | null | undefined): boolean | null {
    const platformTokens = this.normalizeNameTokens(platformValue);
    const verificationTokens = this.normalizeNameTokens(verificationValue);

    if (platformTokens.length === 0 || verificationTokens.length === 0) {
      return null;
    }

    // Users often enter the names they commonly use, while KYC returns the full legal name.
    return platformTokens.every((token) => verificationTokens.includes(token));
  }

  private normalizeNameTokens(value: string | null | undefined): string[] {
    const normalized = (value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ");

    return normalized.split(/\s+/).filter(Boolean);
  }

  private normalizeComparable(value: string | null | undefined): string {
    return (value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }
}
