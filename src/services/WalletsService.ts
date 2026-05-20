import { Inject, Service } from "typedi";
import { Result } from "../core/logic/Result";
import { WalletDTO } from "../dto/WalletDTO";
import IWalletsService from "./IServices/IWalletsService";
import { IWalletsRepo } from "../repos/Wallets/IWalletsRepo";
import { WalletMap } from "../mappers/WalletMapper";
import { Wallet } from "../domain/Wallet";
import WalletsRepo from "../repos/Wallets/WalletsRepo";
import { AlchemyNotifyClient } from "./alchemyWebhook/AlchemyNotifyClient";
import Logger from "../loaders/logger";
import config from "../../config.js";

@Service()
export default class WalletsService implements IWalletsService {
  constructor(
    @Inject(() => WalletsRepo) private walletsRepo: IWalletsRepo,
  ) {}

  public async getWalletByAddress(walletAddress: string): Promise<Result<WalletDTO>> {
    try {
      const wallet = await this.walletsRepo.getWalletByAddress(walletAddress);

      if (!wallet) {
        return Result.fail<WalletDTO>("Wallet Not Found!");
      }

      return Result.ok<WalletDTO>(WalletMap.toDTO(wallet));
    } catch (error) {
      return Result.fail<WalletDTO>(error?.message ?? "Error Getting Wallet By Address!");
    }
  }

  public async getWalletByAccountId(accountId: string): Promise<Result<WalletDTO>> {
    try {
      const wallet = await this.walletsRepo.getWalletByAccountId(accountId);

      if (!wallet) {
        return Result.fail<WalletDTO>("Wallet Not Found!");
      }

      return Result.ok<WalletDTO>(WalletMap.toDTO(wallet));
    } catch (error) {
      return Result.fail<WalletDTO>(error?.message ?? "Error Getting Wallet By Account Id!");
    }
  }

  public async createWallet(accountId: string, walletAddress: string): Promise<Result<WalletDTO>> {
    try {
      const existingWallet = await this.walletsRepo.getWalletByAddress(walletAddress);

      if (existingWallet) {
        return Result.fail<WalletDTO>("Wallet Already Exists!");
      }

      const now = new Date();
      const wallet = Wallet.create({
        walletAddress,
        accountId,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });

      if (wallet.isFailure) {
        return Result.fail<WalletDTO>(wallet.error);
      }

      const saved = await this.walletsRepo.createWallet(wallet.getValue());

      if (config.alchemy.authToken && config.alchemy.webhookId) {
        const notifyClient = new AlchemyNotifyClient(config.alchemy.authToken, config.alchemy.webhookId);
        notifyClient.addAddress(walletAddress).catch((err) => {
          Logger.warn({ err, walletAddress }, "Failed to register wallet with Alchemy webhook — deposit detection may be delayed");
        });
      }

      return Result.ok<WalletDTO>(WalletMap.toDTO(saved));
    } catch (error) {
      return Result.fail<WalletDTO>(error?.message ?? "Error Creating Wallet!");
    }
  }
}
