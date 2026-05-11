import { Service } from "typedi";
import { clientShared } from "../../loaders/postgresShared";
import { VerificationData } from "../../domain/VerificationData";
import { VerificationDataMap } from "../../mappers/VerificationDataMapper";
import { IVerificationDataRepo } from "./IVerificationDataRepo";
import Logger from "../../loaders/logger";

@Service()
export default class VerificationDataRepo implements IVerificationDataRepo {
  private table = `"VerificationData"`;

  public async findByVerificationId(verificationId: string): Promise<VerificationData | null> {
    const query = `
      SELECT *
      FROM ${this.table}
      WHERE "verificationId" = $1
      LIMIT 1
    `;

    const result = await clientShared.query(query, [verificationId]);
    if (!result.rowCount) return null;

    return VerificationDataMap.toDomain(result.rows[0]);
  }

  public async findByAccountId(accountId: string): Promise<VerificationData | null> {
    const query = `
      SELECT vd.*
      FROM ${this.table} vd
      JOIN "Verifications" v ON v."verificationId" = vd."verificationId"
      WHERE v."accountId" = $1
      LIMIT 1
    `;

    const result = await clientShared.query(query, [accountId]);
    if (!result.rowCount) return null;

    return VerificationDataMap.toDomain(result.rows[0]);
  }

  public async saveVerificationData(data: VerificationData): Promise<VerificationData> {
    const p = VerificationDataMap.toPersistence(data);

    const query = `
      INSERT INTO ${this.table} (
        "verificationId",
        "firstName",
        "lastName",
        "birthDate",
        "gender",
        "country",
        "documentType",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const values = [
      p.verificationId,
      p.firstName ?? null,
      p.lastName ?? null,
      p.birthDate ?? null,
      p.gender ?? null,
      p.country ?? null,
      p.documentType ?? null,
      p.createdAt,
      p.updatedAt,
    ];

    await clientShared.query(query, values);
    Logger.info({ verificationId: p.verificationId }, "Verification Data Saved.");

    return data;
  }
}
