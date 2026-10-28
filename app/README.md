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
- **Your NFTs:** `Transfer` logs scanned in chunks from the deploy block, then `ownerOf` drops any token
  you have since sent on.

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

## Known limitations

- **Not tested in a browser with a real wallet yet.** The contract calls, error decoding and log scan are covered by
  the local test; the React components are type-checked and build, but the click-through needs a wallet.
- **Hidden metadata:** NFTs are listed by id only. Once the collection is revealed and pinned to IPFS, the next
  step is fetching `tokenURI` and showing the image.
- **Log scan on public RPCs:** a long chain history on a rate-limited RPC can be slow. Setting
  `VITE_DEPLOY_BLOCK` and your own `VITE_SEPOLIA_RPC_URL` fixes that; an indexer (The Graph) is the production answer.
- **No admin screen.** Pause, pricing and reveal are done from the contract directly.
- **Single-chain.** One target network per build.
