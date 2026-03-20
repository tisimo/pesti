import type { Result } from "core/logic/Result";
import type {
  GenerateSessionTokenRequestDTO,
  GenerateSessionTokenResponseDTO,
  OfframpTransactionRequestDTO,
  WithdrawalDTO,
} from "dto/WithdrawalDTO";

export default interface IWithdrawalService {
  getAllWithdrawals(accountId: string, page: number): Promise<Result<WithdrawalDTO[]>>;
  generateSessionToken(dto: GenerateSessionTokenRequestDTO): Promise<Result<GenerateSessionTokenResponseDTO>>;
  getOfframpTransactionStatus(partnerUserRef: string): Promise<Result<OfframpTransactionRequestDTO>>;
}
