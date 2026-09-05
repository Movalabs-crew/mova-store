import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";
import { webcrypto } from "node:crypto";

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

// Ensure Node Buffer is recognized as Uint8Array across JSDOM realm boundaries
const originalHasInstance = Uint8Array[Symbol.hasInstance];
Object.defineProperty(Uint8Array, Symbol.hasInstance, {
  value: (inst: unknown) => {
    return (
      (originalHasInstance
        ? originalHasInstance.call(Uint8Array, inst)
        : inst instanceof Uint8Array) || Buffer.isBuffer(inst)
    );
  },
  configurable: true,
});

// Mock environment variables
vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
vi.stubEnv(
  "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID",
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
);
vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "admin@test.com,admin2@test.com");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://dummy.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "dummy_anon_key");
