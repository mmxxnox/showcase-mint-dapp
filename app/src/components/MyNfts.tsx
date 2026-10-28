import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { deployBlock, explorerBase, indexerUrl, targetChain } from "../config";
import { fetchOwnedTokens } from "../lib/indexerApi";
import { ownedTokenIdsByRpc } from "../lib/logs";

type Source = "indexer" | "rpc";

/** NFTs the connected wallet owns, from the indexer service or a direct RPC log scan, with load time shown for both. */
export function MyNfts({ nft, refreshKey }: { nft: Address; refreshKey: bigint | undefined }) {
  const { address } = useConnection();
  const client = usePublicClient({ chainId: targetChain.id });
  const [source, setSource] = useState<Source>(indexerUrl ? "indexer" : "rpc");

  const owned = useQuery({
    queryKey: ["owned", source, nft, address, String(refreshKey)],
    enabled: Boolean(address && client),
    // The indexer trails the chain by a poll interval, so keep checking while it is the source.
    refetchInterval: source === "indexer" ? 4_000 : false,
    queryFn: async ({ signal }) => {
      const started = performance.now();
      const ids =
        source === "indexer"
          ? await fetchOwnedTokens(indexerUrl!, address!, signal)
          : await ownedTokenIdsByRpc(client!, nft, address!, deployBlock);
      return { ids, ms: Math.round(performance.now() - started) };
    },
  });

  if (!address) return null;

  return (
    <section className="card">
      <div className="row">
        <h2>Your NFTs</h2>
        {indexerUrl && (
          <div className="tabs" role="group" aria-label="Data source">
            {(["indexer", "rpc"] as const).map((s) => (
              <button key={s} className={source === s ? "tab on" : "tab"} aria-pressed={source === s} onClick={() => setSource(s)}>
                {s === "indexer" ? "Indexer" : "RPC scan"}
              </button>
            ))}
          </div>
        )}
      </div>

      {owned.isLoading ? (
        <p className="muted">{source === "indexer" ? "Asking the indexer…" : "Scanning the chain for your NFTs…"}</p>
      ) : owned.error ? (
        <p className="notice error">
          {source === "indexer"
            ? "The indexer could not be reached. Switch to the RPC scan, or check that it is running."
            : "Could not scan for NFTs. The RPC may be rate limiting; set VITE_SEPOLIA_RPC_URL."}
        </p>
      ) : (
        <>
          {owned.data!.ids.length === 0 ? (
            <p className="muted">You do not own any yet.</p>
          ) : (
            <ul className="grid">
              {owned.data!.ids.map((id) => (
                <li key={String(id)}>
                  <a href={explorerBase ? `${explorerBase}/nft/${nft}/${id}` : undefined} target="_blank" rel="noreferrer">#{String(id)}</a>
                </li>
              ))}
            </ul>
          )}
          <p className="muted">
            Loaded in {owned.data!.ms} ms via {source === "indexer" ? "the indexer" : "an RPC log scan"}.
          </p>
        </>
      )}
    </section>
  );
}
