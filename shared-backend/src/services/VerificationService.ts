import { Inject, Service } from "typedi";
import { Result } from "../core/logic/Result";
import { Verification } from "../domain/Verification";
import { VerificationData } from "../domain/VerificationData";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { VerificationDTO } from "../dto/VerificationDTO";
import { VerificationDataDTO } from "../dto/VerificationDataDTO";
import { VerificationMap } from "../mappers/VerificationMapper";
import { VerificationDataMap } from "../mappers/VerificationDataMapper";
import IVerificationService from "./IServices/IVerificationService";
import { IVerificationRepo } from "../repos/Verification/IVerificationRepo";
import VerificationRepo from "../repos/Verification/VerificationRepo";
import { IVerificationDataRepo } from "../repos/Verification/IVerificationDataRepo";
import VerificationDataRepo from "../repos/Verification/VerificationDataRepo";
import { callService } from "../utils/internalCallService";
import config from "../../config.js";
import Logger from "../loaders/logger";

@Service()
export default class VerificationService implements IVerificationService {
  constructor(
    @Inject(() => VerificationRepo) private verificationRepo: IVerificationRepo,
    @Inject(() => VerificationDataRepo) private verificationDataRepo: IVerificationDataRepo,
  ) {}

  public async getVerificationByAccountId(accountId: string): Promise<Result<VerificationDTO | null>> {
    try {
      const verification = await this.verificationRepo.findByAccountId(accountId);

      if (!verification) {
        return Result.ok<VerificationDTO | null>(null);
      }

      return Result.ok<VerificationDTO | null>(VerificationMap.toDTO(verification));
    } catch (error) {
      return Result.fail<VerificationDTO | null>(error?.message ?? "Error Getting Verification!");
    }
  }

  public async createVerification(accountId: string): Promise<Result<VerificationDTO>> {
    try {
      let verification = await this.verificationRepo.findByAccountId(accountId);

      if (!verification) {
        const now = new Date();
        const verificationOrError = Verification.create({
          accountId,
          status: "PENDING",
          createdAt: now,
          updatedAt: now,
        });

        if (verificationOrError.isFailure) {
          return Result.fail<VerificationDTO>(verificationOrError.error);
        }

        verification = verificationOrError.getValue();
        await this.verificationRepo.save(verification);
      }

      return Result.ok<VerificationDTO>(VerificationMap.toDTO(verification));
    } catch (error) {
      return Result.fail<VerificationDTO>(error?.message ?? "Error Getting Or Creating Verification!");
    }
  }

  public async updateSessionId(accountId: string, sessionId: string): Promise<Result<VerificationDTO>> {
    try {
      const verification = await this.verificationRepo.findByAccountId(accountId);

      if (!verification) {
        return Result.fail<VerificationDTO>("Verification Not Found!");
      }

      verification.updateSessionId(sessionId);
      await this.verificationRepo.save(verification);

      return Result.ok<VerificationDTO>(VerificationMap.toDTO(verification));
    } catch (error) {
      return Result.fail<VerificationDTO>(error?.message ?? "Error Recording Veriff Session!");
    }
  }

  public async handleWebhook(sessionId: string, veriffStatus: string): Promise<Result<void>> {
    try {
      if (veriffStatus !== "approved" && veriffStatus !== "declined") {
        return Result.ok<void>();
      }

      const verification = await this.verificationRepo.findBySessionId(sessionId);

      if (!verification) {
        return Result.fail<void>("Verification Not Found For Session!");
      }

      if (veriffStatus === "approved") {
        verification.markVerified(sessionId);
        await this.verificationRepo.save(verification);

        try {
          await callService(config.backends.causes.url, "/internal/profile/verify", {
            method: "POST",
            body: JSON.stringify({ accountId: verification.accountId }),
          });
        } catch (error) {
          Logger.error({ error, accountId: verification.accountId }, "Failed To Notify BackEnd!");
        }
      } else {
        verification.markDeclined(sessionId);
        await this.verificationRepo.save(verification);
      }

      return Result.ok<void>();
    } catch (error) {
      return Result.fail<void>(error?.message ?? "Error Processing Veriff Webhook!");
    }
  }

  public async saveVerificationData(
    sessionId: string,
    verificationDataDTO: VerificationDataDTO,
  ): Promise<Result<VerificationDataDTO>> {
    try {
      const verification = await this.verificationRepo.findBySessionId(sessionId);

      if (!verification) {
        return Result.fail<VerificationDataDTO>("Verification Not Found For Session!");
      }

      const now = new Date();
      const verificationId = verification.verificationId.toString();

      const dataOrError = VerificationData.create(
        {
          firstName: verificationDataDTO.firstName,
          lastName: verificationDataDTO.lastName,
          birthDate: verificationDataDTO.birthDate ? new Date(verificationDataDTO.birthDate) : undefined,
          gender: verificationDataDTO.gender,
          country: verificationDataDTO.country,
          documentType: verificationDataDTO.documentType,
          createdAt: now,
          updatedAt: now,
        },
        new UniqueEntityID(verificationId),
      );

      if (dataOrError.isFailure) {
        return Result.fail<VerificationDataDTO>(dataOrError.error);
      }

      const saved = await this.verificationDataRepo.saveVerificationData(dataOrError.getValue());

      return Result.ok<VerificationDataDTO>(VerificationDataMap.toDTO(saved));
    } catch (error) {
      return Result.fail<VerificationDataDTO>(error?.message ?? "Error Saving Verification Data!");
    }
  }
}
