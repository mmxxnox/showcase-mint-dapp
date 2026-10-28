import type { Address } from "viem";

/** Token ids an address owns now, from the chain-indexer-rs service. Validates the response instead of trusting it. */
export async function fetchOwnedTokens(baseUrl: string, owner: Address, signal?: AbortSignal): Promise<bigint[]> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/owners/${owner}/tokens`, { signal });
  if (!res.ok) throw new Error(`Indexer responded with ${res.status}`);
  const body: unknown = await res.json();
  const ids = (body as { token_ids?: unknown })?.token_ids;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string" && /^\d+$/.test(id))) {
    throw new Error("Indexer returned an unexpected response");
  }
  return ids.map((id) => BigInt(id as string));
}
