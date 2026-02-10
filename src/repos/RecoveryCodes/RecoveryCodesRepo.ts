import { Service } from "typedi";
import { clientShared } from "../../loaders/postgresShared";
import Logger from "../../loaders/logger";
import { IRecoveryCodesRepo } from "./IRecoveryCodesRepo";
import { RecoveryCode } from "../../domain/RecoveryCode";
import { RecoveryCodeMap } from "../../mappers/RecoveryCodeMapper";

@Service()
export default class RecoveryCodesRepo implements IRecoveryCodesRepo {
  private table = `"RecoveryCode"`;

  public async createRecoveryCodes(recoveryCodes: RecoveryCode[]): Promise<RecoveryCode[]> {
    if (!recoveryCodes.length) return [];

    const rows = recoveryCodes.map(RecoveryCodeMap.toPersistence);

    const columns = [`"recoveryCodeId"`, `"cognitoSub"`, `"recoveryCode"`, `"createdAt"`];
    const values: unknown[] = [];
    const placeholders: string[] = [];

    rows.forEach((r, i) => {
      const base = i * columns.length;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
      values.push(r.recoveryCodeId, r.cognitoSub, r.recoveryCode, r.createdAt);
    });

    const query = `
      INSERT INTO ${this.table} (${columns.join(", ")})
      VALUES ${placeholders.join(", ")}
        RETURNING *
    `;

    await clientShared.query(query, values);
    Logger.info({ cognitoSub: rows[0].cognitoSub }, "Inserted New Recovery Codes.");

    return recoveryCodes;
  }

  public async deleteRecoveryCode(cognitoSub: string, recoveryCode: string): Promise<RecoveryCode | null> {
    const query = `
      DELETE FROM ${this.table}
      WHERE "cognitoSub" = $1
      AND "recoveryCode" = $2
      RETURNING *
    `;

    const result = await clientShared.query(query, [cognitoSub, recoveryCode]);
    if (!result.rowCount) return null;

    Logger.info({ cognitoSub: cognitoSub }, "Deleted Recovery Code.");
    return RecoveryCodeMap.toDomain(result.rows[0]);
  }
}
