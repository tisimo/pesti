import { RecoveryCode } from "domain/RecoveryCode";

export interface IRecoveryCodesRepo {
  createRecoveryCodes(recoveryCodes: RecoveryCode[]): Promise<RecoveryCode[]>;
  deleteRecoveryCode(cognitoSub: string, recoveryCode: string): Promise<RecoveryCode | null>;
}
