import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOwnedTokens } from "./indexerApi";

const owner = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

function respond(body: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchOwnedTokens", () => {
  it("parses decimal token ids into bigints and calls the owner route", async () => {
    respond({ owner, token_ids: ["1", "2", "340282366920938463463374607431768211456"] });
    const ids = await fetchOwnedTokens("http://indexer.test/", owner);
    expect(ids).toEqual([1n, 2n, 2n ** 128n]);
    expect(fetch).toHaveBeenCalledWith(`http://indexer.test/owners/${owner}/tokens`, { signal: undefined });
  });

  it("rejects a non-OK status", async () => {
    respond({ error: "internal error" }, 500);
    await expect(fetchOwnedTokens("http://indexer.test", owner)).rejects.toThrow(/500/);
  });

  it("rejects malformed bodies rather than trusting them", async () => {
    for (const bad of [{}, { token_ids: "1" }, { token_ids: [1, 2] }, { token_ids: ["0x1"] }, { token_ids: ["-1"] }]) {
      respond(bad);
      await expect(fetchOwnedTokens("http://indexer.test", owner)).rejects.toThrow(/unexpected/);
    }
  });
});
