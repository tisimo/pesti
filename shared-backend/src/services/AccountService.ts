import { Inject, Service } from "typedi";
import { Result } from "../core/logic/Result";
import { AccountDTO } from "../dto/AccountDTO";
import IAccountService from "./IServices/IAccountService";
import { IAccountRepo } from "../repos/Account/IAccountRepo";
import { AccountMap } from "../mappers/AccountMapper";
import { Account } from "../domain/Account";
import AccountRepo from "../repos/Account/AccountRepo";

@Service()
export default class AccountService implements IAccountService {
  constructor(@Inject(() => AccountRepo) private accountRepo: IAccountRepo) {}

  public async getAccountByCognitoSub(cognitoSub: string): Promise<Result<AccountDTO>> {
    try {
      const account = await this.accountRepo.getAccountByCognitoSub(cognitoSub);

      if (!account) {
        return Result.fail<AccountDTO>("Account Not Found!");
      }

      return Result.ok<AccountDTO>(AccountMap.toDTO(account));
    } catch (error) {
      return Result.fail<AccountDTO>(error?.message ?? "Error Getting Account By CognitoSub!");
    }
  }

  public async getAccountByAccountId(accountId: string): Promise<Result<AccountDTO>> {
    try {
      const account = await this.accountRepo.getAccountByAccountId(accountId);

      if (!account) {
        return Result.fail<AccountDTO>("Account Not Found!");
      }

      return Result.ok<AccountDTO>(AccountMap.toDTO(account));
    } catch (error) {
      return Result.fail<AccountDTO>(error?.message ?? "Error Getting Account By AccountID!");
    }
  }

  public async createAccount(cognitoSub: string, email: string, role: string): Promise<Result<AccountDTO>> {
    try {
      const existingCognitoSub = await this.accountRepo.getAccountByCognitoSub(cognitoSub);
      const existingEmail = await this.accountRepo.getAccountByEmail(email);

      if (existingCognitoSub || existingEmail) {
        return Result.fail<AccountDTO>("Account Already Exists!");
      }

      const now = new Date();
      const account = Account.create({
        cognitoSub,
        email,
        role,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });

      if (account.isFailure) {
        return Result.fail<AccountDTO>(account.error);
      }

      const saved = await this.accountRepo.createAccount(account.getValue());
      return Result.ok<AccountDTO>(AccountMap.toDTO(saved));
    } catch (error) {
      return Result.fail<AccountDTO>(error?.message ?? "Error Creating Account!");
    }
  }

  public async deleteAccountByCognitoSub(cognitoSub: string): Promise<Result<AccountDTO>> {
    try {
      const account = await this.accountRepo.getAccountByCognitoSub(cognitoSub);

      if (!account) {
        return Result.fail<AccountDTO>("Account Not Found!");
      }

      const deletedAccount = await this.accountRepo.deleteAccountByCognitoSub(cognitoSub);

      return Result.ok<AccountDTO>(AccountMap.toDTO(deletedAccount));
    } catch (error) {
      return Result.fail<AccountDTO>(error?.message ?? "Error Deleting Account!");
    }
  }
}
