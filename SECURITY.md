# Security review: showcase-mint-dapp

A self-directed red-team pass over the contracts and the frontend, done 28 Oct 2026. **This is not an independent
audit.** The contracts are unaudited and must not hold real value. Each finding below was demonstrated first
(a failing test or a reproduction), then fixed, then covered by a regression test.

## Findings fixed

| ID | Severity | Where | Issue | Fix | Regression test |
|---|---|---|---|---|---|
| F-1 | Medium | `ShowcaseNFT.mintWithToken` | No maximum-cost argument. A manager raising `tokenPrice` between a user's quote and inclusion burned more SHOW than quoted, silently, for anyone with a large allowance (reproduced: 1,000 SHOW burned after a 100 SHOW quote). | `mintWithToken(quantity, maxTotalCost)`; reverts `CostExceedsMax` and burns nothing. | `test/RedTeam.ts` F-1 |
| F-2 | Medium | Both contracts | Single-step admin role. A mistyped `grantRole`/`renounceRole` could lock or hand over control instantly. | Both inherit `AccessControlDefaultAdminRules`: two-step, delayed handover (`adminDelay`, default 3 days), cancellable, no one-step renounce. | `test/RedTeam.ts` F-2 |
| F-3 | Low | `ShowcaseNFT.reveal` | The one-way reveal accepted an empty base URI, which would permanently break metadata. | Reverts `EmptyBaseURI`. | `test/RedTeam.ts` F-3 |
| D-1 | Medium | `MintPanel` | Typing a fractional quantity (`1.5`) made `BigInt()` throw during render and blank the page. | `clampQuantity` always yields a whole number in range. | `src/lib/quantity.test.ts` |
| D-2 | Medium | Hosting | No Content-Security-Policy, framing protection or other headers on a page that asks users to sign transactions. | One header set in `security-headers.mjs`, written to `public/_headers` (Netlify, Cloudflare Pages) and `vercel.json`. | Loaded under the enforced CSP in headless Chrome; a deliberately broken CSP stopped the app rendering, so the check can fail. |
| D-3 | Info | `VITE_SEPOLIA_RPC_URL` | Every `VITE_*` value is compiled into the public bundle. An unrestricted RPC key there is public. | Documented in `app/README.md` and `.env.example`; use a domain-restricted key or a proxy. | n/a |

## Attacks tried that already failed

Covered in `test/RedTeam.ts`: manager escalating to admin or minting SHOW; stranger granting themselves a role or
pausing; royalty redirect or over-cap; `price * quantity` overflow; force-sent ETH (SELFDESTRUCT) distorting mint or
withdraw accounting; plain ETH transfers to the NFT; expired ERC-2612 permit. Earlier suites cover reentrancy through
the ERC-721 receiver hook, permit replay, and exact-payment edges.

## Accepted risks and trust assumptions

- **A manager can still change prices and pause.** Users are protected from price changes (exact ETH payment, `maxTotalCost`
  for tokens) but not from a paused or repriced sale. Put the manager key behind a multisig.
- **Per-wallet limit is per address.** Many wallets, or transferring tokens away and minting again, bypass it.
- **Deploy parameters are not range-checked** beyond zero addresses and royalty. `maxPerWallet` bounds the mint loop's gas;
  a huge value deployed by mistake is not rejected.
- **The treasury receives ETH by `call`.** A treasury that rejects ETH just makes `withdraw` revert; funds stay put.
- **`setPrices` accepts zero**, which makes a mint free. Intentional for a free-mint phase, but worth a reviewer's eye.

## Not done

- No static analysis (Slither, Mythril) and no fuzz or invariant suite. A Foundry invariant suite is the natural next step.
- No independent audit.
- The UI has not been exercised with a real wallet. The CSP was checked with a wallet-less headless browser, so
  WalletConnect's modal (which needs extra `img-src`/`frame-src` entries) is untested.
- `connect-src` allows any `https:`/`wss:` origin because RPC and indexer URLs vary per deployment. Pin them once fixed.

## Dependencies

- `npm audit --omit=dev`: 0 vulnerabilities in both the contracts package and the app.
- `npm audit` (including dev tooling): 13 high findings, all inside the Hardhat toolchain through `zod` (memory
  exhaustion when validating oversized input). No fix is available upstream; none of it ships in the app or the contracts.
  Do not run the Hardhat tooling against untrusted configuration files.

## Reporting

This is a portfolio project. If you find a problem, open a GitHub issue.
