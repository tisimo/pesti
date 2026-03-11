export type GenerateSessionTokenRequestDTO = {
  walletAddress: string;
};

export type GenerateSessionTokenResponseDTO = {
  sessionToken: string;
};

export type OfframpTransactionRequestDTO = {
  status: string;
  sell_amount: string;
  to_address: string;
  asset: string;
  network: string;
};
export type WithdrawalDTO = {
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
