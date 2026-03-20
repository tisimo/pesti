import type { Result } from "core/logic/Result";
import { DepositDTO } from "dto/DepositDTO";
import type { CreateDepositRequestDTO, CreateDepositResponseDTO } from "dto/DepositRequestDTO";

export default interface IDepositService {
  getAllDeposits(accountId: string, page: number): Promise<Result<DepositDTO[]>>;
  getDepositById(depositId: string): Promise<Result<DepositDTO>>;
  createOnrampSession(dto: CreateDepositRequestDTO): Promise<Result<CreateDepositResponseDTO>>;
  updateStatus(depositId: string, status: string): Promise<Result<void>>;
}
