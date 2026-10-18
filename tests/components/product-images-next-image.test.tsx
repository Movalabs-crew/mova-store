import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression guard for the #617 next/image migration. The product/order
 * thumbnails must render through the framework pipeline so they get responsive
 * sizing and lazy loading, so these files may not fall back to a raw <img>.
 */
const productRenderingFiles = [
  "components/OrderCard.tsx",
  "app/admin/page.jsx",
  "app/admin/EditProductForm.jsx",
];

describe("product and order images use next/image (#617)", () => {
  it.each(productRenderingFiles)("%s imports next/image", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(source).toMatch(/import Image from "next\/image";/);
  });

  it.each(productRenderingFiles)("%s renders no raw <img> element", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(source).not.toMatch(/<img[\s>]/);
  });

  it("gives every migrated image explicit dimensions", () => {
    const orderCard = readFileSync(resolve(process.cwd(), "components/OrderCard.tsx"), "utf8");
    expect(orderCard).toContain("width={48}");
    expect(orderCard).toContain("height={48}");
  });
});
