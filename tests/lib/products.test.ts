import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing lib/products
const mockStorageFrom = {
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  remove: vi.fn(),
};

const mockFrom = vi.fn();

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    storage: {
      from: (bucket: string) => mockStorageFrom,
    },
  },
}));

import {
  mapProduct,
  listProducts,
  getProductById,
  uploadProductImage,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../lib/products";

describe("lib/products data layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mapProduct", () => {
    it("returns null when passed null or undefined", () => {
      expect(mapProduct(null)).toBeNull();
      expect(mapProduct(undefined)).toBeNull();
    });

    it("coerces price strings to Number and preserves product fields", () => {
      const raw = {
        id: "prod-123",
        name: "Running Shoe",
        price: "49.99",
        img: "https://example.com/shoe.jpg",
        created_at: "2026-09-01T00:00:00Z",
      };

      const mapped = mapProduct(raw);
      expect(mapped).toEqual({
        id: "prod-123",
        name: "Running Shoe",
        price: 49.99,
        img: "https://example.com/shoe.jpg",
        created_at: "2026-09-01T00:00:00Z",
      });
      expect(typeof mapped?.price).toBe("number");
    });

    it("handles already numeric prices correctly", () => {
      const raw = {
        id: 1,
        name: "Shirt",
        price: 25,
        img: "https://example.com/shirt.jpg",
      };
      const mapped = mapProduct(raw);
      expect(mapped?.price).toBe(25);
    });

    it("surfaces updated_at when present on raw product row", () => {
      const raw = {
        id: "prod-456",
        name: "Jacket",
        price: "89.99",
        img: "https://example.com/jacket.jpg",
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-04T12:00:00Z",
      };
      const mapped = mapProduct(raw);
      expect(mapped).toEqual({
        id: "prod-456",
        name: "Jacket",
        price: 89.99,
        img: "https://example.com/jacket.jpg",
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-04T12:00:00Z",
      });
      expect(mapped?.updated_at).toBe("2026-09-04T12:00:00Z");
    });
  });

  describe("listProducts", () => {
    it("fetches products ordered by created_at desc and maps each product", async () => {
      const fakeData = [
        { id: "1", name: "Shoe", price: "100", img: "/img1.jpg" },
        { id: "2", name: "Hat", price: "20.5", img: "/img2.jpg" },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: fakeData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const res = await listProducts();

      expect(mockFrom).toHaveBeenCalledWith("products");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(res).toEqual([
        { id: "1", name: "Shoe", price: 100, img: "/img1.jpg" },
        { id: "2", name: "Hat", price: 20.5, img: "/img2.jpg" },
      ]);
    });

    it("throws error when Supabase select fails", async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Database error"),
      });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      await expect(listProducts()).rejects.toThrow("Database error");
    });
  });

  describe("getProductById", () => {
    it("fetches a single product by ID and maps it", async () => {
      const fakeProduct = { id: "p1", name: "Bag", price: "75.00", img: "/bag.jpg" };
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: fakeProduct, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await getProductById("p1");

      expect(mockFrom).toHaveBeenCalledWith("products");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("id", "p1");
      expect(result).toEqual({
        id: "p1",
        name: "Bag",
        price: 75,
        img: "/bag.jpg",
      });
    });

    it("returns null when product is not found", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await getProductById("p-missing");
      expect(result).toBeNull();
    });

    it("throws error when Supabase lookup fails", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Query timeout"),
      });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      await expect(getProductById("p1")).rejects.toThrow("Query timeout");
    });
  });

  describe("uploadProductImage", () => {
    it("uploads file with timestamped name and returns public URL", async () => {
      const mockFile = new File(["dummy content"], "test-product.png", {
        type: "image/png",
      });

      mockStorageFrom.upload.mockResolvedValue({
        data: { path: "12345.png" },
        error: null,
      });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: "https://dummy.supabase.co/storage/v1/object/public/products/12345.png" },
      });

      const url = await uploadProductImage(mockFile);

      expect(mockStorageFrom.upload).toHaveBeenCalledTimes(1);
      const [fileName, fileArg, options] = mockStorageFrom.upload.mock.calls[0];
      expect(fileName).toMatch(/^\d+-[a-z0-9]+\.png$/);
      expect(fileArg).toBe(mockFile);
      expect(options).toEqual({
        cacheControl: "3600",
        upsert: false,
        contentType: "image/png",
      });
      expect(mockStorageFrom.getPublicUrl).toHaveBeenCalledWith(fileName);
      expect(url).toBe("https://dummy.supabase.co/storage/v1/object/public/products/12345.png");
    });

    it("throws error when storage upload fails", async () => {
      const mockFile = new File(["dummy"], "fail.png", { type: "image/png" });
      mockStorageFrom.upload.mockResolvedValue({
        data: null,
        error: new Error("Storage quota exceeded"),
      });

      await expect(uploadProductImage(mockFile)).rejects.toThrow("Storage quota exceeded");
    });
  });

  describe("createProduct", () => {
    it("inserts a new product and returns the mapped created product", async () => {
      const input = { name: "New Shoe", price: 120, img: "/shoe.png" };
      const returnedRow = { id: "p-new", ...input, price: "120" };

      const mockSingle = vi.fn().mockResolvedValue({ data: returnedRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const res = await createProduct(input);

      expect(mockFrom).toHaveBeenCalledWith("products");
      expect(mockInsert).toHaveBeenCalledWith([input]);
      expect(res).toEqual({
        id: "p-new",
        name: "New Shoe",
        price: 120,
        img: "/shoe.png",
      });
    });

    it("throws error when insert fails", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Insert constraint error"),
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      mockFrom.mockReturnValue({ insert: mockInsert });

      await expect(createProduct({ name: "Bad", price: 10 })).rejects.toThrow(
        "Insert constraint error"
      );
    });
  });

  describe("updateProduct", () => {
    it("updates product fields by id and returns mapped product", async () => {
      const updates = { name: "Updated Shoe", price: 130 };
      const returnedRow = { id: "p-1", img: "/shoe.png", ...updates, price: "130" };

      const mockSingle = vi.fn().mockResolvedValue({ data: returnedRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const res = await updateProduct("p-1", updates);

      expect(mockFrom).toHaveBeenCalledWith("products");
      expect(mockUpdate).toHaveBeenCalledWith(updates);
      expect(mockEq).toHaveBeenCalledWith("id", "p-1");
      expect(res).toEqual({
        id: "p-1",
        img: "/shoe.png",
        name: "Updated Shoe",
        price: 130,
      });
    });

    it("throws error when update fails", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Update failed"),
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      await expect(updateProduct("p-1", { price: 99 })).rejects.toThrow("Update failed");
    });
  });

  describe("deleteProduct", () => {
    it("deletes a product by id", async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ delete: mockDelete });

      await deleteProduct("p-del");

      expect(mockFrom).toHaveBeenCalledWith("products");
      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockEq).toHaveBeenCalledWith("id", "p-del");
    });

    it("throws error when delete fails", async () => {
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Foreign key constraint violation"),
      });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ delete: mockDelete });

      await expect(deleteProduct("p-del")).rejects.toThrow(
        "Foreign key constraint violation"
      );
    });
  });
});
