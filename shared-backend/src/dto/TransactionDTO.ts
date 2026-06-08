export type TransactionDTO = {
  transactionId: string;
  senderAddress: string;
  receiverAddress: string;
  type: string;
  amount: number;
  fiatAmount: number;
  currency: string;
  commission: number;
  rate: number;
  txHash: string;
  token: string;
  createdAt: string;
};
