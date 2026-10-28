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

/** Tokens `owner` holds right now, by log scan: find every transfer to them, then drop any since sent on. */
export async function ownedTokenIdsByRpc(
  client: PublicClient,
  nft: Address,
  owner: Address,
  fromBlock: bigint,
): Promise<bigint[]> {
  const received = await tokenIdsReceivedBy(client, nft, owner, fromBlock);
  const owners = await Promise.all(
    received.map((id) => client.readContract({ address: nft, abi: showcaseNftAbi, functionName: "ownerOf", args: [id] })),
  );
  return received.filter((_, i) => owners[i].toLowerCase() === owner.toLowerCase());
}
