export type CreateDepositRequestDTO = {
  depositId: string;
  depositAddress: string;
  paymentAmount: string;
  paymentCurrency: string;
  paymentMethod: string;
  accountId: string;
};

export type OnrampFee = {
  type: string;
  amount: string;
  currency: string;
};

export type OnrampQuote = {
  paymentTotal: string;
  paymentSubtotal: string;
  paymentCurrency: string;
  purchaseAmount: string;
  purchaseCurrency: string;
  destinationNetwork: string;
  fees: OnrampFee[];
  exchangeRate: string;
};

export type CreateDepositResponseDTO = {
  depositId: string;
  onrampUrl: string;
  quote?: OnrampQuote;
};

export type OnrampTransactionDTO = {
  transaction_id: string;
  status: string;
  purchase_amount?: { value: string; currency: string };
  purchase_currency?: string;
  wallet_address?: string;
  created_at?: string;
  completed_at?: string;
};
