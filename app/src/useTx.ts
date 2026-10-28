import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { friendlyError } from "./lib/errors";

export type TxPhase = "idle" | "signing" | "pending" | "confirmed" | "failed";

/** One write call tracked through wallet signature, mining and confirmation; refreshes chain reads when it lands. */
export function useTx() {
  const queryClient = useQueryClient();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });

  useEffect(() => {
    if (receipt.isSuccess) void queryClient.invalidateQueries();
  }, [receipt.isSuccess, queryClient]);

  let phase: TxPhase = "idle";
  let message: string | undefined;
  if (write.isPending) phase = "signing";
  else if (write.error) {
    phase = "failed";
    message = friendlyError(write.error);
  } else if (write.data && receipt.isLoading) phase = "pending";
  else if (receipt.isSuccess && receipt.data.status === "reverted") {
    phase = "failed";
    message = "The transaction was mined but reverted on-chain.";
  } else if (receipt.isSuccess) phase = "confirmed";
  else if (receipt.error) {
    phase = "failed";
    message = friendlyError(receipt.error);
  }

  return { phase, message, hash: write.data, send: write.mutate, reset: write.reset };
}
