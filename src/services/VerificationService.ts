import { Inject, Service } from "typedi";
import { Result } from "../core/logic/Result";
import { Verification } from "../domain/Verification";
import { VerificationDTO } from "../dto/VerificationDTO";
import { VerificationMap } from "../mappers/VerificationMapper";
import IVerificationService from "./IServices/IVerificationService";
import { IVerificationRepo } from "../repos/Verification/IVerificationRepo";
import VerificationRepo from "../repos/Verification/VerificationRepo";
import { callService } from "../utils/internalCallService";
import config from "../../config.js";
import Logger from "../loaders/logger";

@Service()
export default class VerificationService implements IVerificationService {
  constructor(@Inject(() => VerificationRepo) private verificationRepo: IVerificationRepo) {}

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

        await callService(config.backends.causes.url, "/internal/profile/verify", {
          method: "POST",
          body: JSON.stringify({ accountId: verification.accountId }),
        });
      } else {
        verification.markDeclined(sessionId);
      }

      await this.verificationRepo.save(verification);

      return Result.ok<void>();
    } catch (error) {
      return Result.fail<void>(error?.message ?? "Error Processing Veriff Webhook!");
    }
  }
}
