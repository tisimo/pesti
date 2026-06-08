import { Account } from "domain/Account";

export interface IAccountRepo {
  getAccountByCognitoSub(cognitoSub: string): Promise<Account | null>;
  getAccountByAccountId(accountId: string): Promise<Account | null>;
  getAccountByEmail(email: string): Promise<Account | null>;
  createAccount(account: Account): Promise<Account>;
  deleteAccountByCognitoSub(cognitoSub: string): Promise<Account | null>;
}
