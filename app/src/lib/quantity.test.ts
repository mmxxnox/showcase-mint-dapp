import { describe, expect, it } from "vitest";
import { clampQuantity } from "./quantity";

describe("clampQuantity", () => {
  it("never yields a value BigInt() would reject", () => {
    for (const raw of ["1.5", "2.9", "-3", "0", "", "abc", "NaN", "Infinity", "-Infinity", "1e21", " 4 ", 7.7, NaN]) {
      expect(() => BigInt(clampQuantity(raw, 5))).not.toThrow();
    }
  });
  it("clamps into [1, max]", () => {
    expect(clampQuantity("99", 5)).toBe(5);
    expect(clampQuantity("0", 5)).toBe(1);
    expect(clampQuantity("3", 5)).toBe(3);
    expect(clampQuantity("2.9", 5)).toBe(2);
  });
  it("treats a zero or fractional max as 1 so the box is never empty", () => {
    expect(clampQuantity("4", 0)).toBe(1);
    expect(clampQuantity("4", 0.5)).toBe(1);
  });
});
