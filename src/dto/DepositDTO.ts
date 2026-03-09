export type CreateDepositRequestDTO = {
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
