import { hardhat, sepolia } from "viem/chains";
import { isAddress, type Address } from "viem";

const env = import.meta.env;

export const target = env.VITE_CHAIN === "local" ? "local" : "sepolia";
export const targetChain = target === "local" ? hardhat : sepolia;

function parseAddress(value: string | undefined): Address | undefined {
  return value && isAddress(value) ? value : undefined;
}

export const nftAddress = parseAddress(env.VITE_NFT_ADDRESS);
export const tokenAddress = parseAddress(env.VITE_TOKEN_ADDRESS);
export const deployBlock = BigInt(env.VITE_DEPLOY_BLOCK || "0");
export const rpcUrl: string | undefined =
  target === "local" ? "http://127.0.0.1:8545" : env.VITE_SEPOLIA_RPC_URL || undefined;
export const walletConnectProjectId: string | undefined = env.VITE_WALLETCONNECT_PROJECT_ID || undefined;

export const explorerBase = targetChain.blockExplorers?.default.url;
