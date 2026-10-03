import { describe, it, expect } from "vitest";
import { xdr, nativeToScVal } from "@stellar/stellar-sdk";
import { scValToString, addressToScVal, i128ToScVal } from "../../../lib/stellar/scval";

// A well-known valid ed25519 account strkey used across the Stellar docs/tests.
const KNOWN_ADDRESS = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

interface ScValCase {
  type: string;
  build: () => xdr.ScVal;
  expected: string;
}

// Every branch `scValToString` claims to support (see its doc comment):
// symbols, strings, addresses, bytes, numbers/bigints and maps/vecs (JSON).
const cases: ScValCase[] = [
  {
    type: "symbol",
    build: () => xdr.ScVal.scvSymbol("hello_world"),
    expected: "hello_world",
  },
  {
    type: "string",
    build: () => xdr.ScVal.scvString("hello world"),
    expected: "hello world",
  },
  {
    type: "address",
    build: () => addressToScVal(KNOWN_ADDRESS),
    expected: KNOWN_ADDRESS,
  },
  {
    type: "bytes",
    build: () => xdr.ScVal.scvBytes(new Uint8Array([0xde, 0xad, 0xbe, 0xef])),
    expected: "deadbeef",
  },
  {
    type: "empty bytes",
    build: () => xdr.ScVal.scvBytes(new Uint8Array()),
    expected: "",
  },
  {
    type: "i128",
    build: () => i128ToScVal(12345678901234567890n),
    expected: "12345678901234567890",
  },
  {
    type: "negative i128",
    build: () => i128ToScVal(-12345678901234567890n),
    expected: "-12345678901234567890",
  },
  {
    type: "i64",
    build: () => nativeToScVal(-5n, { type: "i64" }),
    expected: "-5",
  },
  {
    type: "u64",
    build: () => nativeToScVal(18446744073709551615n, { type: "u64" }),
    expected: "18446744073709551615",
  },
  {
    type: "u32",
    build: () => xdr.ScVal.scvU32(7),
    expected: "7",
  },
  {
    type: "i32",
    build: () => xdr.ScVal.scvI32(-3),
    expected: "-3",
  },
  {
    type: "bool true",
    build: () => xdr.ScVal.scvBool(true),
    expected: "true",
  },
  {
    type: "bool false",
    build: () => xdr.ScVal.scvBool(false),
    expected: "false",
  },
  {
    type: "vec",
    build: () => xdr.ScVal.scvVec([xdr.ScVal.scvU32(1), xdr.ScVal.scvU32(2), xdr.ScVal.scvU32(3)]),
    expected: "[1,2,3]",
  },
  {
    type: "vec of i128 (bigint-safe JSON)",
    build: () => xdr.ScVal.scvVec([i128ToScVal(1n), i128ToScVal(2n)]),
    expected: '["1","2"]',
  },
  {
    type: "map",
    build: () =>
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("name"),
          val: xdr.ScVal.scvString("mova"),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("count"),
          val: xdr.ScVal.scvU32(1),
        }),
      ]),
    expected: '{"name":"mova","count":1}',
  },
];

// ScVal types the helper does not list as explicitly supported. They must be
// decoded to *something* string-shaped rather than throwing.
const unsupportedCases: ScValCase[] = [
  {
    type: "void",
    build: () => xdr.ScVal.scvVoid(),
    expected: "null",
  },
];

describe("scValToString", () => {
  it.each(cases)("decodes $type to $expected", ({ build, expected }) => {
    expect(scValToString(build())).toBe(expected);
  });

  it.each(unsupportedCases)(
    "degrades safely for the unsupported $type type",
    ({ build, expected }) => {
      const scVal = build();
      expect(() => scValToString(scVal)).not.toThrow();
      expect(typeof scValToString(scVal)).toBe("string");
      expect(scValToString(scVal)).toBe(expected);
    }
  );

  it("covers every supported branch exactly once in the table", () => {
    const covered = new Set(cases.map((c) => c.type));
    expect(covered).toEqual(
      new Set([
        "symbol",
        "string",
        "address",
        "bytes",
        "empty bytes",
        "i128",
        "negative i128",
        "i64",
        "u64",
        "u32",
        "i32",
        "bool true",
        "bool false",
        "vec",
        "vec of i128 (bigint-safe JSON)",
        "map",
      ])
    );
  });

  it("round-trips a symbol through an address helper boundary", () => {
    // Guards against a regression where the address branch is dropped and a
    // symbol/string accidentally matches first.
    const scVal = addressToScVal(KNOWN_ADDRESS);
    expect(scVal.type).toBe("scvAddress");
    expect(scValToString(scVal)).toBe(KNOWN_ADDRESS);
  });
});
