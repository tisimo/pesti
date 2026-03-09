import { Verification } from "../../domain/Verification";

export interface IVerificationRepo {
  findByAccountId(accountId: string): Promise<Verification | null>;
  findBySessionId(sessionId: string): Promise<Verification | null>;
  save(verification: Verification): Promise<void>;
}
