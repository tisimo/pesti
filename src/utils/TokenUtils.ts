const USDC_DECIMALS = 6;

export function rawToNumber(raw: string, decimals: number = USDC_DECIMALS): number {
  return Number(BigInt(raw)) / Math.pow(10, decimals);
}
