// Runs the same calls the UI makes (simulate, then send) against a local Hardhat node.
// Skipped unless E2E_LOCAL=1. Needs: `npx hardhat node`, then the Ignition deploy to `localhost`,
// then E2E_NFT / E2E_TOKEN set to the printed addresses. The keys below are Hardhat's public dev keys.
import { describe, expect, it } from "vitest";
import { createPublicClient, createWalletClient, http, parseEther, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { mintWithTokenAbi } from "./abi/mintWithTokenAbi";
import { showcaseNftAbi } from "./abi/showcaseNftAbi";
import { showcaseTokenAbi } from "./abi/showcaseTokenAbi";
import { friendlyError } from "./lib/errors";
import { tokenIdsReceivedBy } from "./lib/logs";

const enabled = process.env.E2E_LOCAL === "1";
const nft = process.env.E2E_NFT as Address;
const token = process.env.E2E_TOKEN as Address;
const admin = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const user = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");

const publicClient = createPublicClient({ chain: hardhat, transport: http("http://127.0.0.1:8545") });
const wallet = (account: typeof admin) => createWalletClient({ account, chain: hardhat, transport: http("http://127.0.0.1:8545") });

describe.skipIf(!enabled)("mint flows against a local node", () => {
  it("runs ETH mint, token mint, limits, pause and ownership scan", async () => {
    const ethPrice = await publicClient.readContract({ address: nft, abi: showcaseNftAbi, functionName: "ethPrice" });
    const tokenPrice = await publicClient.readContract({ address: nft, abi: showcaseNftAbi, functionName: "tokenPrice" });
    const settle = async (hash: `0x${string}`) => {
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).toBe("success");
    };

    // Fund the user with SHOW (the admin holds the initial supply).
    await settle(await wallet(admin).writeContract({ address: token, abi: showcaseTokenAbi, functionName: "transfer", args: [user.address, tokenPrice * 10n] }));

    // Wrong ETH amount: the simulation explains it before any transaction is sent.
    const wrong = await publicClient.simulateContract({ account: user, address: nft, abi: showcaseNftAbi, functionName: "mint", args: [2n], value: ethPrice }).catch((e) => e);
    expect(friendlyError(wrong)).toMatch(/Wrong ETH amount: the mint costs 0\.02 ETH, but 0\.01 ETH was sent/);

    // ETH mint of 2.
    const ethSim = await publicClient.simulateContract({ account: user, address: nft, abi: showcaseNftAbi, functionName: "mint", args: [2n], value: ethPrice * 2n });
    await settle(await wallet(user).writeContract(ethSim.request));

    // Token mint without approval is explained; then approve + mint 1.
    const noAllowance = await publicClient.simulateContract({ account: user, address: nft, abi: mintWithTokenAbi, functionName: "mintWithToken", args: [1n] }).catch((e) => e);
    expect(friendlyError(noAllowance)).toMatch(/Approve the SHOW tokens first/);
    const approve = await publicClient.simulateContract({ account: user, address: token, abi: showcaseTokenAbi, functionName: "approve", args: [nft, tokenPrice] });
    await settle(await wallet(user).writeContract(approve.request));
    const tokenSim = await publicClient.simulateContract({ account: user, address: nft, abi: showcaseNftAbi, functionName: "mintWithToken", args: [1n] });
    await settle(await wallet(user).writeContract(tokenSim.request));

    // Per-wallet limit (5): 3 minted, 3 more must be refused with a readable message.
    const over = await publicClient.simulateContract({ account: user, address: nft, abi: showcaseNftAbi, functionName: "mint", args: [3n], value: ethPrice * 3n }).catch((e) => e);
    expect(friendlyError(over)).toMatch(/per-wallet limit/);

    // Ownership scan finds all three; after sending one on, only two remain owned.
    const ids = await tokenIdsReceivedBy(publicClient, nft, user.address, 0n);
    expect(ids).toEqual([1n, 2n, 3n]);
    await settle(await wallet(user).writeContract({ address: nft, abi: showcaseNftAbi, functionName: "transferFrom", args: [user.address, admin.address, 3n] }));
    const owners = await Promise.all(ids.map((id) => publicClient.readContract({ address: nft, abi: showcaseNftAbi, functionName: "ownerOf", args: [id] })));
    expect(owners.filter((o) => o.toLowerCase() === user.address.toLowerCase())).toHaveLength(2);

    // Pause.
    await settle(await wallet(admin).writeContract({ address: nft, abi: showcaseNftAbi, functionName: "pause" }));
    const paused = await publicClient.simulateContract({ account: user, address: nft, abi: showcaseNftAbi, functionName: "mint", args: [1n], value: ethPrice }).catch((e) => e);
    expect(friendlyError(paused)).toMatch(/paused/);
    expect(parseEther("0.01")).toBe(ethPrice);
  });
});
