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

// Mock environment variables
vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
vi.stubEnv(
  "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID",
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
);
vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "admin@test.com,admin2@test.com");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://dummy.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "dummy_anon_key");
