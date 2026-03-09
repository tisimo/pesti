import { Inject, Service } from "typedi";
import { Result } from "../core/logic/Result";
import { Verification } from "../domain/Verification";
import { VerificationDTO } from "../dto/VerificationDTO";
import { VerificationMap } from "../mappers/VerificationMapper";
import IVerificationService from "./IServices/IVerificationService";
import { IVerificationRepo } from "../repos/Verification/IVerificationRepo";
import VerificationRepo from "../repos/Verification/VerificationRepo";

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

  public async markVerified(sessionId: string): Promise<Result<VerificationDTO>> {
    try {
      const verification = await this.verificationRepo.findBySessionId(sessionId);

      if (!verification) {
        return Result.fail<VerificationDTO>("Verification Not Found For Session!");
      }

      verification.markVerified(sessionId);
      await this.verificationRepo.save(verification);

      return Result.ok<VerificationDTO>(VerificationMap.toDTO(verification));
    } catch (error) {
      return Result.fail<VerificationDTO>(error?.message ?? "Error Marking Verification As Verified!");
    }
  }

  public async markDeclined(sessionId: string): Promise<Result<VerificationDTO>> {
    try {
      const verification = await this.verificationRepo.findBySessionId(sessionId);

      if (!verification) {
        return Result.fail<VerificationDTO>("Verification Not Found For Session!");
      }

      verification.markDeclined(sessionId);
      await this.verificationRepo.save(verification);

      return Result.ok<VerificationDTO>(VerificationMap.toDTO(verification));
    } catch (error) {
      return Result.fail<VerificationDTO>(error?.message ?? "Error Marking Verification As Declined!");
    }
  }
}
