export const TransactionType = {
  DonateJC: 0,
  TipJC: 1,
  Withdraw: 2,
} as const;

export type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType];

export const DONATE_DATA_SCHEMA_BASE = [
  { type: "string" as const, name: "donationId" },
  { type: "string" as const, name: "currencySymbol" },
];

export const DONATE_DATA_SCHEMA_WITH_FIAT = [
  { type: "string" as const, name: "donationId" },
  { type: "string" as const, name: "currencySymbol" },
  { type: "string" as const, name: "fiatAmount" },
  { type: "string" as const, name: "rate" },
];

export const TIP_DATA_SCHEMA_BASE = [
  { type: "string" as const, name: "tipId" },
  { type: "string" as const, name: "donationId" },
  { type: "string" as const, name: "currencySymbol" },
];

export const TIP_DATA_SCHEMA_WITH_FIAT = [
  { type: "string" as const, name: "tipId" },
  { type: "string" as const, name: "donationId" },
  { type: "string" as const, name: "currencySymbol" },
  { type: "string" as const, name: "fiatAmount" },
  { type: "string" as const, name: "rate" },
];
