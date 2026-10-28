import { formatUnits } from "viem";

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Fixed-point display that trims trailing zeros, e.g. 100.0 -> "100", 0.0100 -> "0.01". */
export function formatAmount(value: bigint, decimals = 18, maxFraction = 4): string {
  const [whole, fraction = ""] = formatUnits(value, decimals).split(".");
  const trimmed = fraction.slice(0, maxFraction).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}
