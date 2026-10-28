import { nftAddress, target, targetChain, tokenAddress } from "./config";
import { ConnectBar } from "./components/ConnectBar";
import { MintPanel } from "./components/MintPanel";
import { MyNfts } from "./components/MyNfts";
import { Stats } from "./components/Stats";
import { useCollection } from "./useCollection";
import type { Address } from "viem";

function Dapp({ nft, token }: { nft: Address; token: Address }) {
  const collection = useCollection(nft, token);
  return (
    <>
      <Stats c={collection} />
      <MintPanel nft={nft} token={token} c={collection} />
      <MyNfts nft={nft} refreshKey={collection.totalSupply} />
    </>
  );
}

export function App() {
  return (
    <main>
      <ConnectBar />
      <p className="muted">
        Demo on {targetChain.name}{target === "sepolia" ? " (testnet, no real value)" : ""}. The contracts are unaudited.
      </p>
      {nftAddress && tokenAddress ? (
        <Dapp nft={nftAddress} token={tokenAddress} />
      ) : (
        <section className="card">
          <h2>Setup needed</h2>
          <p>Set <code>VITE_NFT_ADDRESS</code> and <code>VITE_TOKEN_ADDRESS</code> in <code>app/.env</code> (see <code>.env.example</code>), then restart the dev server.</p>
        </section>
      )}
    </main>
  );
}
