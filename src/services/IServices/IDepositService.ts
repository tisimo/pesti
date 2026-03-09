import type { Result } from "core/logic/Result";
import type { CreateDepositRequestDTO, CreateDepositResponseDTO } from "dto/DepositDTO";

export default interface IDepositService {
  createOnrampSession(dto: CreateDepositRequestDTO): Promise<Result<CreateDepositResponseDTO>>;
}
