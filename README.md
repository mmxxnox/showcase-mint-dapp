# Showcase mint dApp: NFT + utility token contracts and a React frontend

A small, self-contained demonstration of how I structure, test and deploy NFT and token contracts, and how I
build the wallet-connected frontend on top of them.
It is **original work written for this portfolio**. It is not client code and does not reproduce any
confidential project.

> **Status:** contracts tested locally (38 passing tests) and **deployed to the Sepolia testnet on 29 Oct 2026**
> (addresses below). **Not audited. Not deployed to mainnet. Etherscan source verification not yet confirmed.**
> A React mint frontend for these contracts is in [`app/`](app/README.md).

| Contract | Sepolia address | Deploy block |
|---|---|---|
| `ShowcaseToken` (SHOW) | [`0x054b25B017f385488F5609Fbb8bC80750B7fD339`](https://sepolia.etherscan.io/address/0x054b25B017f385488F5609Fbb8bC80750B7fD339) | 12021690 |
| `ShowcaseNFT` (SHOWNFT) | [`0xaBB918E5463C43e14066532746349ba5CeC3361F`](https://sepolia.etherscan.io/address/0xaBB918E5463C43e14066532746349ba5CeC3361F) | 12021695 |

**Live demo (Sepolia testnet):** https://showcase-mint-dapp.vercel.app. It reads the contracts above. Minting needs a wallet on Sepolia with test ETH; the mint flows have been tested against a local chain but **not yet clicked through with a real wallet on the hosted site**.

Read back from the chain after deployment: 1,000 max supply, 5 per wallet, 0.01 ETH or 100 SHOW per mint, 3-day admin
handover delay, minting not paused. No NFTs minted yet. The deployer holds the initial 1,000,000 SHOW and both admin roles.

## What is in it

| Contract | Standard | Highlights |
| --- | --- | --- |
| `ShowcaseToken` | ERC-20 | Hard supply cap, burnable, EIP-2612 `permit`, role-gated minting |
| `ShowcaseNFT` | ERC-721 | Capped supply, per-wallet limit, ETH **or** token-burn minting, EIP-2981 royalties, pause, one-way reveal, treasury withdrawal |

The two are linked: holders can mint an NFT by burning `tokenPrice` of the utility token
(`mintWithToken`), which makes the token a deflationary utility rather than a standalone asset.

Stack: Solidity 0.8.34, OpenZeppelin Contracts 5.x, Hardhat 3, ethers v6, Mocha/Chai, Hardhat Ignition.

## Design decisions

- **Custom errors and exact payment.** `mint` requires `msg.value == price * quantity`. No refund logic, so
  no refund bugs and no stuck-dust cases.
- **Checks, effects, interactions.** Supply and per-wallet counters update *before* `_safeMint` calls the
  receiver hook, and mint paths are also `nonReentrant`. A test with a hostile receiver contract proves it;
  removing the guard makes that test fail.
- **Roles, not a single owner.** `DEFAULT_ADMIN_ROLE` controls the treasury address; `MANAGER_ROLE` runs
  pause, pricing, reveal and royalty. Splitting them lets day-to-day operations sit in a lower-risk key.
- **Pull-style withdrawals to a fixed address.** `withdraw()` is callable by anyone but can only pay the
  treasury, so a griefing caller gains nothing. A treasury that rejects ETH reverts cleanly and keeps the funds.
- **Bounded royalties.** Royalty changes are capped at 10% so a compromised manager key cannot set them to 100%.
- **Reveal is one-way.** After `reveal`, the base URI cannot be swapped silently.

## Security

A self-directed red-team pass found and fixed three contract issues (price change between quote and mint, single-step admin
handover, irreversible empty reveal) and two frontend issues, each with a regression test. See [SECURITY.md](SECURITY.md).
This is not an independent audit.

## Testing

```bash
npm install
npm test
```

The suite covers the happy paths plus the cases that usually cause incidents: exact-payment edges, the
per-wallet limit across several transactions, selling out, allowance and balance failures on token minting,
ETH sent to a non-payable function (raw calldata, on-chain revert), pause and role checks, a treasury that
refuses ETH, permit signing and replay, the supply cap, and reentrancy through the ERC-721 receiver hook.

## Deploying to Sepolia

Secrets are kept in the Hardhat keystore, never in the repo:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY     # use a throwaway testnet key
npx hardhat keystore set ETHERSCAN_API_KEY

npm run deploy:local        # dry run on the simulated network
npm run deploy:sepolia      # real testnet deployment
```

Override parameters (prices, supply, treasury, hidden URI, `adminDelay` in seconds) with a JSON file:

```bash
npx hardhat ignition deploy ignition/modules/Showcase.ts --network sepolia --parameters params.json
```

Verification, using the constructor arguments you deployed with:

```bash
npx hardhat verify --network sepolia <address> <constructor args...>
```

## Known limitations (what I would change before production)

- **No allowlist or phased sale.** A Merkle-proof allowlist and separate sale phases would be the next addition.
- **Per-wallet limits are per address.** They stop casual bulk minting, not a determined user with many wallets.
- **Batch minting loops.** Gas grows with `quantity`; the limit per wallet keeps it bounded, but a production
  collection might use ERC-721A-style batching.
- **No on-chain enumeration.** Holder listing is expected to come from an indexer, not `ERC721Enumerable`.
- **Metadata hosting is out of scope.** The reveal URI should point at pinned IPFS content.
- **Needs an independent audit** and a fuzz/invariant suite before holding real value.

## Licence

MIT.
