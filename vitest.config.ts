import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // `process.env.NODE_ENV` is intentionally not set through `define` here.
  // A build-time `define` and the `test.env` entry below were two sources of
  // truth for the same variable: the static replacement won inside the
  // transformed modules, so the `=== "development"` guards in `lib/env.ts` and
  // `components/ErrorBoundary.tsx` could never match under test. `test.env` is
  // now the single place the value is declared.
  plugins: [
    react({
      include: /\.(jsx|tsx|js|ts)$/,
    }),
  ],
  esbuild: {
    loader: "tsx",
    include: /.*\.[tj]sx?$/,
    exclude: [],
  },
  test: {
    environment: "jsdom",
    globals: true,
    env: {
      NODE_ENV: "development",
    },
    server: {
      deps: {
        inline: [/@stellar/],
      },
    },
    setupFiles: ["./tests/setup.ts"],
    include: ["**/*.{test,spec}.{js,jsx,ts,tsx}"],
    exclude: ["node_modules", "contracts", ".next", "out"],
    coverage: {
      provider: "v8",
      // Count every file in the source tree, not only the modules a test
      // happens to import. Without this the denominator is whatever the test
      // files touch, so untested modules can never drag coverage down.
      all: true,
      include: [
        "app/**/*.{js,jsx,ts,tsx}",
        "components/**/*.{js,jsx,ts,tsx}",
        "lib/**/*.{js,jsx,ts,tsx}",
        "context/**/*.{js,jsx,ts,tsx}",
        "hooks/**/*.{js,jsx,ts,tsx}",
      ],
      reporter: ["text", "json", "html"],
      thresholds: {
        // Floor taken from the measured suite on this branch
        // (61.25% lines/statements, 60.8% functions, 77.83% branches), so the
        // gate is comfortably met today and any real regression fails it.
        lines: 60,
        statements: 60,
        functions: 60,
        branches: 70,
      },
      exclude: [
        "node_modules/",
        "contracts/",
        ".next/",
        "tests/setup.ts",
        "**/*.d.ts",
        "**/*.config.*",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@/components": path.resolve(__dirname, "./components"),
      "@/lib": path.resolve(__dirname, "./lib"),
      "@/context": path.resolve(__dirname, "./context"),
    },
  },
});
