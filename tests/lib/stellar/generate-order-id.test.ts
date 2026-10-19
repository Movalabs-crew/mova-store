import { afterEach, describe, expect, it, vi } from "vitest";

import { generateOrderId } from "../../../lib/stellar/orders";

/**
 * Coverage for #708.
 *
 * Order ids are hashed to the contract's unique `order_id`; a predictable id
 * lets an observer pre-register a buyer's likely id and permanently block the
 * checkout (`OrderAlreadyPaid`). The generator must therefore draw from a
 * CSPRNG and must not depend on `Math.random` at all.
 */
afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateOrderId (#708)", () => {
  it("produces an SS- prefixed id without using Math.random", () => {
    const mathRandom = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random must not be used to generate order ids");
    });
    const getRandomValues = vi.spyOn(globalThis.crypto, "getRandomValues");

    const id = generateOrderId();

    expect(id).toMatch(/^SS-\d+-\d{1,6}$/);
    expect(mathRandom).not.toHaveBeenCalled();
    expect(getRandomValues).toHaveBeenCalledTimes(1);
  });

  it("keeps the original shape: numeric suffix within 0..999_999", () => {
    for (let i = 0; i < 50; i += 1) {
      const id = generateOrderId();
      expect(id).toMatch(/^SS-\d+-\d{1,6}$/);

      const suffix = Number(id.slice(id.lastIndexOf("-") + 1));
      expect(Number.isInteger(suffix)).toBe(true);
      expect(suffix).toBeGreaterThanOrEqual(0);
      expect(suffix).toBeLessThan(1_000_000);
    }
  });

  it("returns different ids across calls rather than a constant", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      ids.add(generateOrderId());
    }
    // A CSPRNG-backed suffix collapsing 50 draws into one value is
    // astronomically unlikely; a constant generator would fail here.
    expect(ids.size).toBeGreaterThan(1);
  });
});
