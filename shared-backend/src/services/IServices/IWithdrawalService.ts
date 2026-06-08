import type { Result } from "core/logic/Result";
import type {
  CreateWithdrawalRequestDTO,
  GenerateSessionTokenRequestDTO,
  GenerateSessionTokenResponseDTO,
  OfframpTransactionRequestDTO,
  WithdrawalDTO,
} from "dto/WithdrawalDTO";

export default interface IWithdrawalService {
  getAllWithdrawals(accountId: string, page: number): Promise<Result<WithdrawalDTO[]>>;
  getWithdrawalById(withdrawalId: string): Promise<Result<WithdrawalDTO>>;
  createWithdrawal(dto: CreateWithdrawalRequestDTO): Promise<Result<WithdrawalDTO>>;
  updateStatus(withdrawalId: string, status: string): Promise<Result<void>>;
  confirmWithdrawal(walletAddress: string, txHash: string): Promise<Result<void>>;
  generateSessionToken(dto: GenerateSessionTokenRequestDTO): Promise<Result<GenerateSessionTokenResponseDTO>>;
  getOfframpTransactionStatus(partnerUserRef: string): Promise<Result<OfframpTransactionRequestDTO>>;
}
