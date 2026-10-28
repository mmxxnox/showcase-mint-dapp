// Compares the two "Your NFTs" sources for one wallet on a local node. Skipped unless E2E_BENCH=1.
// Needs: a Hardhat node with the contracts deployed, some mints, chain-indexer-rs synced, and
// E2E_NFT, E2E_USER, E2E_INDEXER (e.g. http://127.0.0.1:3000) set.
// Local RPC has no network latency, so the RPC-scan number here UNDERSTATES what a remote RPC costs.
import { describe, expect, it } from "vitest";
import { createPublicClient, http, type Address } from "viem";
import { hardhat } from "viem/chains";
import { fetchOwnedTokens } from "./lib/indexerApi";
import { ownedTokenIdsByRpc } from "./lib/logs";

const enabled = process.env.E2E_BENCH === "1";
const nft = process.env.E2E_NFT as Address;
const user = process.env.E2E_USER as Address;
const indexer = process.env.E2E_INDEXER as string;
const RUNS = 7;

const client = createPublicClient({ chain: hardhat, transport: http("http://127.0.0.1:8545") });

async function time<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number[] }> {
  const ms: number[] = [];
  let result!: T;
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    result = await fn();
    ms.push(performance.now() - t0);
  }
  return { result, ms };
}
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

describe.skipIf(!enabled)("RPC scan vs indexer", () => {
  it("returns the same tokens, and reports how long each took", async () => {
    const head = await client.getBlockNumber();
    const viaRpc = await time(() => ownedTokenIdsByRpc(client, nft, user, 0n));
    const viaIndexer = await time(() => fetchOwnedTokens(indexer, user));

    expect(viaIndexer.result).toEqual(viaRpc.result);

    const row = (name: string, ms: number[]) =>
      `${name.padEnd(10)} median ${median(ms).toFixed(1).padStart(8)} ms   min ${Math.min(...ms).toFixed(1).padStart(8)} ms`;
    console.log(
      [`chain height ${head} blocks, ${viaRpc.result.length} tokens owned, ${RUNS} runs each`, row("RPC scan", viaRpc.ms), row("indexer", viaIndexer.ms)].join("\n"),
    );
  });
});
