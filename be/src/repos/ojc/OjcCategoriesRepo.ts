import { Service } from "typedi";
import { ojcPool } from "../../loaders/postgres";

export interface Category {
  categoryId: string;
  name: string;
  slug: string;
  iconName: string | null;
  description: string | null;
  isActive: boolean;
  campaignCount: number;
  activeCampaigns: number;
  finishedCampaigns: number;
  totalRaised: number;
  totalDonors: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  iconName?: string | null;
  description?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  iconName?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface CategorySnapshot {
  categoryId: string;
  name: string;
  slug: string;
  iconName: string | null;
  description: string | null;
  isActive: boolean;
}

@Service()
export default class OjcCategoriesRepo {
  public async listCategories(): Promise<{ categories: Category[] }> {
    const { rows } = await ojcPool.query<{
      categoryId: string;
      name: string;
      slug: string;
      iconName: string | null;
      description: string | null;
      isActive: boolean;
      campaignCount: number;
      activeCampaigns: number;
      finishedCampaigns: number;
      totalRaised: string;
      totalDonors: number;
      createdAt: string;
      updatedAt: string;
    }>(`
      WITH campaign_stats AS (
        SELECT
          c."categoryId",
          COUNT(*)::int                                                        AS "campaignCount",
          COUNT(*) FILTER (WHERE c."status" = 'ACTIVE')::int                  AS "activeCampaigns",
          COUNT(*) FILTER (WHERE c."status" = 'FINISHED')::int                AS "finishedCampaigns"
        FROM "Campaigns" c
        GROUP BY c."categoryId"
      ),
      donor_stats AS (
        SELECT
          c."categoryId",
          COALESCE(SUM(d."amount") FILTER (WHERE d."status" = 'COMPLETED'), 0)::text AS "totalRaised",
          COUNT(DISTINCT d."profileId") FILTER (WHERE d."status" = 'COMPLETED')::int AS "totalDonors"
        FROM "Campaigns" c
        LEFT JOIN "Donations" d ON d."campaignId" = c."campaignId"
        GROUP BY c."categoryId"
      )
      SELECT
        cat."campaignCategoryId"                                           AS "categoryId",
        cat."name",
        cat."slug",
        cat."iconName",
        cat."description",
        cat."isActive",
        cat."createdAt",
        cat."updatedAt",
        COALESCE(cs."campaignCount", 0)::int                               AS "campaignCount",
        COALESCE(cs."activeCampaigns", 0)::int                             AS "activeCampaigns",
        COALESCE(cs."finishedCampaigns", 0)::int                           AS "finishedCampaigns",
        COALESCE(ds."totalRaised", '0')                                    AS "totalRaised",
        COALESCE(ds."totalDonors", 0)::int                                 AS "totalDonors"
      FROM "CampaignCategories" cat
      LEFT JOIN campaign_stats cs ON cs."categoryId" = cat."campaignCategoryId"
      LEFT JOIN donor_stats ds ON ds."categoryId" = cat."campaignCategoryId"
      ORDER BY cat."isActive" DESC, "campaignCount" DESC, cat."name" ASC
    `);

    return {
      categories: rows.map((r) => ({
        categoryId: r.categoryId,
        name: r.name,
        slug: r.slug,
        iconName: r.iconName,
        description: r.description,
        isActive: r.isActive,
        campaignCount: r.campaignCount,
        activeCampaigns: r.activeCampaigns,
        finishedCampaigns: r.finishedCampaigns,
        totalRaised: parseFloat(r.totalRaised) || 0,
        totalDonors: r.totalDonors,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    };
  }

  public async findByName(name: string, excludeId?: string): Promise<boolean> {
    const { rows } = await ojcPool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM "CampaignCategories"
         WHERE LOWER("name") = LOWER($1)
         ${excludeId ? `AND "campaignCategoryId" <> $2` : ""}
       ) AS "exists"`,
      excludeId ? [name, excludeId] : [name],
    );
    return rows[0].exists;
  }

  public async create(input: CreateCategoryInput): Promise<Category> {
    const { rows } = await ojcPool.query<{
      categoryId: string; name: string; slug: string; iconName: string | null;
      description: string | null; isActive: boolean; createdAt: string; updatedAt: string;
    }>(
      `INSERT INTO "CampaignCategories" ("campaignCategoryId", "name", "slug", "iconName", "description")
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       RETURNING "campaignCategoryId" AS "categoryId", "name", "slug", "iconName", "description", "isActive", "createdAt", "updatedAt"`,
      [input.name.trim(), input.slug, input.iconName?.trim() ?? null, input.description?.trim() ?? null],
    );
    return { ...rows[0], campaignCount: 0, activeCampaigns: 0, finishedCampaigns: 0, totalRaised: 0, totalDonors: 0 };
  }

  public async update(categoryId: string, input: UpdateCategoryInput): Promise<boolean> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined)        { sets.push(`"name" = $${idx++}`);        values.push(input.name.trim()); }
    if (input.slug !== undefined)        { sets.push(`"slug" = $${idx++}`);        values.push(input.slug); }
    if (input.iconName !== undefined)    { sets.push(`"iconName" = $${idx++}`);    values.push(input.iconName?.trim() ?? null); }
    if (input.description !== undefined) { sets.push(`"description" = $${idx++}`); values.push(input.description?.trim() ?? null); }
    if (input.isActive !== undefined)    { sets.push(`"isActive" = $${idx++}`);    values.push(input.isActive); }

    if (sets.length === 0) return false;

    sets.push(`"updatedAt" = NOW()`);
    values.push(categoryId);

    const { rowCount } = await ojcPool.query(
      `UPDATE "CampaignCategories" SET ${sets.join(", ")} WHERE "campaignCategoryId" = $${idx}`,
      values,
    );
    return (rowCount ?? 0) > 0;
  }

  public async delete(categoryId: string): Promise<boolean> {
    const { rowCount } = await ojcPool.query(
      `DELETE FROM "CampaignCategories" WHERE "campaignCategoryId" = $1`,
      [categoryId],
    );
    return (rowCount ?? 0) > 0;
  }

  public async campaignCount(categoryId: string): Promise<number> {
    const { rows } = await ojcPool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "Campaigns" WHERE "categoryId" = $1`,
      [categoryId],
    );
    return parseInt(rows[0].count, 10);
  }

  public async getById(categoryId: string): Promise<CategorySnapshot | null> {
    const { rows } = await ojcPool.query<CategorySnapshot>(
      `SELECT
         "campaignCategoryId" AS "categoryId",
         "name",
         "slug",
         "iconName",
         "description",
         "isActive"
       FROM "CampaignCategories"
       WHERE "campaignCategoryId" = $1`,
      [categoryId],
    );
    return rows[0] ?? null;
  }

  public toSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}
