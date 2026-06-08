import type { Result } from "core/logic/Result";
import type { AccountDTO } from "dto/AccountDTO";

export default interface IAccountService {
  getAccountByCognitoSub(cognitoSub: string): Promise<Result<AccountDTO>>;
  getAccountByAccountId(accountId: string): Promise<Result<AccountDTO>>;
  createAccount(cognitoSub: string, email: string, role: string): Promise<Result<AccountDTO>>;
  deleteAccountByCognitoSub(cognitoSub: string): Promise<Result<AccountDTO>>;
}
