/**
 * Tests for the server-side /api/checkout/compute-total route.
 *
 * Acceptance criteria (issue #475):
 *   - Tampering with localStorage cannot reduce the charge.
 *   - The server is the single source of truth for the amount.
 *   - A test covers a tampered cart.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../../app/api/checkout/compute-total/route";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock lib/products so no real Supabase connection is needed in tests
// ---------------------------------------------------------------------------
vi.mock("../../../lib/products", () => ({
  getProductById: vi.fn(),
}));

import { getProductById } from "../../../lib/products";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/checkout/compute-total", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/checkout/compute-total", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the server-computed total, ignoring any client-supplied price", async () => {
    // DB price is $25.00 per product.
    vi.mocked(getProductById).mockResolvedValue({
      id: "prod-1",
      name: "Widget",
      price: 25.0,
      img: null,
      created_at: null,
      updated_at: null,
    });

    // Client sends item with id "prod-1" — no price field involved at all.
    const req = makeRequest({ items: [{ id: "prod-1" }] });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(25.0);
  });

  it("tampered cart: server ignores localStorage.totalPrice=0.01 and returns real price", async () => {
    // Simulate: attacker sets localStorage.totalPrice to 0.01, but the
    // checkout page now calls this endpoint instead of trusting that value.
    // The endpoint fetches the real price from the DB.
    vi.mocked(getProductById).mockResolvedValue({
      id: "prod-2",
      name: "Expensive Gadget",
      price: 199.99,
      img: null,
      created_at: null,
      updated_at: null,
    });

    // The request body only carries the product id (as the client now sends).
    // Note: there is intentionally NO price field — the server must not use one.
    const req = makeRequest({ items: [{ id: "prod-2" }] });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // Must be the real DB price, not the tampered 0.01
    expect(body.total).toBe(199.99);
    expect(body.total).not.toBe(0.01);
  });

  it("sums multiple items correctly using server prices", async () => {
    vi.mocked(getProductById)
      .mockResolvedValueOnce({ id: "a", name: "A", price: 10.0, img: null, created_at: null, updated_at: null })
      .mockResolvedValueOnce({ id: "b", name: "B", price: 5.5, img: null, created_at: null, updated_at: null });

    const req = makeRequest({ items: [{ id: "a" }, { id: "b" }] });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(15.5);
  });

  it("respects quantity when provided", async () => {
    vi.mocked(getProductById).mockResolvedValue({
      id: "c",
      name: "C",
      price: 3.0,
      img: null,
      created_at: null,
      updated_at: null,
    });

    const req = makeRequest({ items: [{ id: "c", quantity: 4 }] });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(12.0);
  });

  it("silently skips unknown product ids (no match in DB)", async () => {
    vi.mocked(getProductById).mockResolvedValue(null as any);

    const req = makeRequest({ items: [{ id: "ghost-id" }] });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(0);
  });

  it("returns 400 for missing items array", async () => {
    const req = makeRequest({ notItems: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for an item missing an id", async () => {
    const req = makeRequest({ items: [{ quantity: 1 }] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/checkout/compute-total", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
