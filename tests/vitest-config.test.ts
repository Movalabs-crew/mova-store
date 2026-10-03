// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

/**
 * Pins the *configuration* contract for `process.env.NODE_ENV` under Vitest.
 *
 * `tests/lib/env.test.ts` pins the value the suite observes at runtime. This
 * file pins where that value comes from: exactly one mechanism, `test.env`, and
 * no build-time `define` that would statically replace `process.env.NODE_ENV`
 * inside transformed modules and desync it from the runtime path (the two
 * sources of truth that this fix removed).
 */
const configPath = fileURLToPath(new URL("../vitest.config.ts", import.meta.url));

/** Drop line and block comments so prose about `define` is not mistaken for config. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
}

describe("vitest NODE_ENV configuration", () => {
  const source = stripComments(readFileSync(configPath, "utf8"));

  it("declares NODE_ENV through test.env only, never through a static define", () => {
    expect(source).toMatch(/NODE_ENV:\s*["']development["']/);
    expect(source).not.toMatch(/define\s*:/);
  });

  it("resolves process.env.NODE_ENV to exactly the value the config declares", () => {
    const declared = source.match(/NODE_ENV:\s*["']([^"']+)["']/)?.[1];
    expect(declared).toBeDefined();
    expect(process.env.NODE_ENV).toBe(declared);
  });
});
