export type TransactionPersistence = {
  transactionId: string;
  senderAddress: string;
  receiverAddress: string;
  type: number;
  amount: number;
  fiatAmount: number;
  currency: string;
  commission: number;
  rate: number;
  txHash: string;
  token: string;
  createdAt: Date;
};
