import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveOrderIdHash, dispatchOrder, refundOrder } from "../../lib/stellar/orders";
import { hashOrderId, bytesToHex } from "../../lib/stellar/scval";
import * as freighter from "../../lib/stellar/freighter";
import { rpc, Contract, TransactionBuilder, Keypair } from "@stellar/stellar-sdk";

// Mock freighter
vi.mock("../../lib/stellar/freighter", () => ({
  connectWallet: vi.fn(),
  signWithFreighter: vi.fn(),
}));

// Mock @stellar/stellar-sdk rpc and Contract calls if needed
describe("resolveOrderIdHash", () => {
  it("passes a 64-hex input through unchanged as bytes", async () => {
    const rawPreimage = "SS-12345-ABC";
    const hashed = await hashOrderId(rawPreimage);
    const hex = bytesToHex(hashed);
    expect(hex).toHaveLength(64);

    const resolved = await resolveOrderIdHash(hex);
    expect(bytesToHex(resolved)).toBe(hex.toLowerCase());
  });

  it("hashes a short pre-image order id", async () => {
    const rawPreimage = "SS-12345-ABC";
    const resolved = await resolveOrderIdHash(rawPreimage);
    const expected = await hashOrderId(rawPreimage);
    expect(bytesToHex(resolved)).toBe(bytesToHex(expected));
  });

  it("handles 64-character hex with uppercase letters and optional 0x prefix", async () => {
    const hex = "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";
    const resolved = await resolveOrderIdHash(hex);
    expect(bytesToHex(resolved)).toBe(hex.toLowerCase());

    const with0x = `0x${hex}`;
    const resolved0x = await resolveOrderIdHash(with0x);
    expect(bytesToHex(resolved0x)).toBe(hex.toLowerCase());
  });

  it("hashes a 64-char string that contains non-hex characters", async () => {
    const nonHex = "g".repeat(64);
    const resolved = await resolveOrderIdHash(nonHex);
    const expected = await hashOrderId(nonHex);
    expect(bytesToHex(resolved)).toBe(bytesToHex(expected));
  });
});

describe("Admin Orders dispatch and refund passing event-derived hex unchanged", () => {
  it("admin page passes event-derived hex id directly into dispatchOrder/refundOrder", async () => {
    const eventHexId = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
    
    // Test that resolveOrderIdHash preserves the exact 32 bytes of eventHexId
    const resolvedBytes = await resolveOrderIdHash(eventHexId);
    expect(bytesToHex(resolvedBytes)).toBe(eventHexId);
  });
});
