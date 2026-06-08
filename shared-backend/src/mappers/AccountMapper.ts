import { Mapper } from "../core/infra/Mapper";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { Account } from "../domain/Account";
import { AccountDTO } from "../dto/AccountDTO";
import { AccountPersistence } from "../dataschema/AccountPersistence";

export class AccountMap extends Mapper<Account> {
  /**
   * DOMAIN -> DTO
   */
  public static toDTO(account: Account): AccountDTO {
    return {
      accountId: account.accountId.toString(),
      cognitoSub: account.cognitoSub,
      email: account.email,
      role: account.role,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  /**
   * DTO -> DOMAIN
   */
  public static toDomain(accountDTO: AccountDTO): Account {
    const accountOrError = Account.create(
      {
        cognitoSub: accountDTO.cognitoSub,
        email: accountDTO.email,
        role: accountDTO.role,
        status: accountDTO.status,
        createdAt: new Date(accountDTO.createdAt),
        updatedAt: new Date(accountDTO.updatedAt),
      },
      new UniqueEntityID(accountDTO.accountId),
    );

    if (accountOrError.isFailure) {
      throw new Error(`AccountMap.toDomain Failed: ${accountOrError.error}`);
    }

    return accountOrError.getValue();
  }

  /**
   * DOMAIN -> PERSISTENCE
   */
  public static toPersistence(account: Account): AccountPersistence {
    return {
      accountId: account.accountId.toString(),
      cognitoSub: account.cognitoSub,
      email: account.email,
      role: account.role,
      status: account.status,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /**
   * PERSISTENCE -> DOMAIN
   */
  public static fromPersistence(accountPersistence: AccountPersistence): Account {
    const accountOrError = Account.create(
      {
        cognitoSub: accountPersistence.cognitoSub,
        email: accountPersistence.email,
        role: accountPersistence.role,
        status: accountPersistence.status,
        createdAt: accountPersistence.createdAt,
        updatedAt: accountPersistence.updatedAt,
      },
      new UniqueEntityID(accountPersistence.accountId),
    );

    if (accountOrError.isFailure) {
      throw new Error(`AccountMap.fromPersistence Failed: ${accountOrError.error}`);
    }

    return accountOrError.getValue();
  }
}
