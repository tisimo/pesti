import type { Result } from "../../core/logic/Result";
import type { VerificationDTO } from "../../dto/VerificationDTO";
import type { VerificationDataDTO } from "../../dto/VerificationDataDTO";

export default interface IVerificationService {
  createVerification(accountId: string): Promise<Result<VerificationDTO>>;
  updateSessionId(accountId: string, sessionId: string): Promise<Result<VerificationDTO>>;
  handleWebhook(sessionId: string, veriffStatus: string): Promise<Result<void>>;
  saveVerificationData(sessionId: string, verificationDataDTO: VerificationDataDTO): Promise<Result<VerificationDataDTO>>;
}
