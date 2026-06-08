import { Service } from "typedi";
import { clientShared } from "../../loaders/postgresShared";
import { Account } from "../../domain/Account";
import { AccountMap } from "../../mappers/AccountMapper";
import { IAccountRepo } from "./IAccountRepo";
import Logger from "../../loaders/logger";

@Service()
export default class AccountRepo implements IAccountRepo {
  private table = `"Account"`;

  public async getAccountByCognitoSub(cognitoSub: string): Promise<Account | null> {
    const query = `
      SELECT *
      FROM ${this.table}
      WHERE "cognitoSub" = $1
      LIMIT 1
    `;

    const result = await clientShared.query(query, [cognitoSub]);
    if (!result.rowCount) return null;

    return AccountMap.toDomain(result.rows[0]);
  }

  public async getAccountByAccountId(accountId: string): Promise<Account | null> {
    const query = `
      SELECT *
      FROM ${this.table}
      WHERE "accountId" = $1
      LIMIT 1
    `;

    const result = await clientShared.query(query, [accountId]);
    if (!result.rowCount) return null;

    return AccountMap.toDomain(result.rows[0]);
  }

  public async getAccountByEmail(email: string): Promise<Account | null> {
    const query = `
      SELECT *
      FROM ${this.table}
      WHERE "email" = $1
      LIMIT 1
    `;

    const result = await clientShared.query(query, [email]);
    if (!result.rowCount) return null;

    return AccountMap.toDomain(result.rows[0]);
  }

  public async createAccount(account: Account): Promise<Account> {
    const persistenceAccount = AccountMap.toPersistence(account);

    const query = `
      INSERT INTO ${this.table} (
        "accountId",
        "cognitoSub",
        "email",
        "role",
        "status",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `;

    const values = [
      persistenceAccount.accountId,
      persistenceAccount.cognitoSub,
      persistenceAccount.email,
      persistenceAccount.role,
      persistenceAccount.status,
      persistenceAccount.createdAt,
      persistenceAccount.updatedAt,
    ];

    await clientShared.query(query, values);
    Logger.info({ email: persistenceAccount.email }, "Inserted New Account.");

    return account;
  }

  public async deleteAccountByCognitoSub(cognitoSub: string): Promise<Account | null> {
    const query = `
      UPDATE ${this.table}
      SET "status" = $1, "updatedAt" = NOW()
      WHERE "cognitoSub" = $2
      RETURNING *
    `;

    const result = await clientShared.query(query, ["INACTIVE", cognitoSub]);
    if (!result.rowCount) return null;

    Logger.info("Deleted Account.");
    return AccountMap.toDomain(result.rows[0]);
  }
}
