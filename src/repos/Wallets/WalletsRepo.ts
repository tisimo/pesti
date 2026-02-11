import { Service } from "typedi";
import { clientShared } from "../../loaders/postgresShared";
import { Wallet } from "../../domain/Wallet";
import { WalletMap } from "../../mappers/WalletMapper";
import { IWalletsRepo } from "./IWalletsRepo";
import Logger from "../../loaders/logger";

@Service()
export default class WalletsRepo implements IWalletsRepo {
  private table = `"Wallet"`;

  public async getWalletByAddress(walletAddress: string): Promise<Wallet | null> {
    const query = `
      SELECT *
      FROM ${this.table}
      WHERE "walletAddress" = $1
      LIMIT 1
    `;

    const result = await clientShared.query(query, [walletAddress]);
    if (!result.rowCount) return null;

    return WalletMap.fromPersistence(result.rows[0]);
  }

  public async createWallet(wallet: Wallet): Promise<Wallet> {
    const persistenceWallet = WalletMap.toPersistence(wallet);

    const query = `
      INSERT INTO ${this.table} (
        "walletAddress",
        "accountId",
        "status",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;

    const values = [
      persistenceWallet.walletAddress,
      persistenceWallet.accountId,
      persistenceWallet.status,
      persistenceWallet.createdAt,
      persistenceWallet.updatedAt,
    ];

    await clientShared.query(query, values);
    Logger.info({ walletAddress: persistenceWallet.walletAddress }, "Inserted New Wallet.");

    return wallet;
  }
}
