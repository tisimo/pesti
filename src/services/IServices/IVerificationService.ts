import type { Result } from "../../core/logic/Result";
import type { VerificationDTO } from "../../dto/VerificationDTO";

export default interface IVerificationService {
  createVerification(accountId: string): Promise<Result<VerificationDTO>>;
  updateSessionId(accountId: string, sessionId: string): Promise<Result<VerificationDTO>>;
  markVerified(sessionId: string): Promise<Result<VerificationDTO>>;
  markDeclined(sessionId: string): Promise<Result<VerificationDTO>>;
}
