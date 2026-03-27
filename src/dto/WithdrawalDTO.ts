export type GenerateSessionTokenRequestDTO = {
  walletAddress: string;
  amount: number;
  fee: number;
  currency: string;
  partnerUserRef: string;
  redirectUrl: string;
};

export type GenerateSessionTokenResponseDTO = {
  sessionToken: string;
  withdrawalId: string;
};

export type OfframpTransactionRequestDTO = {
  status: string;
  sell_amount: string;
  to_address: string;
  asset: string;
  network: string;
};
export type CreateWithdrawalRequestDTO = {
  walletAddress: string;
  amount: number;
  amountFiat: number;
  currency: string;
  fee: number;
  feeTx: string | null;
  txHash: string | null;
  provider: string;
  method: string;
  application: string;
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
