import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";
const nodeCrypto = require("crypto");

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
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => React.createElement("img", { src, alt, ...props }),
}));

// Replace fake crypto mock with REAL SHA-256 via Node webcrypto
const realWebCrypto = (nodeCrypto as any).webcrypto || nodeCrypto;
Object.defineProperty(globalThis, "crypto", {
  value: realWebCrypto,
  writable: true,
  configurable: true,
});
if (typeof window !== "undefined") {
  Object.defineProperty(window, "crypto", {
    value: realWebCrypto,
    writable: true,
    configurable: true,
  });
}

// Mock environment variables
vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
vi.stubEnv(
  "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID",
  "CTEST00000000000000000000000000000000000000000000000000"
);
vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "admin@test.com,admin2@test.com");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://dummy.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "dummy_anon_key");
