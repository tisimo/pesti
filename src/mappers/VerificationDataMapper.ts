import { Mapper } from "../core/infra/Mapper";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { VerificationData } from "../domain/VerificationData";
import { VerificationDataDTO } from "../dto/VerificationDataDTO";
import { VerificationDataPersistence } from "../dataschema/VerificationDataPersistence";

export class VerificationDataMap extends Mapper<VerificationData> {
  public static toDTO(data: VerificationData): VerificationDataDTO {
    return {
      verificationId: data.verificationId.toString(),
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate?.toISOString(),
      gender: data.gender,
      country: data.country,
      documentType: data.documentType,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
    };
  }

  public static toDomain(raw: VerificationDataPersistence): VerificationData {
    const dataOrError = VerificationData.create(
      {
        firstName: raw.firstName ?? undefined,
        lastName: raw.lastName ?? undefined,
        birthDate: raw.birthDate ?? undefined,
        gender: raw.gender ?? undefined,
        country: raw.country ?? undefined,
        documentType: raw.documentType ?? undefined,
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
      },
      new UniqueEntityID(raw.verificationId),
    );

    if (dataOrError.isFailure) {
      throw new Error(`VerificationDataMap.toDomain Failed: ${dataOrError.error}`);
    }

    return dataOrError.getValue();
  }

  public static toPersistence(data: VerificationData): VerificationDataPersistence {
    return {
      verificationId: data.verificationId.toString(),
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate,
      gender: data.gender,
      country: data.country,
      documentType: data.documentType,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
