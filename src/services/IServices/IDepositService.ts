import type { Result } from "core/logic/Result";
import { DepositDTO } from "dto/DepositDTO";
import type { CreateDepositRequestDTO, CreateDepositResponseDTO } from "dto/DepositRequestDTO";

export default interface IDepositService {
  getDepositById(depositId: string): Promise<Result<DepositDTO>>;
  createOnrampSession(dto: CreateDepositRequestDTO): Promise<Result<CreateDepositResponseDTO>>;
  updateStatus(depositId: string, status: string): Promise<Result<void>>;
}
