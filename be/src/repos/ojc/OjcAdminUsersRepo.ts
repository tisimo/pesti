import { Service } from "typedi";
import { sharedPool } from "../../loaders/postgresShared";
import { ojcPool } from "../../loaders/postgres";
import Logger from "../../loaders/logger";

export interface AdminAccount {
  accountId: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export interface AdminUsersPage {
  admins: AdminAccount[];
  total: number;
}

@Service()
export default class OjcAdminUsersRepo {
  public async listAdmins(search: string | undefined, limit: number, offset: number): Promise<AdminUsersPage> {
    const params: any[] = [["ADMIN", "SUPER_ADMIN", "MODERATOR"]];
    const conditions: string[] = [`a."role" = ANY($1)`];

    if (search) {
      params.push(`%${search.trim()}%`);
      const n = params.length;
      conditions.push(`(a."email" ILIKE $${n})`);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const countResult = await sharedPool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM "Account" a ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total ?? 0;

    params.push(limit, offset);
    const { rows: accounts } = await sharedPool.query<{
      accountId: string; email: string; role: string; status: string; createdAt: string;
    }>(
      `SELECT "accountId", "email", "role", "status", "createdAt"
       FROM "Account" a
       ${where}
       ORDER BY a."createdAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    if (accounts.length === 0) return { admins: [], total };

    const accountIds = accounts.map((a) => a.accountId);
    let profileMap: Record<string, { firstName: string; lastName: string; username: string; avatarUrl: string | null }> = {};

    try {
      const { rows: profiles } = await ojcPool.query<{
        accountId: string; firstName: string; lastName: string; username: string; avatarUrl: string | null;
      }>(
        `SELECT "accountId", "firstName", "lastName", "username", "avatarUrl"
         FROM "Profiles"
         WHERE "accountId" = ANY($1::uuid[])`,
        [accountIds],
      );
      profileMap = Object.fromEntries(profiles.map((p) => [p.accountId, p]));
    } catch (error) {
      Logger.warn({ err: error, accountCount: accountIds.length }, "[OjcAdminUsersRepo] Failed to load profiles");
      // OJC DB unavailable — continue without profile data
    }

    const admins: AdminAccount[] = accounts.map((a) => ({
      accountId: a.accountId,
      email: a.email,
      role: a.role,
      status: a.status,
      createdAt: a.createdAt,
      firstName: profileMap[a.accountId]?.firstName ?? null,
      lastName: profileMap[a.accountId]?.lastName ?? null,
      username: profileMap[a.accountId]?.username ?? null,
      avatarUrl: profileMap[a.accountId]?.avatarUrl ?? null,
    }));

    return { admins, total };
  }
}
