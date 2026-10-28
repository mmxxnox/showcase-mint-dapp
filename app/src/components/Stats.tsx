import { formatEther } from "viem";
import { formatAmount } from "../lib/format";
import type { useCollection } from "../useCollection";

type Collection = ReturnType<typeof useCollection>;

export function Stats({ c }: { c: Collection }) {
  if (!c.ready) return <p className="muted">{c.error ? "Could not read the collection. Check the contract addresses and network." : "Loading collection…"}</p>;
  const minted = Number(c.totalSupply);
  const max = Number(c.maxSupply);
  return (
    <section className="card">
      <div className="progress" aria-label={`${minted} of ${max} minted`}>
        <div style={{ width: `${max ? (minted / max) * 100 : 0}%` }} />
      </div>
      <dl className="stats">
        <div><dt>Minted</dt><dd>{minted} / {max}</dd></div>
        <div><dt>Price (ETH)</dt><dd>{formatEther(c.ethPrice!)}</dd></div>
        <div><dt>Price (SHOW)</dt><dd>{formatAmount(c.tokenPrice!)}</dd></div>
        <div><dt>Per-wallet limit</dt><dd>{String(c.maxPerWallet)}</dd></div>
        <div><dt>Status</dt><dd>{c.paused ? "Paused" : "Live"}</dd></div>
        <div><dt>Metadata</dt><dd>{c.revealed ? "Revealed" : "Hidden"}</dd></div>
      </dl>
    </section>
  );
}
