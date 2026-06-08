import { Mapper } from "../core/infra/Mapper";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { RecoveryCodePersistence } from "../dataschema/RecoveryCodePersistence";
import { RecoveryCode } from "../domain/RecoveryCode";
import { RecoveryCodeDTO } from "../dto/RecoveryCodesDTO";

export class RecoveryCodeMap extends Mapper<RecoveryCode> {
  /**
   * DOMAIN -> DTO
   */
  public static toDTO(recoveryCode: RecoveryCode): RecoveryCodeDTO {
    return {
      cognitoSub: recoveryCode.cognitoSub,
      recoveryCode: recoveryCode.recoveryCode,
    };
  }

  /**
   * DTO -> DOMAIN
   */
  public static toDomain(recoveryCodeDTO: RecoveryCodeDTO): RecoveryCode {
    const now = new Date(Date.now());

    const recoveryCodeOrError = RecoveryCode.create({
      cognitoSub: recoveryCodeDTO.cognitoSub,
      recoveryCode: recoveryCodeDTO.recoveryCode,
      createdAt: now,
    });

    if (recoveryCodeOrError.isFailure) {
      throw new Error(`RecoveryCodeMap.toDomain Failed: ${recoveryCodeOrError.error}`);
    }

    return recoveryCodeOrError.getValue();
  }

  /**
   * DOMAIN -> PERSISTENCE
   */
  public static toPersistence(recoveryCode: RecoveryCode): RecoveryCodePersistence {
    return {
      recoveryCodeId: recoveryCode.id.toString(),
      cognitoSub: recoveryCode.cognitoSub,
      recoveryCode: recoveryCode.recoveryCode,
      createdAt: recoveryCode.createdAt,
    };
  }

  /**
   * PERSISTENCE -> DOMAIN
   */
  public static fromPersistence(recoveryCodePersistence: RecoveryCodePersistence): RecoveryCode {
    const recoveryCodeOrError = RecoveryCode.create(
      {
        cognitoSub: recoveryCodePersistence.cognitoSub,
        recoveryCode: recoveryCodePersistence.recoveryCode,
        createdAt: new Date(recoveryCodePersistence.createdAt),
      },
      new UniqueEntityID(recoveryCodePersistence.recoveryCodeId),
    );

    if (recoveryCodeOrError.isFailure) {
      throw new Error(`RecoveryCodeMap.fromPersistence Failed: ${recoveryCodeOrError.error}`);
    }

    return recoveryCodeOrError.getValue();
  }
}
