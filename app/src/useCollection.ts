import { useConnection, useReadContracts } from "wagmi";
import type { Address } from "viem";
import { showcaseNftAbi } from "./abi/showcaseNftAbi";
import { showcaseTokenAbi } from "./abi/showcaseTokenAbi";
import { targetChain } from "./config";

/** Everything the UI shows about the collection, the user's mint count and their SHOW balance. */
export function useCollection(nft: Address, token: Address) {
  const { address } = useConnection();
  const nftContract = { address: nft, abi: showcaseNftAbi, chainId: targetChain.id } as const;
  const tokenContract = { address: token, abi: showcaseTokenAbi, chainId: targetChain.id } as const;

  const collection = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...nftContract, functionName: "ethPrice" },
      { ...nftContract, functionName: "tokenPrice" },
      { ...nftContract, functionName: "totalSupply" },
      { ...nftContract, functionName: "maxSupply" },
      { ...nftContract, functionName: "maxPerWallet" },
      { ...nftContract, functionName: "paused" },
      { ...nftContract, functionName: "revealed" },
    ],
  });

  const wallet = useReadContracts({
    allowFailure: false,
    contracts: address
      ? ([
          { ...nftContract, functionName: "mintedBy", args: [address] },
          { ...tokenContract, functionName: "balanceOf", args: [address] },
          { ...tokenContract, functionName: "allowance", args: [address, nft] },
        ] as const)
      : [],
    query: { enabled: Boolean(address) },
  });

  const [ethPrice, tokenPrice, totalSupply, maxSupply, maxPerWallet, paused, revealed] = collection.data ?? [];
  const [mintedByMe, tokenBalance, allowance] = wallet.data ?? [];

  return {
    isLoading: collection.isLoading || (Boolean(address) && wallet.isLoading),
    error: collection.error ?? wallet.error,
    ready: collection.data !== undefined,
    ethPrice,
    tokenPrice,
    totalSupply,
    maxSupply,
    maxPerWallet,
    paused,
    revealed,
    mintedByMe,
    tokenBalance,
    allowance,
  };
}
