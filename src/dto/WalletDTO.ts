export type WalletDTO = {
  walletAddress: string;
  accountId: string;
  status: "ACTIVE" | "FROZEN" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
};
