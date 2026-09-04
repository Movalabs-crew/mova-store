import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["**/*.{test,spec}.{js,jsx,ts,tsx}"],
    exclude: ["node_modules", "contracts", ".next", "out"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 4,
        statements: 4,
        functions: 10,
        branches: 40,
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
