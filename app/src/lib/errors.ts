import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, formatEther, formatUnits } from "viem";

/** Plain-English text for each custom error the ShowcaseNFT / ERC-20 contracts can raise. */
export function explainRevert(errorName: string | undefined, args: readonly unknown[] = []): string {
  switch (errorName) {
    case "IncorrectPayment": {
      const [expected, sent] = args as [bigint, bigint];
      return `Wrong ETH amount: the mint costs ${formatEther(expected)} ETH, but ${formatEther(sent)} ETH was sent.`;
    }
    case "CostExceedsMax": {
      const [cost, max] = args as [bigint, bigint];
      return `The price changed to ${formatUnits(cost, 18)} SHOW, above the ${formatUnits(max, 18)} SHOW you agreed to. Nothing was burned. Refresh and try again.`;
    }
    case "WalletLimitExceeded":
      return "This would take you over the per-wallet limit.";
    case "SoldOut":
      return "Not enough NFTs left to mint that quantity.";
    case "InvalidQuantity":
      return "Choose a quantity of at least 1.";
    case "EnforcedPause":
      return "Minting is paused right now.";
    case "ERC20InsufficientBalance":
      return "You do not have enough SHOW tokens for this mint.";
    case "ERC20InsufficientAllowance":
      return "Approve the SHOW tokens first, then mint.";
    case "ReentrancyGuardReentrantCall":
      return "The contract rejected a re-entrant call.";
    default:
      return errorName ? `The contract rejected the transaction (${errorName}).` : "The contract rejected the transaction.";
  }
}

/** Turns any wagmi/viem error into a short message a user can act on. */
export function friendlyError(error: unknown): string {
  if (!(error instanceof BaseError)) {
    return error instanceof Error ? error.message : "Something went wrong.";
  }
  if (error.walk((e) => e instanceof UserRejectedRequestError)) {
    return "You cancelled the request in your wallet. Nothing was sent.";
  }
  const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
  if (revert instanceof ContractFunctionRevertedError) {
    return explainRevert(revert.data?.errorName, revert.data?.args);
  }
  return error.shortMessage;
}
