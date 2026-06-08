import { Mapper } from "../core/infra/Mapper";
import { Wallet } from "../domain/Wallet";
import { WalletDTO } from "../dto/WalletDTO";
import { WalletPersistence } from "../dataschema/WalletPersistence";

export class WalletMap extends Mapper<Wallet> {
  /**
   * DOMAIN -> DTO
   */
  public static toDTO(wallet: Wallet): WalletDTO {
    return {
      walletAddress: wallet.walletAddress,
      accountId: wallet.accountId,
      status: wallet.status,
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  /**
   * DTO -> DOMAIN
   */
  public static toDomain(walletDTO: WalletDTO): Wallet {
    const walletOrError = Wallet.create({
      walletAddress: walletDTO.walletAddress,
      accountId: walletDTO.accountId,
      status: walletDTO.status,
      createdAt: new Date(walletDTO.createdAt),
      updatedAt: new Date(walletDTO.updatedAt),
    });

    if (walletOrError.isFailure) {
      throw new Error(`WalletMap.toDomain Failed: ${walletOrError.error}`);
    }

    return walletOrError.getValue();
  }

  /**
   * DOMAIN -> PERSISTENCE
   */
  public static toPersistence(wallet: Wallet): WalletPersistence {
    return {
      walletAddress: wallet.walletAddress,
      accountId: wallet.accountId,
      status: wallet.status,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  /**
   * PERSISTENCE -> DOMAIN
   */
  public static fromPersistence(walletPersistence: WalletPersistence): Wallet {
    const walletOrError = Wallet.create({
      walletAddress: walletPersistence.walletAddress,
      accountId: walletPersistence.accountId,
      status: walletPersistence.status,
      createdAt: walletPersistence.createdAt,
      updatedAt: walletPersistence.updatedAt,
    });

    if (walletOrError.isFailure) {
      throw new Error(`WalletMap.fromPersistence Failed: ${walletOrError.error}`);
    }

    return walletOrError.getValue();
  }
}
