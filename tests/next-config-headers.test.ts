import { describe, expect, it } from "vitest";
import nextConfig from "../next.config.mjs";

describe("next.config.mjs security headers (#1084)", () => {
  it("configures Strict-Transport-Security and Permissions-Policy alongside CSP", async () => {
    const rules = await nextConfig.headers!();
    expect(rules.length).toBeGreaterThan(0);

    const rootRule = rules.find((r) => r.source === "/(.*)");
    expect(rootRule).toBeDefined();

    const headerMap = new Map(rootRule!.headers.map((h) => [h.key, h.value]));

    expect(headerMap.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(headerMap.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    );
    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headerMap.get("X-Frame-Options")).toBe("DENY");
    expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerMap.get("Content-Security-Policy")).toContain("default-src 'self'");
  });
});
