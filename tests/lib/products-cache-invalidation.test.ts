import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom, mockStorageFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockStorageFrom: { remove: vi.fn() },
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    storage: {
      from: () => mockStorageFrom,
    },
  },
}));

import { createProduct, deleteProduct, listProducts, updateProduct } from "../../lib/products";
import { ensureProducts, getProductCacheSnapshot } from "../../lib/productCache";

const row = { id: "p1", name: "Shoe", price: "10", img: "/s.jpg" };

async function primeCache() {
  const mockOrder = vi.fn().mockResolvedValue({ data: [row], error: null });
  const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
  mockFrom.mockReturnValue({ select: mockSelect });
  await ensureProducts(listProducts);
  expect(getProductCacheSnapshot().status).toBe("success");
  return mockOrder;
}

function stubRefetchWith(data: unknown[]) {
  const mockOrder = vi.fn().mockResolvedValue({ data, error: null });
  const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
  mockFrom.mockReturnValue({ select: mockSelect });
  return mockOrder;
}

describe("product mutations invalidate the shared list cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createProduct marks a warm cache stale and the next read refetches", async () => {
    await primeCache();

    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "p2", name: "Hat", price: "5", img: "/h.png" },
      error: null,
    });
    const mockInsertSelect = vi.fn().mockReturnValue({ single: mockSingle });
    mockFrom.mockReturnValue({ insert: vi.fn().mockReturnValue({ select: mockInsertSelect }) });

    await createProduct({ name: "Hat", price: 5, img: "/h.png" });
    expect(getProductCacheSnapshot().status).toBe("idle");

    const refetchOrder = stubRefetchWith([{ id: "p2", name: "Hat", price: "5", img: "/h.png" }]);
    await ensureProducts(listProducts);

    expect(refetchOrder).toHaveBeenCalledTimes(1);
    expect(getProductCacheSnapshot()).toMatchObject({
      status: "success",
      products: [{ id: "p2", name: "Hat", price: 5, img: "/h.png" }],
    });
  });

  it("updateProduct marks a warm cache stale", async () => {
    const primeOrder = await primeCache();

    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: { ...row, name: "Updated Shoe" }, error: null });
    const mockUpdateEq = vi
      .fn()
      .mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: mockUpdateEq }) });

    await updateProduct("p1", { name: "Updated Shoe", price: 12, img: "/s.jpg" });

    expect(getProductCacheSnapshot().status).toBe("idle");
    expect(primeOrder).toHaveBeenCalledTimes(1);
  });

  it("deleteProduct marks a warm cache stale", async () => {
    const primeOrder = await primeCache();

    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockSelectEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockDeleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockSelectEq }),
      delete: vi.fn().mockReturnValue({ eq: mockDeleteEq }),
    });

    await deleteProduct("p1");

    expect(getProductCacheSnapshot().status).toBe("idle");
    expect(primeOrder).toHaveBeenCalledTimes(1);
  });

  it("a failed mutation leaves the warm cache untouched", async () => {
    const primeOrder = await primeCache();

    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: new Error("Insert failed") });
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) }),
    });

    await expect(createProduct({ name: "Bad", price: 1 })).rejects.toThrow("Insert failed");

    expect(getProductCacheSnapshot().status).toBe("success");
    expect(primeOrder).toHaveBeenCalledTimes(1);
  });

  it("a failed delete leaves the warm cache untouched", async () => {
    const primeOrder = await primeCache();

    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { img: null }, error: null });
    const mockSelectEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockDeleteEq = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error("Delete failed") });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockSelectEq }),
      delete: vi.fn().mockReturnValue({ eq: mockDeleteEq }),
    });

    await expect(deleteProduct("p1")).rejects.toThrow("Delete failed");

    expect(getProductCacheSnapshot().status).toBe("success");
    expect(primeOrder).toHaveBeenCalledTimes(1);
  });
});
