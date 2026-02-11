import { Wallet } from "domain/Wallet";

export interface IWalletsRepo {
  getWalletByAddress(walletAddress: string): Promise<Wallet | null>;
  createWallet(wallet: Wallet): Promise<Wallet>;
}
