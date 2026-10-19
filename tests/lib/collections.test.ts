// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PRODUCTS_TABLE, PRODUCTS_BUCKET } from "../../lib/collections";

const schema = readFileSync(new URL("../../supabase/schema.sql", import.meta.url), "utf8");

describe("lib/collections constants", () => {
  it("exports non-empty string identifiers", () => {
    expect(typeof PRODUCTS_TABLE).toBe("string");
    expect(typeof PRODUCTS_BUCKET).toBe("string");
    expect(PRODUCTS_TABLE.length).toBeGreaterThan(0);
    expect(PRODUCTS_BUCKET.length).toBeGreaterThan(0);
  });

  it("names the products table and bucket", () => {
    expect(PRODUCTS_TABLE).toBe("products");
    expect(PRODUCTS_BUCKET).toBe("products");
  });

  it("matches the products table declared in supabase/schema.sql", () => {
    const tableMatch = schema.match(/create table if not exists public\.([a-z0-9_]+)\s*\(/i);
    expect(tableMatch).not.toBeNull();
    expect(tableMatch[1]).toBe(PRODUCTS_TABLE);
    // The schema keeps product prices non-negative; the table the app writes to
    // is the one guarded by that constraint.
    expect(schema).toContain("check (price >= 0)");
  });

  it("matches the storage bucket declared in supabase/schema.sql", () => {
    const bucketMatch = schema.match(/values \('([a-z0-9_-]+)', '([a-z0-9_-]+)', true\)/i);
    expect(bucketMatch).not.toBeNull();
    expect(bucketMatch[1]).toBe(PRODUCTS_BUCKET);
    expect(bucketMatch[2]).toBe(PRODUCTS_BUCKET);
  });
});
