import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";
import React from "react";
import { webcrypto } from "node:crypto";
import { resetProductCache } from "../lib/productCache";

// The product list cache is module-level state; wipe it between tests so a
// cached read from one test can never satisfy (or skip) another test's fetch.
beforeEach(() => {
  resetProductCache();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => "/",
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    React.createElement("img", { src, alt, ...props }),
}));

// Provide genuine WebCrypto for tests
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
  writable: true,
});

// NOTE: do not reintroduce a `Uint8Array[Symbol.hasInstance]` override here.
//
// An earlier revision installed one so that Node `Buffer`s would also satisfy
// `value instanceof Uint8Array` across the JSDOM realm boundary. That override is
// not safe to install globally: it makes the `Buffer.from(x)` coercion inside
// `@stellar/js-xdr`'s `XdrWriter.write` take the "already a Uint8Array, nothing to
// convert" path, so the raw value is written with `value.copy(...)` and every
// `bytes32ToScVal(...).toXDR()` throws `TypeError: value.copy is not a function`.
// JSDOM's `Uint8Array` and Node's `Buffer` interoperate correctly without it.

// JSDOM's `TextEncoder` is Node's, so its output is a *Node-realm* Uint8Array,
// while the global `Uint8Array` in this environment is JSDOM's. The two are not
// `instanceof` each other across that boundary. stellar-sdk 17 validates byte
// inputs strictly — `XdrString` encodes through `new TextEncoder().encode(...)`
// and `@stellar/js-xdr` then asserts the result is a `Uint8Array` — so without
// alignment every XDR containing an ScVal symbol or string fails to serialise
// with `...: expected Uint8Array`.
//
// Re-wrap the encoder so it allocates with the realm's own `Uint8Array`. This is
// deliberately not a global `Symbol.hasInstance` override; see the note above for
// why that breaks `@stellar/js-xdr`'s writer.
class RealmTextEncoder extends TextEncoder {
  encode(input: string = ""): Uint8Array {
    return new Uint8Array(super.encode(input));
  }
}
Object.defineProperty(globalThis, "TextEncoder", {
  value: RealmTextEncoder,
  configurable: true,
  writable: true,
});

// Mock environment variables
vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
vi.stubEnv(
  "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID",
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
);
// NOTE: admin authorization is NOT configured through a NEXT_PUBLIC_* variable.
// The client gate reads the server-verified `app_metadata.is_admin` claim
// (mirrored by the `admin_users` table / RLS) instead, so there is no admin
// email allowlist to inline into the client bundle.
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://dummy.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "dummy_anon_key");
