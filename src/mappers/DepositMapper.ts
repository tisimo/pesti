import { Mapper } from "../core/infra/Mapper";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { Deposit } from "../domain/Deposit";
import { DepositDTO } from "../dto/DepositDTO";
import { DepositPersistence } from "dataschema/DepositPersistence";

export class DepositMap extends Mapper<Deposit> {
    /**
     * DOMAIN -> DTO
     */
    public static toDTO(deposit: Deposit): DepositDTO {
        return {
            depositId: deposit.depositId.toString(),
            walletAddress: deposit.walletAddress,
            amount: deposit.amount,
            amountFiat: deposit.amountFiat,
            currency: deposit.currency,
            provider: deposit.provider,
            method: deposit.method,
            application: deposit.application,
            txHash: deposit.txHash,
            status: deposit.status,
            createdAt: deposit.createdAt.toISOString(),
        };
    }

    /**
     * DTO -> DOMAIN
     */
    public static toDomain(depositDTO: DepositDTO): Deposit {
        const depositOrError = Deposit.create(
            {
                walletAddress: depositDTO.walletAddress,
                amount: depositDTO.amount,
                amountFiat: depositDTO.amountFiat,
                currency: depositDTO.currency,
                provider: depositDTO.provider,
                method: depositDTO.method,
                application: depositDTO.application,
                txHash: depositDTO.txHash,
                status: depositDTO.status,
                createdAt: new Date(depositDTO.createdAt),
            },
            new UniqueEntityID(depositDTO.depositId),
        );

        if (depositOrError.isFailure) {
            throw new Error(`DepositMap.toDomain Failed: ${depositOrError.error}`);
        }

        return depositOrError.getValue();
    }


    /**
     * DOMAIN -> PERSISTENCE     
     */
    public static toPersistence(deposit: Deposit): DepositPersistence{
        return {
            depositId: deposit.depositId.toString(),
            walletAddress: deposit.walletAddress,
            amount: deposit.amount,
            amountFiat: deposit.amountFiat,
            currency: deposit.currency,
            provider: deposit.provider,
            method: deposit.method,
            application: deposit.application,
            txHash: deposit.txHash,
            status: deposit.status,
            createdAt: deposit.createdAt.toISOString(),
        };
    }
        
    /**
     * PERSISTENCE -> DOMAIN
     */
    public static fromPersistence(depositPersistence: DepositPersistence): Deposit {
        const depositOrError = Deposit.create(
            {
                walletAddress: depositPersistence.walletAddress,
                amount: depositPersistence.amount,
                amountFiat: depositPersistence.amountFiat,
                currency: depositPersistence.currency,
                provider: depositPersistence.provider,
                method: depositPersistence.method,
                application: depositPersistence.application,
                txHash: depositPersistence.txHash,
                status: depositPersistence.status,
                createdAt: new Date(depositPersistence.createdAt),
            },
            new UniqueEntityID(depositPersistence.depositId),
        );

        if (depositOrError.isFailure) {
            throw new Error(`DepositMap.fromPersistence Failed: ${depositOrError.error}`);
        }

        return depositOrError.getValue();
    }
}

