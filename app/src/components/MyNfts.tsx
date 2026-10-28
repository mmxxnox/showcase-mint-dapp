import { useQuery } from "@tanstack/react-query";
import { useConnection, usePublicClient, useReadContracts } from "wagmi";
import type { Address } from "viem";
import { showcaseNftAbi } from "../abi/showcaseNftAbi";
import { deployBlock, explorerBase, targetChain } from "../config";
import { tokenIdsReceivedBy } from "../lib/logs";

/** NFTs the connected wallet owns now. Transfer logs find candidates; ownerOf drops any that were sent on. */
export function MyNfts({ nft, refreshKey }: { nft: Address; refreshKey: bigint | undefined }) {
  const { address } = useConnection();
  const client = usePublicClient({ chainId: targetChain.id });

  const received = useQuery({
    queryKey: ["received", nft, address, String(refreshKey)],
    enabled: Boolean(address && client),
    queryFn: () => tokenIdsReceivedBy(client!, nft, address!, deployBlock),
  });

  const owners = useReadContracts({
    allowFailure: false,
    contracts: (received.data ?? []).map((id) => ({
      address: nft, abi: showcaseNftAbi, functionName: "ownerOf", args: [id], chainId: targetChain.id,
    })),
    query: { enabled: (received.data?.length ?? 0) > 0 },
  });

  if (!address) return null;
  const owned = (received.data ?? []).filter((_, i) => String(owners.data?.[i]).toLowerCase() === address.toLowerCase());

  return (
    <section className="card">
      <h2>Your NFTs</h2>
      {received.isLoading || owners.isLoading ? (
        <p className="muted">Scanning for your NFTs…</p>
      ) : received.error ? (
        <p className="notice error">Could not scan for NFTs. The RPC may be rate limiting; set VITE_SEPOLIA_RPC_URL.</p>
      ) : owned.length === 0 ? (
        <p className="muted">You do not own any yet.</p>
      ) : (
        <ul className="grid">
          {owned.map((id) => (
            <li key={String(id)}>
              <a href={explorerBase ? `${explorerBase}/nft/${nft}/${id}` : undefined} target="_blank" rel="noreferrer">#{String(id)}</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
