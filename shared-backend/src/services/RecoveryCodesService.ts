import { Inject, Service } from "typedi";
import * as crypto from "crypto";
import { Result } from "../core/logic/Result";
import { RecoveryCodeDTO } from "../dto/RecoveryCodesDTO";
import IRecoveryCodesService from "./IServices/IRecoveryCodesService";
import RecoveryCodesRepo from "../repos/RecoveryCodes/RecoveryCodesRepo";
import { IRecoveryCodesRepo } from "../repos/RecoveryCodes/IRecoveryCodesRepo";
import { RecoveryCode } from "../domain/RecoveryCode";
import { RecoveryCodeMap } from "../mappers/RecoveryCodeMapper";

type GeneratedRecoveryCodes = {
  plainCodes: string[];
  hashedCodes: string[];
};

@Service()
export default class RecoveryCodesService implements IRecoveryCodesService {
  constructor(@Inject(() => RecoveryCodesRepo) private recoveryCodesRepo: IRecoveryCodesRepo) {}

  public async generateRecoveryCodes(cognitoSub: string): Promise<Result<RecoveryCodeDTO[]>> {
    try {
      const { plainCodes, hashedCodes } = this.generateCodes(10, cognitoSub);
      const now = new Date(Date.now());

      const domainCodes: RecoveryCode[] = [];
      for (const hashed of hashedCodes) {
        const recoveryCodeOrError = RecoveryCode.create({
          cognitoSub,
          recoveryCode: hashed,
          createdAt: now,
        });

        if (recoveryCodeOrError.isFailure) {
          return Result.fail<RecoveryCodeDTO[]>(String(recoveryCodeOrError.error));
        }

        domainCodes.push(recoveryCodeOrError.getValue());
      }

      await this.recoveryCodesRepo.createRecoveryCodes(domainCodes);

      const dto: RecoveryCodeDTO[] = plainCodes.map((plain: string) => ({
        cognitoSub,
        recoveryCode: plain,
      }));

      return Result.ok<RecoveryCodeDTO[]>(dto);
    } catch (error) {
      return Result.fail<RecoveryCodeDTO[]>(error?.message ?? "Error Generating Recovery Codes!");
    }
  }

  public async deleteRecoveryCode(cognitoSub: string, recoveryCode: string): Promise<Result<RecoveryCodeDTO>> {
    try {
      const deletedCode = await this.recoveryCodesRepo.deleteRecoveryCode(cognitoSub, recoveryCode);

      if (!deletedCode) {
        return Result.fail<RecoveryCodeDTO>("Recovery Code Not Found.");
      }

      return Result.ok<RecoveryCodeDTO>(RecoveryCodeMap.toDTO(deletedCode));
    } catch (error) {
      return Result.fail<RecoveryCodeDTO>(error?.message ?? "Error Deleting Recovery Code!");
    }
  }

  /**
   * Generates MFA Recovery Codes and Hashes Them For Storage.
   */
  private generateCodes(count: number, cognitoSub: string): GeneratedRecoveryCodes {
    const plainSet = new Set<string>();
    const plainCodes: string[] = [];
    const hashedCodes: string[] = [];

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    while (plainSet.size < count) {
      const bytes = crypto.randomBytes(12);

      let plain = "";
      for (let i = 0; i < 12; i++) {
        plain += alphabet[bytes[i] % alphabet.length];
      }

      if (plainSet.has(plain)) continue;

      const hash = crypto.createHash("sha256").update(`${cognitoSub}:${plain}`).digest("hex");

      plainSet.add(plain);
      plainCodes.push(plain);
      hashedCodes.push(hash);
    }

    return { plainCodes, hashedCodes };
  }
}
