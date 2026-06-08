export const TRANSACTION_EXECUTED_EVENT = {
  anonymous: false,
  inputs: [
    { indexed: true, internalType: "uint8", name: "transactionType", type: "uint8" },
    { indexed: true, internalType: "address", name: "sender", type: "address" },
    { indexed: true, internalType: "address", name: "recipient", type: "address" },
    { indexed: false, internalType: "address", name: "token", type: "address" },
    { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    { indexed: false, internalType: "uint256", name: "commission", type: "uint256" },
    { indexed: false, internalType: "bytes", name: "data", type: "bytes" },
  ],
  name: "TransactionExecuted",
  type: "event",
} as const;

export const ONLY_PAYMENTS_ABI = [TRANSACTION_EXECUTED_EVENT];
