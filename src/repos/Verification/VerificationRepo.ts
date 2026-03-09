import { Service } from "typedi";
import { clientShared } from "../../loaders/postgresShared";
import { Verification } from "../../domain/Verification";
import { VerificationMap } from "../../mappers/VerificationMapper";
import { IVerificationRepo } from "./IVerificationRepo";
import Logger from "../../loaders/logger";

@Service()
export default class VerificationRepo implements IVerificationRepo {
  private table = `"Verifications"`;

  public async findByAccountId(accountId: string): Promise<Verification | null> {
    const query = `
      SELECT *
      FROM ${this.table}
      WHERE "accountId" = $1
      LIMIT 1
    `;

    const result = await clientShared.query(query, [accountId]);
    if (!result.rowCount) return null;

    return VerificationMap.toDomain(result.rows[0]);
  }

  public async findBySessionId(sessionId: string): Promise<Verification | null> {
    const query = `
      SELECT *
      FROM ${this.table}
      WHERE "veriffSessionId" = $1
      LIMIT 1
    `;

    const result = await clientShared.query(query, [sessionId]);
    if (!result.rowCount) return null;

    return VerificationMap.toDomain(result.rows[0]);
  }

  public async save(verification: Verification): Promise<void> {
    const p = VerificationMap.toPersistence(verification);

    const query = `
      INSERT INTO ${this.table} (
        "verificationId",
        "accountId",
        "status",
        "veriffSessionId",
        "verifiedAt",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT ("accountId") DO UPDATE SET
        "status"          = EXCLUDED."status",
        "veriffSessionId" = EXCLUDED."veriffSessionId",
        "verifiedAt"      = EXCLUDED."verifiedAt",
        "updatedAt"       = EXCLUDED."updatedAt"
    `;

    const values = [
      p.verificationId,
      p.accountId,
      p.status,
      p.veriffSessionId ?? null,
      p.verifiedAt ?? null,
      p.createdAt,
      p.updatedAt,
    ];

    await clientShared.query(query, values);
    Logger.info({ accountId: p.accountId, status: p.status }, "Verification saved.");
  }
}
