import { explorerBase } from "../config";
import type { TxPhase } from "../useTx";

const LABEL: Record<TxPhase, string> = {
  idle: "",
  signing: "Confirm the transaction in your wallet…",
  pending: "Transaction sent. Waiting for confirmation…",
  confirmed: "Confirmed.",
  failed: "Failed.",
};

export function TxStatus({ phase, message, hash }: { phase: TxPhase; message?: string; hash?: `0x${string}` }) {
  if (phase === "idle") return null;
  return (
    <p className={`tx tx-${phase}`} role="status">
      {phase === "failed" && message ? message : LABEL[phase]}{" "}
      {hash && explorerBase && (
        <a href={`${explorerBase}/tx/${hash}`} target="_blank" rel="noreferrer">
          View transaction
        </a>
      )}
    </p>
  );
}
