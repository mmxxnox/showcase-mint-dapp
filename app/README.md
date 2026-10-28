# Showcase dApp: mint frontend

A React + TypeScript frontend for the contracts in the parent folder. Connect a wallet, mint the
ERC-721 with ETH or by burning the ERC-20, and see what you own.

Stack: Vite, React 19, wagmi 3, viem 2, TanStack Query. No UI framework; plain CSS with light and dark themes.

## What it does

- **Wallet and network:** injected wallets (MetaMask and similar), plus WalletConnect when a project id is set.
  If the wallet is on the wrong chain, a banner offers a one-click switch and minting stays disabled.
- **Collection stats:** supply, both prices, wallet limit, paused and reveal state, all read in one multicall.
- **Mint with ETH:** exact payment, quantity capped by remaining supply and your remaining wallet allowance.
- **Mint by burning SHOW:** two steps shown as one button. It reads your allowance, offers **Approve** if it is
  short, then **Mint**. A missing balance is explained before anything is sent.
- **Simulate before send:** every write is simulated first, so a failing call is explained in plain words
  before the wallet opens and costs no gas.
- **Readable errors:** custom contract errors (`IncorrectPayment`, `WalletLimitExceeded`, `SoldOut`,
  `EnforcedPause`, token allowance and balance errors) and wallet rejections map to short messages.
  See `src/lib/errors.ts`.
- **Transaction states:** waiting for signature, pending, confirmed, failed or reverted on-chain, with an
  Etherscan link. Reads refresh when a transaction confirms.
- **Your NFTs, two sources.** By default a direct RPC log scan: `Transfer` logs read in chunks from the deploy
  block, then `ownerOf` drops any token you have since sent on. If `VITE_INDEXER_URL` is set, a switch appears and
  the list can come from [`chain-indexer-rs`](https://github.com/mmxxnox/chain-indexer-rs) instead. Each load shows
  how long it took and which source served it. The indexer response is validated, not trusted, and if the
  indexer is down the panel says so and points to the RPC scan.

## Run it

```bash
# 1. In the parent folder: compile, deploy, note the printed addresses and the deploy block
npx hardhat build
npm run deploy:sepolia

# 2. In this folder
npm install
npm run abi                  # regenerates src/abi/* from the compiled artifacts
cp .env.example .env         # set VITE_NFT_ADDRESS, VITE_TOKEN_ADDRESS, VITE_DEPLOY_BLOCK
npm run dev
```

The ABI files are committed, so step `npm run abi` is only needed after the contracts change.

**Getting SHOW tokens for the burn path:** the deployer holds the initial supply. Send some to a test wallet with
`transfer` from the token's "Write Contract" tab on Sepolia Etherscan.

**Local node instead of Sepolia:** run `npx hardhat node`, deploy with
`npx hardhat ignition deploy ignition/modules/Showcase.ts --network localhost`, set `VITE_CHAIN=local`,
and add the Hardhat network (chain id 31337, RPC `http://127.0.0.1:8545`) to your wallet.

## Tests

```bash
npm run typecheck
npm test                     # unit tests for error mapping and number formatting
```

`src/e2e.local.test.ts` runs the same simulate-then-send calls the UI makes against a local node (ETH mint,
approve and token mint, wrong payment, wallet limit, pause, ownership scan). It is skipped by default:

```bash
E2E_LOCAL=1 E2E_NFT=<nft address> E2E_TOKEN=<token address> npm test
```

## RPC scan vs indexer

Measured on a local Hardhat node: 100,008 blocks, 3 mints, one wallet holding 2 tokens, 7 runs each
(`E2E_BENCH=1`, `src/bench.local.test.ts`). Both sources returned **exactly the same tokens**.

| Source | Median | Requests |
|---|---|---|
| RPC log scan | 3.9 ms | 6 (block number, 3 log ranges, 2 `ownerOf`) |
| chain-indexer-rs | 0.5 ms | 1 |

**Read this carefully:** a local node has no network latency, so the timing gap is small and understates a remote
RPC. The number that matters is the request count. The scan needs one `eth_getLogs` per 40,000 blocks since deploy,
so it grows with the chain's age and with the number of tokens, and each call is exposed to public-RPC rate
limits. The indexer is one request however old the chain is. Sepolia numbers have not been measured yet; add them
here after the deploy.

To reproduce: run a Hardhat node, deploy, mint, `hardhat_mine` some blocks, sync the indexer, then
`E2E_BENCH=1 E2E_NFT=<nft> E2E_USER=<wallet> E2E_INDEXER=http://127.0.0.1:3000 npm test`.

## Hosting securely

- **Headers.** `security-headers.mjs` is the single source for the CSP, framing and referrer headers. `npm run headers` writes
  `public/_headers` (Netlify, Cloudflare Pages) and `vercel.json`; `vite preview` serves the same set. Edit the `.mjs`, then
  re-run the script. The page needs a strict CSP because it asks users to sign transactions.
- **Pin `connect-src`.** It currently allows any `https:`/`wss:` origin because RPC and indexer URLs vary. Once fixed, list only
  those origins. If you enable WalletConnect, add the entries its modal needs.
- **`VITE_*` values are public.** They are compiled into the bundle. Never put a secret there. For an RPC key, use one restricted
  to your domain, or proxy RPC through your own backend.

## Known limitations

- **Not tested in a browser with a real wallet yet.** The contract calls, error decoding and log scan are covered by
  the local test; the React components are type-checked and build, but the click-through needs a wallet.
- **Hidden metadata:** NFTs are listed by id only. Once the collection is revealed and pinned to IPFS, the next
  step is fetching `tokenURI` and showing the image.
- **Log scan on public RPCs:** a long chain history on a rate-limited RPC can be slow. Setting
  `VITE_DEPLOY_BLOCK` and your own `VITE_SEPOLIA_RPC_URL` helps; the indexer source is the real fix.
- **The indexer source is not browser-tested.** Its fetch and validation are unit-tested and it was timed from Node, but
  the switch has not been clicked through in a browser.
- **The indexer trails the chain** by its poll interval, so a fresh mint can appear a few seconds late. The panel re-checks every 4 s.
- **No admin screen.** Pause, pricing and reveal are done from the contract directly.
- **Single-chain.** One target network per build.
