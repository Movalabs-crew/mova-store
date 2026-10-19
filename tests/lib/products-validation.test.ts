import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing lib/products
const mockFrom = vi.fn();

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    storage: {
      from: () => ({ upload: vi.fn(), getPublicUrl: vi.fn(), remove: vi.fn() }),
    },
  },
}));

import { createProduct, updateProduct } from "../../lib/products";

const stubInsert = (row: Record<string, unknown>) => {
  const mockSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
  mockFrom.mockReturnValue({ insert: mockInsert });
  return { mockInsert, mockSingle };
};

const stubUpdate = (row: Record<string, unknown>) => {
  const mockSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ update: mockUpdate });
  return { mockUpdate, mockEq };
};

describe("lib/products validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createProduct", () => {
    it("accepts a normal price and stores it as a number", async () => {
      const { mockInsert } = stubInsert({
        id: "p-1",
        name: "Sneaker",
        price: "120.00",
        img: "/shoe.png",
      });

      const product = await createProduct({ name: "Sneaker", price: 120, img: "/shoe.png" });

      expect(mockInsert).toHaveBeenCalledWith([{ name: "Sneaker", price: 120, img: "/shoe.png" }]);
      expect(product?.price).toBe(120);
    });

    it("accepts a decimal price given as a string and rounds it to two decimals", async () => {
      const { mockInsert } = stubInsert({
        id: "p-2",
        name: "Cap",
        price: "50.00",
        img: "/cap.png",
      });

      await createProduct({ name: "Cap", price: "49.999", img: "/cap.png" });

      expect(mockInsert).toHaveBeenCalledWith([{ name: "Cap", price: 50, img: "/cap.png" }]);
    });

    it("rejects a negative price before it reaches the database", async () => {
      const { mockInsert } = stubInsert({});

      await expect(
        createProduct({ name: "Sneaker", price: -50, img: "/shoe.png" })
      ).rejects.toThrow(/negative/i);

      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("rejects a non-numeric price before it reaches the database", async () => {
      const { mockInsert } = stubInsert({});

      await expect(
        createProduct({ name: "Sneaker", price: "not-a-number", img: "/shoe.png" })
      ).rejects.toThrow(/valid price/i);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("rejects an absurd price before it reaches the database", async () => {
      const { mockInsert } = stubInsert({});

      await expect(
        createProduct({ name: "Sneaker", price: 1e12, img: "/shoe.png" })
      ).rejects.toThrow(/too high/i);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("rejects a missing product name", async () => {
      const { mockInsert } = stubInsert({});

      await expect(createProduct({ name: "", price: 10, img: "/shoe.png" })).rejects.toThrow(
        /name is required/i
      );

      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe("updateProduct", () => {
    it("rejects a negative, non-numeric or absurd price without writing", async () => {
      const { mockUpdate } = stubUpdate({});

      await expect(updateProduct("p-1", { name: "Sneaker", price: -1 })).rejects.toThrow(
        /negative/i
      );
      await expect(updateProduct("p-1", { price: 1e12 })).rejects.toThrow(/too high/i);
      await expect(updateProduct("p-1", { price: "NaN" })).rejects.toThrow(/valid price/i);

      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("applies a valid partial update and returns the mapped product", async () => {
      const { mockUpdate, mockEq } = stubUpdate({
        id: "p-1",
        name: "Sneaker",
        price: "99.00",
        img: "/shoe.png",
      });

      const result = await updateProduct("p-1", { price: 99 });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ price: 99, img: undefined })
      );
      expect(mockEq).toHaveBeenCalledWith("id", "p-1");
      expect(result?.price).toBe(99);
    });
  });
});
