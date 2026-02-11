import { Inject, Service } from "typedi";
import { Result } from "../core/logic/Result";
import { WalletDTO } from "../dto/WalletDTO";
import IWalletsService from "./IServices/IWalletsService";
import { IWalletsRepo } from "../repos/Wallets/IWalletsRepo";
import { WalletMap } from "../mappers/WalletMapper";
import { Wallet } from "../domain/Wallet";
import WalletsRepo from "../repos/Wallets/WalletsRepo";

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
      return Result.ok<WalletDTO>(WalletMap.toDTO(saved));
    } catch (error) {
      return Result.fail<WalletDTO>(error?.message ?? "Error Creating Wallet!");
    }
  }
}
