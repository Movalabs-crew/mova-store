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
  getStoragePathFromUrl,
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

  describe("getStoragePathFromUrl", () => {
    it("extracts relative path from standard Supabase storage public URL", () => {
      const url =
        "https://xyz.supabase.co/storage/v1/object/public/products/1725450000000-shoe.jpg";
      expect(getStoragePathFromUrl(url)).toBe("1725450000000-shoe.jpg");
    });

    it("handles URL-encoded characters in storage path", () => {
      const url =
        "https://xyz.supabase.co/storage/v1/object/public/products/subfolder/my%20cool%20shoe.png";
      expect(getStoragePathFromUrl(url)).toBe("subfolder/my cool shoe.png");
    });

    it("strips query parameters and URL hashes", () => {
      const url =
        "https://xyz.supabase.co/storage/v1/object/public/products/image.jpg?version=1#header";
      expect(getStoragePathFromUrl(url)).toBe("image.jpg");
    });

    it("returns null for external non-storage URLs", () => {
      expect(
        getStoragePathFromUrl(
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff"
        )
      ).toBeNull();
    });

    it("returns null for empty, null, or undefined values", () => {
      expect(getStoragePathFromUrl("")).toBeNull();
      expect(getStoragePathFromUrl(null as unknown as string)).toBeNull();
      expect(getStoragePathFromUrl(undefined as unknown as string)).toBeNull();
    });
  });

  describe("deleteProduct", () => {
    it("deletes a product by id when no select method is mocked", async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ delete: mockDelete });

      await deleteProduct("p-del");

      expect(mockFrom).toHaveBeenCalledWith("products");
      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockEq).toHaveBeenCalledWith("id", "p-del");
    });

    it("deletes product and cleans up image from storage when product has storage image", async () => {
      const mockSelectEq = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            img: "https://xyz.supabase.co/storage/v1/object/public/products/12345-shoe.jpg",
          },
          error: null,
        }),
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      const mockDeleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

      mockFrom.mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      });
      mockStorageFrom.remove.mockResolvedValue({ data: [], error: null });

      await deleteProduct("p-with-image");

      expect(mockSelect).toHaveBeenCalledWith("img");
      expect(mockSelectEq).toHaveBeenCalledWith("id", "p-with-image");
      expect(mockStorageFrom.remove).toHaveBeenCalledWith(["12345-shoe.jpg"]);
      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockDeleteEq).toHaveBeenCalledWith("id", "p-with-image");
    });

    it("proceeds with row deletion even if storage remove rejects (image already missing)", async () => {
      const mockSelectEq = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            img: "https://xyz.supabase.co/storage/v1/object/public/products/missing.jpg",
          },
          error: null,
        }),
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      const mockDeleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

      mockFrom.mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      });
      mockStorageFrom.remove.mockRejectedValue(
        new Error("Object not found in bucket")
      );

      await deleteProduct("p-missing-storage-img");

      expect(mockStorageFrom.remove).toHaveBeenCalledWith(["missing.jpg"]);
      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockDeleteEq).toHaveBeenCalledWith("id", "p-missing-storage-img");
    });

    it("skips storage remove if product image is an external non-storage URL", async () => {
      const mockSelectEq = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
          },
          error: null,
        }),
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      const mockDeleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

      mockFrom.mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      });

      await deleteProduct("p-unsplash");

      expect(mockStorageFrom.remove).not.toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockDeleteEq).toHaveBeenCalledWith("id", "p-unsplash");
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
