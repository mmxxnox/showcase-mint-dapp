// Adversarial tests: each one is an attack that must fail (or, for F-1..F-3, a regression test for a fixed finding).
import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

const ETH_PRICE = ethers.parseEther("0.05");
const TOKEN_PRICE = ethers.parseEther("100");
const DELAY = 3n * 24n * 60n * 60n;

async function deploy() {
  const [admin, treasury, alice, manager, stranger, newAdmin] = await ethers.getSigners();
  const token = await ethers.deployContract("ShowcaseToken", [
    admin.address, ethers.parseEther("10000000"), ethers.parseEther("1000000"), DELAY,
  ]);
  const nft = await ethers.deployContract("ShowcaseNFT", [
    admin.address, treasury.address, await token.getAddress(), 10n, 3n, ETH_PRICE, TOKEN_PRICE, 500n, "ipfs://h", DELAY,
  ]);
  await token.transfer(alice.address, ethers.parseEther("5000"));
  return { nft, token, admin, treasury, alice, manager, stranger, newAdmin };
}

describe("red team", function () {
  describe("F-1: price change between quote and inclusion (fixed)", function () {
    it("refuses to burn more than the caller's stated maximum, even with an unlimited allowance", async function () {
      const { nft, token, admin, alice } = await deploy();
      await token.connect(alice).approve(await nft.getAddress(), ethers.MaxUint256);
      await nft.connect(admin).setPrices(ETH_PRICE, TOKEN_PRICE * 10n); // manager raises the price 10x

      const before = await token.balanceOf(alice.address);
      await expect(nft.connect(alice).mintWithToken(1n, TOKEN_PRICE))
        .to.be.revertedWithCustomError(nft, "CostExceedsMax")
        .withArgs(TOKEN_PRICE * 10n, TOKEN_PRICE);
      expect(await token.balanceOf(alice.address)).to.equal(before); // nothing burned
    });

    it("still mints at or below the stated maximum", async function () {
      const { nft, token, admin, alice } = await deploy();
      await token.connect(alice).approve(await nft.getAddress(), ethers.MaxUint256);
      await nft.connect(admin).setPrices(ETH_PRICE, TOKEN_PRICE / 2n); // price drops: caller pays the lower price
      await nft.connect(alice).mintWithToken(1n, TOKEN_PRICE);
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("5000") - TOKEN_PRICE / 2n);
    });
  });

  describe("F-2: admin handover (fixed)", function () {
    it("is two-step and delayed, so a mistyped address cannot take or lock the role", async function () {
      const { nft, admin, newAdmin, stranger } = await deploy();
      await nft.connect(admin).beginDefaultAdminTransfer(newAdmin.address);

      // Too early, and by the wrong party.
      await expect(nft.connect(newAdmin).acceptDefaultAdminTransfer()).to.be.revertedWithCustomError(
        nft, "AccessControlEnforcedDefaultAdminDelay",
      );
      await networkHelpers.time.increase(DELAY + 1n);
      await expect(nft.connect(stranger).acceptDefaultAdminTransfer()).to.be.revertedWithCustomError(
        nft, "AccessControlInvalidDefaultAdmin",
      );

      // The old admin keeps control until the intended recipient accepts.
      expect(await nft.defaultAdmin()).to.equal(admin.address);
      await nft.connect(newAdmin).acceptDefaultAdminTransfer();
      expect(await nft.defaultAdmin()).to.equal(newAdmin.address);
      await expect(nft.connect(admin).setTreasury(admin.address)).to.be.revertedWithCustomError(
        nft, "AccessControlUnauthorizedAccount",
      );
    });

    it("cannot be abandoned by a plain renounce", async function () {
      const { nft, token, admin } = await deploy();
      const role = await nft.DEFAULT_ADMIN_ROLE();
      // Renouncing is only allowed through the same delayed flow, never in one step.
      await expect(nft.connect(admin).renounceRole(role, admin.address)).to.be.revertedWithCustomError(
        nft, "AccessControlEnforcedDefaultAdminDelay",
      );
      await expect(token.connect(admin).renounceRole(role, admin.address)).to.be.revertedWithCustomError(
        token, "AccessControlEnforcedDefaultAdminDelay",
      );
      // And the role cannot be handed out directly either.
      await expect(nft.connect(admin).grantRole(role, admin.address)).to.be.revertedWithCustomError(
        nft, "AccessControlEnforcedDefaultAdminRules",
      );
    });

    it("can be cancelled before it is accepted", async function () {
      const { nft, admin, newAdmin } = await deploy();
      await nft.connect(admin).beginDefaultAdminTransfer(newAdmin.address);
      await nft.connect(admin).cancelDefaultAdminTransfer();
      await networkHelpers.time.increase(DELAY + 1n);
      await expect(nft.connect(newAdmin).acceptDefaultAdminTransfer()).to.be.revert(ethers);
    });
  });

  describe("F-3: irreversible reveal (fixed)", function () {
    it("rejects an empty base URI and stays unrevealed", async function () {
      const { nft, admin } = await deploy();
      await expect(nft.connect(admin).reveal("")).to.be.revertedWithCustomError(nft, "EmptyBaseURI");
      expect(await nft.revealed()).to.equal(false);
    });
  });

  describe("privilege boundaries", function () {
    it("a manager cannot grant roles, move the treasury, or mint SHOW", async function () {
      const { nft, token, admin, manager } = await deploy();
      await nft.connect(admin).grantRole(await nft.MANAGER_ROLE(), manager.address);
      await expect(nft.connect(manager).grantRole(await nft.DEFAULT_ADMIN_ROLE(), manager.address)).to.be.revert(ethers);
      await expect(nft.connect(manager).setTreasury(manager.address)).to.be.revertedWithCustomError(
        nft, "AccessControlUnauthorizedAccount",
      );
      await expect(token.connect(manager).mint(manager.address, 1n)).to.be.revertedWithCustomError(
        token, "AccessControlUnauthorizedAccount",
      );
    });

    it("a stranger cannot make themselves a manager or pause minting", async function () {
      const { nft, stranger } = await deploy();
      await expect(nft.connect(stranger).grantRole(await nft.MANAGER_ROLE(), stranger.address)).to.be.revert(ethers);
      await expect(nft.connect(stranger).pause()).to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount");
      await expect(nft.connect(stranger).setPrices(0n, 0n)).to.be.revertedWithCustomError(
        nft, "AccessControlUnauthorizedAccount",
      );
    });

    it("royalty cannot be redirected or raised past the cap by a stranger or by a manager", async function () {
      const { nft, admin, stranger } = await deploy();
      await expect(nft.connect(stranger).setDefaultRoyalty(stranger.address, 500n)).to.be.revert(ethers);
      await expect(nft.connect(admin).setDefaultRoyalty(admin.address, 1_001n)).to.be.revertedWithCustomError(
        nft, "RoyaltyTooHigh",
      );
    });
  });

  describe("arithmetic and payment edges", function () {
    it("overflowing quantities revert instead of wrapping to a cheap price", async function () {
      const { nft, alice } = await deploy();
      const huge = 2n ** 255n;
      await expect(nft.connect(alice).mint(huge, { value: 0n })).to.be.revert(ethers); // price * quantity overflows
      await expect(nft.connect(alice).mintWithToken(huge, ethers.MaxUint256)).to.be.revert(ethers);
    });

    it("force-sent ETH does not break minting, and withdraw still pays only the treasury", async function () {
      const { nft, treasury, alice, stranger } = await deploy();
      await ethers.deployContract("ForceSend", [await nft.getAddress()], { value: 1n });
      await nft.connect(alice).mint(1n, { value: ETH_PRICE }); // exact price still works
      const before = await ethers.provider.getBalance(treasury.address);
      await nft.connect(stranger).withdraw(); // anyone may trigger it; funds can only go to the treasury
      expect((await ethers.provider.getBalance(treasury.address)) - before).to.equal(ETH_PRICE + 1n);
    });

    it("plain ETH transfers to the NFT contract are rejected", async function () {
      const { nft, alice } = await deploy();
      await expect(alice.sendTransaction({ to: await nft.getAddress(), value: 1n })).to.be.revert(ethers);
    });
  });

  describe("token", function () {
    it("rejects an expired permit", async function () {
      const { nft, token, alice } = await deploy();
      const deadline = (await networkHelpers.time.latest()) - 1;
      const domain = { name: "Showcase Token", version: "1", chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: await token.getAddress() };
      const types = { Permit: [
        { name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
      ] };
      const value = TOKEN_PRICE;
      const sig = ethers.Signature.from(await alice.signTypedData(domain, types, {
        owner: alice.address, spender: await nft.getAddress(), value, nonce: await token.nonces(alice.address), deadline,
      }));
      await expect(token.permit(alice.address, await nft.getAddress(), value, deadline, sig.v, sig.r, sig.s))
        .to.be.revertedWithCustomError(token, "ERC2612ExpiredSignature");
    });
  });
});
