import { Mapper } from "../core/infra/Mapper";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { Withdrawal } from "../domain/Withdrawal";
import { WithdrawalDTO } from "../dto/WithdrawalDTO";
import { WithdrawalPersistence } from "../dataschema/WithdrawalPersistence";

export class WithdrawalMap extends Mapper<Withdrawal> {
  /**
   * DOMAIN -> DTO
   */
  public static toDTO(withdrawal: Withdrawal): WithdrawalDTO {
    return {
      withdrawalId: withdrawal.withdrawalId.toString(),
      walletAddress: withdrawal.walletAddress,
      amount: withdrawal.amount,
      amountFiat: withdrawal.amountFiat,
      currency: withdrawal.currency,
      fee: withdrawal.fee,
      feeTx: withdrawal.feeTx,
      provider: withdrawal.provider,
      method: withdrawal.method,
      application: withdrawal.application,
      txHash: withdrawal.txHash,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
    };
  }

  /**
   * DTO -> DOMAIN
   */
  public static toDomain(withdrawalDTO: WithdrawalDTO): Withdrawal {
    const withdrawalOrError = Withdrawal.create(
      {
        walletAddress: withdrawalDTO.walletAddress,
        amount: withdrawalDTO.amount,
        amountFiat: withdrawalDTO.amountFiat,
        currency: withdrawalDTO.currency,
        fee: withdrawalDTO.fee,
        feeTx: withdrawalDTO.feeTx,
        provider: withdrawalDTO.provider,
        method: withdrawalDTO.method,
        application: withdrawalDTO.application,
        txHash: withdrawalDTO.txHash,
        status: withdrawalDTO.status,
        createdAt: withdrawalDTO.createdAt,
      },
      new UniqueEntityID(withdrawalDTO.withdrawalId),
    );

    if (withdrawalOrError.isFailure) {
      throw new Error(`WithdrawalMap.toDomain Failed: ${withdrawalOrError.error}`);
    }

    return withdrawalOrError.getValue();
  }

  /**
   * DOMAIN -> PERSISTENCE
   */
  public static toPersistence(withdrawal: Withdrawal): WithdrawalPersistence {
    return {
      withdrawalId: withdrawal.withdrawalId.toString(),
      walletAddress: withdrawal.walletAddress,
      amount: withdrawal.amount,
      amountFiat: withdrawal.amountFiat,
      currency: withdrawal.currency,
      fee: withdrawal.fee,
      feeTx: withdrawal.feeTx,
      provider: withdrawal.provider,
      method: withdrawal.method,
      application: withdrawal.application,
      txHash: withdrawal.txHash,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
    };
  }

  /**
   * PERSISTENCE -> DOMAIN
   */
  public static fromPersistence(withdrawalPersistence: WithdrawalPersistence): Withdrawal {
    const withdrawalOrError = Withdrawal.create(
      {
        walletAddress: withdrawalPersistence.walletAddress,
        amount: withdrawalPersistence.amount,
        amountFiat: withdrawalPersistence.amountFiat,
        currency: withdrawalPersistence.currency,
        fee: withdrawalPersistence.fee,
        feeTx: withdrawalPersistence.feeTx,
        provider: withdrawalPersistence.provider,
        method: withdrawalPersistence.method,
        application: withdrawalPersistence.application,
        txHash: withdrawalPersistence.txHash,
        status: withdrawalPersistence.status,
        createdAt: withdrawalPersistence.createdAt,
      },
      new UniqueEntityID(withdrawalPersistence.withdrawalId),
    );

    if (withdrawalOrError.isFailure) {
      throw new Error(`WithdrawalMap.fromPersistence Failed: ${withdrawalOrError.error}`);
    }

    return withdrawalOrError.getValue();
  }
}
