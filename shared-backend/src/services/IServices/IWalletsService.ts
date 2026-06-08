import type { Result } from "core/logic/Result";
import type { WalletDTO } from "dto/WalletDTO";

export default interface IWalletsService {
  getWalletByAddress(walletAddress: string): Promise<Result<WalletDTO>>;
  getWalletByAccountId(accountId: string): Promise<Result<WalletDTO>>;
  createWallet(accountId: string, walletAddress: string): Promise<Result<WalletDTO>>;
}
