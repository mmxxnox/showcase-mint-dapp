import { useState } from "react";
import { useConnection, useSimulateContract } from "wagmi";
import { formatEther, type Address } from "viem";
import { showcaseNftAbi } from "../abi/showcaseNftAbi";
import { mintWithTokenAbi } from "../abi/mintWithTokenAbi";
import { showcaseTokenAbi } from "../abi/showcaseTokenAbi";
import { targetChain } from "../config";
import { friendlyError } from "../lib/errors";
import { formatAmount } from "../lib/format";
import { useTx } from "../useTx";
import type { useCollection } from "../useCollection";
import { TxStatus } from "./TxStatus";

type Collection = ReturnType<typeof useCollection>;
type Mode = "eth" | "token";

export function MintPanel({ nft, token, c }: { nft: Address; token: Address; c: Collection }) {
  const { address, isConnected, chainId } = useConnection();
  const [mode, setMode] = useState<Mode>("eth");
  const [requested, setRequested] = useState(1);
  const tx = useTx();

  const onRightNetwork = isConnected && chainId === targetChain.id;
  const remainingSupply = Number((c.maxSupply ?? 0n) - (c.totalSupply ?? 0n));
  const remainingForWallet = Number((c.maxPerWallet ?? 0n) - (c.mintedByMe ?? 0n));
  const maxQuantity = Math.max(0, Math.min(remainingSupply, remainingForWallet));
  const quantity = Math.min(Math.max(requested, 1), Math.max(maxQuantity, 1));
  const qty = BigInt(quantity);

  const ethCost = (c.ethPrice ?? 0n) * qty;
  const tokenCost = (c.tokenPrice ?? 0n) * qty;
  const needsApproval = mode === "token" && (c.allowance ?? 0n) < tokenCost;
  const hasTokens = (c.tokenBalance ?? 0n) >= tokenCost;

  const blocker = !isConnected
    ? "Connect a wallet to mint."
    : !onRightNetwork
      ? `Switch to ${targetChain.name} to mint.`
      : c.paused
        ? "Minting is paused."
        : maxQuantity === 0
          ? remainingSupply === 0
            ? "Sold out."
            : "You have reached the per-wallet limit."
          : mode === "token" && !hasTokens
            ? `You need ${formatAmount(tokenCost)} SHOW to mint with tokens.`
            : undefined;

  const canSimulate = !blocker && c.ready && Boolean(address);

  // Simulating first means a failing call is explained before the wallet pops up, and costs no gas.
  const ethSim = useSimulateContract({
    address: nft, abi: showcaseNftAbi, functionName: "mint", args: [qty], value: ethCost, chainId: targetChain.id,
    query: { enabled: canSimulate && mode === "eth" },
  });
  const approveSim = useSimulateContract({
    address: token, abi: showcaseTokenAbi, functionName: "approve", args: [nft, tokenCost], chainId: targetChain.id,
    query: { enabled: canSimulate && mode === "token" && needsApproval },
  });
  const tokenSim = useSimulateContract({
    address: nft, abi: mintWithTokenAbi, functionName: "mintWithToken", args: [qty], chainId: targetChain.id,
    query: { enabled: canSimulate && mode === "token" && !needsApproval },
  });

  const active = mode === "eth" ? ethSim : needsApproval ? approveSim : tokenSim;
  const busy = tx.phase === "signing" || tx.phase === "pending";

  function submit() {
    tx.reset();
    if (mode === "eth" && ethSim.data) tx.send(ethSim.data.request);
    else if (needsApproval && approveSim.data) tx.send(approveSim.data.request);
    else if (tokenSim.data) tx.send(tokenSim.data.request);
  }

  const label = busy
    ? "Working…"
    : mode === "eth"
      ? `Mint ${quantity} for ${formatEther(ethCost)} ETH`
      : needsApproval
        ? `Approve ${formatAmount(tokenCost)} SHOW`
        : `Mint ${quantity} for ${formatAmount(tokenCost)} SHOW`;

  return (
    <section className="card">
      <div className="tabs" role="tablist">
        {(["eth", "token"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? "tab on" : "tab"} onClick={() => { setMode(m); tx.reset(); }}>
            {m === "eth" ? "Pay with ETH" : "Burn SHOW"}
          </button>
        ))}
      </div>

      <label className="qty">
        Quantity
        <input type="number" min={1} max={Math.max(maxQuantity, 1)} value={quantity} disabled={busy}
          onChange={(e) => setRequested(Number(e.target.value) || 1)} />
        <span className="muted">up to {maxQuantity}</span>
      </label>

      {mode === "token" && isConnected && (
        <p className="muted">
          Balance {formatAmount(c.tokenBalance ?? 0n)} SHOW · Approved {formatAmount(c.allowance ?? 0n)} SHOW.
          {needsApproval ? " Approve once, then mint in a second step." : ""}
        </p>
      )}

      <button className="primary" onClick={submit} disabled={Boolean(blocker) || busy || !active.data}>
        {label}
      </button>

      {blocker && <p className="muted">{blocker}</p>}
      {!blocker && active.error && <p className="notice error">{friendlyError(active.error)}</p>}
      <TxStatus phase={tx.phase} message={tx.message} hash={tx.hash} />
    </section>
  );
}
