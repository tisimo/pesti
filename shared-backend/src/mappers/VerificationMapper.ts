import { Mapper } from "../core/infra/Mapper";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { Verification, VerificationStatus } from "../domain/Verification";
import { VerificationDTO } from "../dto/VerificationDTO";
import { VerificationPersistence } from "../dataschema/VerificationPersistence";

export class VerificationMap extends Mapper<Verification> {
  public static toDTO(verification: Verification): VerificationDTO {
    return {
      verificationId: verification.verificationId.toString(),
      accountId: verification.accountId,
      status: verification.status,
      veriffSessionId: verification.veriffSessionId,
      verifiedAt: verification.verifiedAt?.toISOString(),
      createdAt: verification.createdAt.toISOString(),
      updatedAt: verification.updatedAt.toISOString(),
    };
  }

  public static toDomain(raw: VerificationPersistence): Verification {
    const verificationOrError = Verification.create(
      {
        accountId: raw.accountId,
        status: raw.status as VerificationStatus,
        veriffSessionId: raw.veriffSessionId ?? undefined,
        verifiedAt: raw.verifiedAt ?? undefined,
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
      },
      new UniqueEntityID(raw.verificationId),
    );

    if (verificationOrError.isFailure) {
      throw new Error(`VerificationMap.toDomain Failed: ${verificationOrError.error}`);
    }

    return verificationOrError.getValue();
  }

  public static toPersistence(verification: Verification): VerificationPersistence {
    return {
      verificationId: verification.verificationId.toString(),
      accountId: verification.accountId,
      status: verification.status,
      veriffSessionId: verification.veriffSessionId,
      verifiedAt: verification.verifiedAt,
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
    };
  }
}
