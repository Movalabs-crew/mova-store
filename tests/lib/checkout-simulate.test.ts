import { describe, it, expect } from "vitest";
import { Account, StrKey, xdr, scValToNative } from "@stellar/stellar-sdk";

import {
  usdToRawUnits,
  orderIdHash,
} from "../../lib/stellar/checkout";
import {
  buildInvocationTransaction,
} from "../../lib/stellar/simulate";
import {
  addressToScVal,
  bytes32ToScVal,
  hashOrderId,
  i128ToScVal,
} from "../../lib/stellar/scval";

describe("Pay Invocation Argument Construction & Simulate Tests", () => {
  const buyerAddress = "GC6EQJ4UAFFFJDECLN37G4EWUJJTMKE3WE55NGIL4JXJXNXICUYKVBQ6";
  const dummyAccount = new Account(buyerAddress, "100");
  const contractId = StrKey.encodeContract(Buffer.alloc(32, 1));
  const tokenAddress = StrKey.encodeContract(Buffer.alloc(32, 2));

  it("produces deterministic 64-char lowercase hex order id hashes", async () => {
    const orderId = "ORD-2026-TEST-9988";
    const hex1 = await orderIdHash(orderId);
    const hex2 = await orderIdHash(orderId);

    expect(hex1).toBe(hex2);
    expect(hex1).toHaveLength(64);
    expect(hex1).toMatch(/^[0-9a-f]{64}$/);

    const hashBytes = await hashOrderId(orderId);
    expect(hashBytes).toBeInstanceOf(Uint8Array);
    expect(hashBytes.length).toBe(32);
  });

  it("converts USD amounts to raw units accurately", () => {
    expect(usdToRawUnits(10)).toBe(100_000_000n);
    expect(usdToRawUnits(12.34)).toBe(123_400_000n);
    expect(usdToRawUnits(0.5)).toBe(5_000_000n);
    expect(() => usdToRawUnits(0)).toThrow("Invalid amount to pay.");
    expect(() => usdToRawUnits(-5)).toThrow("Invalid amount to pay.");
  });

  it("builds pay invocation transaction with exact function name and 4 arguments", async () => {
    const orderId = "ORDER-PAY-INVOKE-123";
    const amountUsd = 25.5;
    const amountRaw = usdToRawUnits(amountUsd);
    const orderBytes = await hashOrderId(orderId);

    const args = [
      addressToScVal(tokenAddress),
      addressToScVal(buyerAddress),
      bytes32ToScVal(orderBytes),
      i128ToScVal(amountRaw),
    ];

    const tx = buildInvocationTransaction(
      dummyAccount,
      contractId,
      "pay",
      args
    );

    expect(tx.operations).toHaveLength(1);
    const op = tx.operations[0];
    expect(op.type).toBe("invokeHostFunction");

    if (op.type === "invokeHostFunction") {
      const hostFn = op.func;
      expect(hostFn.switch()).toBe(xdr.HostFunctionType.hostFunctionTypeInvokeContract());

      const invokeArgs = hostFn.invokeContract();
      const fnSymbol = invokeArgs.functionName().toString();
      expect(fnSymbol).toBe("pay");

      const passedArgs = invokeArgs.args();
      expect(passedArgs).toHaveLength(4);

      // Arg 0: token address
      expect(passedArgs[0].switch()).toBe(xdr.ScValType.scvAddress());

      // Arg 1: buyer address
      expect(passedArgs[1].switch()).toBe(xdr.ScValType.scvAddress());

      // Arg 2: 32-byte order bytes
      expect(passedArgs[2].switch()).toBe(xdr.ScValType.scvBytes());
      const bytesPayload = passedArgs[2].bytes();
      expect(bytesPayload.length).toBe(32);
      expect(new Uint8Array(bytesPayload)).toEqual(orderBytes);

      // Arg 3: i128 amount
      expect(passedArgs[3].switch()).toBe(xdr.ScValType.scvI128());
      expect(scValToNative(passedArgs[3])).toBe(255_000_000n);
    }
  });
});
