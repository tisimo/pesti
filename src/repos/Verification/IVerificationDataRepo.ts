import { VerificationData } from "../../domain/VerificationData";

export interface IVerificationDataRepo {
  findByVerificationId(verificationId: string): Promise<VerificationData | null>;
  findByAccountId(accountId: string): Promise<VerificationData | null>;
  saveVerificationData(data: VerificationData): Promise<VerificationData>;
}
