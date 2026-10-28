import { describe, expect, it } from "vitest";
import { ContractFunctionExecutionError, ContractFunctionRevertedError, UserRejectedRequestError, encodeErrorResult, parseEther } from "viem";
import { showcaseNftAbi } from "../abi/showcaseNftAbi";
import { explainRevert, friendlyError } from "./errors";
import { formatAmount } from "./format";

function revertFor(errorName: "WalletLimitExceeded" | "SoldOut") {
  const data = encodeErrorResult({ abi: showcaseNftAbi, errorName });
  const revert = new ContractFunctionRevertedError({ abi: showcaseNftAbi, data, functionName: "mint" });
  return new ContractFunctionExecutionError(revert, { abi: showcaseNftAbi, functionName: "mint", args: [1n] });
}

describe("explainRevert", () => {
  it("states the expected and sent ETH for IncorrectPayment", () => {
    const text = explainRevert("IncorrectPayment", [parseEther("0.02"), parseEther("0.01")]);
    expect(text).toContain("0.02 ETH");
    expect(text).toContain("0.01 ETH");
  });
  it("falls back to a generic message for unknown errors", () => {
    expect(explainRevert("Mystery")).toContain("Mystery");
    expect(explainRevert(undefined)).toContain("rejected");
  });
});

describe("explainRevert: price protection", () => {
  it("tells the user nothing was burned when the price moved above their maximum", () => {
    const text = explainRevert("CostExceedsMax", [parseEther("1000"), parseEther("100")]);
    expect(text).toContain("1000 SHOW");
    expect(text).toContain("100 SHOW");
    expect(text).toMatch(/Nothing was burned/);
  });
});

describe("friendlyError", () => {
  it("decodes a custom error from revert data", () => {
    expect(friendlyError(revertFor("WalletLimitExceeded"))).toMatch(/per-wallet limit/);
    expect(friendlyError(revertFor("SoldOut"))).toMatch(/left to mint/);
  });
  it("tells the user a wallet rejection sent nothing", () => {
    const rejected = new ContractFunctionExecutionError(new UserRejectedRequestError(new Error("denied")), {
      abi: showcaseNftAbi, functionName: "mint", args: [1n],
    });
    expect(friendlyError(rejected)).toMatch(/cancelled/);
  });
});

describe("formatAmount", () => {
  it("trims trailing zeros", () => {
    expect(formatAmount(100n * 10n ** 18n)).toBe("100");
    expect(formatAmount(10n ** 16n)).toBe("0.01");
  });
});
