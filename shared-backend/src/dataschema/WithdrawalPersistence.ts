export type WithdrawalPersistence = {
  withdrawalId: string;
  walletAddress: string;
  amount: number;
  amountFiat: number;
  currency: string;
  fee: number;
  feeTx: string | null;
  provider: string;
  method: string;
  application: string;
  txHash: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
};
