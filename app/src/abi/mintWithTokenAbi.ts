import { showcaseNftAbi } from "./showcaseNftAbi";

// mintWithToken burns SHOW via the token contract, so a short balance or allowance reverts with the
// token's errors, which the NFT ABI does not list. Without these, viem cannot decode the revert and the
// user only sees "the contract rejected the transaction". Signatures are from OpenZeppelin ERC20.
export const mintWithTokenAbi = [
  ...showcaseNftAbi,
  {
    type: "error",
    name: "ERC20InsufficientAllowance",
    inputs: [
      { name: "spender", type: "address" },
      { name: "allowance", type: "uint256" },
      { name: "needed", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "ERC20InsufficientBalance",
    inputs: [
      { name: "sender", type: "address" },
      { name: "balance", type: "uint256" },
      { name: "needed", type: "uint256" },
    ],
  },
] as const;
