import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";

// Ensure test environment for React/Testing Library
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
if (typeof process !== "undefined" && process.env) {
  process.env.NODE_ENV = "test";
}

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
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

// Mock window.crypto for tests
Object.defineProperty(globalThis, "crypto", {
  value: {
    subtle: {
      digest: async (_algorithm: string, data: ArrayBuffer) => {
        const text = new TextDecoder().decode(data);
        const hash = new Uint8Array(32);
        for (let i = 0; i < text.length && i < 32; i++) {
          hash[i] = text.charCodeAt(i);
        }
        return hash.buffer;
      },
    },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// Mock environment variables
vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
vi.stubEnv(
  "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID",
  "CTEST00000000000000000000000000000000000000000000000000"
);
vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "admin@test.com,admin2@test.com");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://dummy.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "dummy_anon_key");
