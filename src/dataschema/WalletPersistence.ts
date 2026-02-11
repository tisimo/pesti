export type WalletPersistence = {
  walletAddress: string;
  accountId: string;
  status: "ACTIVE" | "FROZEN" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
};
