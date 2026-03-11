import type { Result } from "core/logic/Result";
import type {
  GenerateSessionTokenRequestDTO,
  GenerateSessionTokenResponseDTO,
  OfframpTransactionRequestDTO,
} from "dto/WithdrawalDTO";

export default interface IWithdrawalService {
  generateSessionToken(
    dto: GenerateSessionTokenRequestDTO,
  ): Promise<Result<GenerateSessionTokenResponseDTO>>;

  getOfframpTransactionStatus(
    partnerUserRef: string,
  ): Promise<Result<OfframpTransactionRequestDTO>>;
}
