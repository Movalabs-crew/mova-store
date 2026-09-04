import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import Sidebar from "../../components/Sidebar";

vi.mock("../../lib/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

// Static route table under app/ (product pages /shop/[id] are dynamic).
const REAL_ROUTES = new Set([
  "/",
  "/shop",
  "/collections",
  "/admin",
  "/blog",
  "/checkout",
  "/profile/login",
]);

describe("Sidebar navigation", () => {
  it("only links to routes that exist under app/", () => {
    const { container } = render(<Sidebar />);
    const hrefs = [...container.querySelectorAll("a[href]")].map((a) =>
      a.getAttribute("href")
    );

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(REAL_ROUTES.has(href), `sidebar links to missing route ${href}`).toBe(
        true
      );
    }
  });

  it("labels match their destinations", () => {
    const { container } = render(<Sidebar />);
    const linkByLabel = (label) =>
      [...container.querySelectorAll("a")].find((a) =>
        (a.textContent || "").includes(label)
      );

    expect(linkByLabel("Home")?.getAttribute("href")).toBe("/");
    expect(linkByLabel("Shop")?.getAttribute("href")).toBe("/shop");
    expect(linkByLabel("Collections")?.getAttribute("href")).toBe(
      "/collections"
    );
  });

  it("no longer contains the removed dead entries", () => {
    const { container } = render(<Sidebar />);
    const html = container.innerHTML;
    expect(html).not.toContain("/about");
    expect(html).not.toContain("/contact");
    expect(html).not.toContain("/categories");
  });
});
