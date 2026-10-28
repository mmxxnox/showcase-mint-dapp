import type { PublicClient, Address } from "viem";
import { showcaseNftAbi } from "../abi/showcaseNftAbi";

const CHUNK = 40_000n; // stays under the block-range limit most public RPCs enforce

/** Token ids ever transferred to `owner`, scanned in block chunks from `fromBlock`. */
export async function tokenIdsReceivedBy(
  client: PublicClient,
  nft: Address,
  owner: Address,
  fromBlock: bigint,
): Promise<bigint[]> {
  const latest = await client.getBlockNumber();
  const ids = new Set<bigint>();
  for (let start = fromBlock; start <= latest; start += CHUNK) {
    const end = start + CHUNK - 1n > latest ? latest : start + CHUNK - 1n;
    const logs = await client.getContractEvents({
      address: nft,
      abi: showcaseNftAbi,
      eventName: "Transfer",
      args: { to: owner },
      fromBlock: start,
      toBlock: end,
    });
    for (const log of logs) ids.add(log.args.tokenId!);
  }
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
