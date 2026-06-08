export type DepositDTO = {
  depositId: string;
  walletAddress: string;
  amount: number;
  amountFiat: number;
  currency: string;
  provider: string;
  method: string;
  application: string;
  txHash: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
};
