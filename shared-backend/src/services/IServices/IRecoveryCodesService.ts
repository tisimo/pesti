import type { Result } from "core/logic/Result";
import { RecoveryCodeDTO } from "dto/RecoveryCodesDTO";

export default interface IRecoveryCodesService {
  generateRecoveryCodes(cognitoSub: string): Promise<Result<RecoveryCodeDTO[]>>;
  deleteRecoveryCode(cognitoSub: string, recoveryCode: string): Promise<Result<RecoveryCodeDTO>>;
}
