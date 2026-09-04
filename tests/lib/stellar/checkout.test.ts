import { describe, it, expect } from "vitest";
import { orderIdHash } from "../../../lib/stellar/checkout";
import { bytesToHex, hashOrderId } from "../../../lib/stellar/scval";

describe("orderIdHash and hex encoding", () => {
  it("computes 64-character lowercase hex order id matching bytesToHex(hashOrderId)", async () => {
    const input = "abc";
    const expectedBytes = await hashOrderId(input);
    const expectedHex = bytesToHex(expectedBytes);

    const result = await orderIdHash(input);

    expect(result).toBe(expectedHex);
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles arbitrary order id strings deterministically", async () => {
    const orderIds = [
      "order-12345",
      "test_order_999",
      "",
      "special-!@#$%^&*()_+",
    ];

    for (const id of orderIds) {
      const hashed = await orderIdHash(id);
      const manual = bytesToHex(await hashOrderId(id));
      expect(hashed).toBe(manual);
      expect(hashed).toHaveLength(64);
      expect(hashed).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
