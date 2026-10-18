import { xdr, Address, scValToNative, nativeToScVal } from "@stellar/stellar-sdk";

import { WalletError } from "./freighter";

// ---------------------------------------------------------------------------
// ScVal construction + decoding helpers for the checkout contract.
// The contract `pay` signature is:
//   pay(token: Address, buyer: Address, order_id: BytesN<32>, amount: i128)
// ---------------------------------------------------------------------------

/**
 * Build an i128 ScVal. Verified byte-for-byte identical to
 * `nativeToScVal(v, { type: "i128" })` for arbitrary 128-bit values.
 */
export function i128ToScVal(value: bigint | number | string): xdr.ScVal {
  // Converting an imprecise Number to BigInt cannot recover its original value.
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new RangeError("i128 number inputs must be safe integers; use bigint or string");
  }
  const v = BigInt(value);
  const min = -(BigInt(1) << BigInt(127));
  const max = -min - BigInt(1);
  if (v < min || v > max) {
    throw new RangeError("i128 value is outside the signed 128-bit range");
  }
  const mask = BigInt("0xffffffffffffffff");
  // SDK 17 declares `xdr.Uint64`/`xdr.Int64` as plain `bigint` and takes the
  // halves as bigints, so the old js-xdr wrappers (`new xdr.Uint64(...)`) no
  // longer exist. The split is kept hand-rolled rather than delegating to
  // `nativeToScVal`, so the "byte-for-byte identical" test below stays an
  // independent check instead of becoming tautological.
  const lo = BigInt.asUintN(64, v & mask);
  const hi = BigInt.asIntN(64, v >> BigInt(64));
  return xdr.ScVal.scvI128(new xdr.Int128Parts({ lo, hi }));
}

/**
 * The SDK's generated typings still ask for Node's byte type on
 * `xdr.ScVal.scvBytes` and `StrKey.encodeContract`. Both accept any
 * `Uint8Array` at runtime, and these modules are bundled for the browser where
 * that global is not guaranteed, so widen at the call boundary instead of
 * constructing a Node value.
 */
type SdkBytes = Parameters<typeof xdr.ScVal.scvBytes>[0];

export function toSdkBytes(bytes: Uint8Array): SdkBytes {
  return bytes as unknown as SdkBytes;
}

/**
 * Build a BytesN<32> ScVal from a Uint8Array (or hex string).
 */
export function bytes32ToScVal(bytes: Uint8Array | string): xdr.ScVal {
  const arr = typeof bytes === "string" ? hexToBytes(bytes) : bytes;
  if (arr.length !== 32) {
    throw new Error(`order_id must be exactly 32 bytes (got ${arr.length})`);
  }
  // Pass a copy: `scvBytes` retains the reference it is handed, so without this a
  // later mutation of the caller's array would silently change the built ScVal.
  // The widening cast for BytesN<32> lives in exactly one place - `toSdkBytes`
  // above (issue #552) - instead of being open-coded beside it.
  return xdr.ScVal.scvBytes(toSdkBytes(arr.slice()));
}

/**
 * Build an Address ScVal from a G... / C... strkey.
 */
export function addressToScVal(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

/**
 * Build a Symbol ScVal.
 */
export function symbolToScVal(symbol: string): xdr.ScVal {
  return xdr.ScVal.scvSymbol(symbol);
}

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

/**
 * Decode any ScVal to a string for display/logging. Handles symbols, strings,
 * addresses, bytes (hex), numbers/bigints and maps/vecs (JSON).
 */
export function scValToString(scVal: xdr.ScVal): string {
  // SDK 17 replaces `ScVal.switch()` + accessor methods with a string
  // discriminant on `type` and plain property accessors. The discriminant is
  // read inline in the `switch`: assigning it to a local first (as SDK 16
  // required) defeats TypeScript's narrowing, leaving the payload accessors
  // unresolvable on the union.
  switch (scVal.type) {
    case "scvSymbol":
      return scVal.sym.toString();
    case "scvString":
      return scVal.str.toString();
    case "scvAddress":
      return Address.fromScVal(scVal).toString();
    case "scvI128":
    case "scvI64":
    case "scvU32":
    case "scvU64":
    case "scvI32":
      return scValToNative(scVal).toString();
    case "scvBytes":
      // `bytes` is an ScBytes wrapper in SDK 17, not a bare Uint8Array.
      return bytesToHex(scVal.bytes.toBytes());
    case "scvBool":
      return String(scVal.b);
  }
  try {
    return JSON.stringify(scValToNative(scVal), bigintSafeReplacer);
  } catch {
    return scVal.toXDR("base64");
  }
}

/**
 * Decode an ScVal to a native JS value (BigInt for integers).
 */
export function scValToNativeSafe(scVal: xdr.ScVal): unknown {
  try {
    return scValToNative(scVal);
  } catch {
    return scValToString(scVal);
  }
}

function bigintSafeReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, "");
  if (clean.length % 2 !== 0) {
    throw new Error("invalid hex string (odd length)");
  }
  const invalidIndex = clean.search(/[^0-9a-f]/i);
  if (invalidIndex !== -1) {
    throw new Error(`invalid hex character "${clean[invalidIndex]}" at index ${invalidIndex}`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const chunk = clean.slice(i * 2, i * 2 + 2);
    if (!/^[0-9a-fA-F]{2}$/.test(chunk)) {
      throw new Error(`invalid hex character in "${chunk}"`);
    }
    out[i] = parseInt(chunk, 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * SHA-256 a string order id into a 32-byte value accepted by the contract.
 *
 * Uses the Web Crypto API, which is only exposed in secure contexts (HTTPS or
 * localhost). On a plain-HTTP origin `crypto.subtle` is `undefined`, so we
 * feature-detect it and throw an actionable typed error instead of an opaque
 * `TypeError`.
 */
export async function hashOrderId(orderId: string): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new WalletError(
      "Order ids are hashed with SHA-256 via the Web Crypto API, which is only " +
        "available in a secure context. Serve this app over HTTPS (or localhost) " +
        "and try again.",
      "CRYPTO_UNAVAILABLE"
    );
  }
  const data = new TextEncoder().encode(orderId);
  const digest = await subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

/**
 * True when `value` is already a 32-byte order id rendered as hex.
 *
 * POLICY (issue #542): the check is purely syntactic — any 64 hex characters,
 * optionally `0x`-prefixed, mean "already hashed". The two possible inputs are
 * indistinguishable, so an explicit contract is required:
 *
 *   - Raw (human) order ids must NEVER be 64 hex characters. The storefront
 *     only mints `SS-<timestamp>-<random>` ids, which always contain `-` and
 *     therefore can never match.
 *   - Admin views hold indexer-derived ids that are exactly 64 hex and must
 *     keep taking the passthrough path — hashing that hex again can never
 *     reproduce the stored BytesN<32>.
 *
 * A raw id that violates the rule is sent to the contract unhashed and misses
 * the stored order (OrderNotFound); it is not detectable after the fact.
 * Documented in README.md, "Order id encoding".
 */
export function isOrderIdHashHex(value: string): boolean {
  return /^(0[xX])?[0-9a-fA-F]{64}$/.test(value);
}

/**
 * Resolve an order id to the raw 32 bytes the contract stores it under.
 *
 * Callers hold one of two things. Checkout holds the pre-image ("SS-..."),
 * which has to be hashed. Admin views build their rows from indexer events,
 * whose `order_id` topic is already the hashed BytesN<32> rendered as 64 hex
 * characters. SHA-256 is one-way, so hashing that hex a second time can never
 * reproduce the stored value and the contract call fails with OrderNotFound.
 *
 * A 64-hex id is therefore decoded straight to bytes and passed through
 * unchanged; anything else is treated as a pre-image and hashed.
 *
 * The rule is ambiguous by construction, so the policy (issue #542) is that
 * raw ids are never 64 hex characters — see `isOrderIdHashHex` above.
 */
export async function resolveOrderIdHash(orderId: string): Promise<Uint8Array> {
  return isOrderIdHashHex(orderId) ? hexToBytes(orderId) : hashOrderId(orderId);
}
