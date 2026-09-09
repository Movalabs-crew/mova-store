import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  parseStoragePathFromUrl,
} from "../../lib/products";

describe("lib/products data layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
        updated_at: "2026-09-01T00:00:00Z",
      };

      const mapped = mapProduct(raw);
      expect(mapped).toEqual({
        id: "prod-123",
        name: "Running Shoe",
        price: 49.99,
        img: "https://example.com/shoe.jpg",
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
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
        data: {
          publicUrl: "https://dummy.supabase.co/storage/v1/object/public/products/12345.png",
        },
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
      const returnedRow = {
        id: "p-1",
        img: "/shoe.png",
        ...updates,
        price: "130",
        updated_at: "2026-09-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: returnedRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const res = await updateProduct("p-1", updates);

      expect(mockFrom).toHaveBeenCalledWith("products");
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining(updates));
      expect(mockEq).toHaveBeenCalledWith("id", "p-1");
      expect(res).toEqual({
        id: "p-1",
        img: "/shoe.png",
        name: "Updated Shoe",
        price: 130,
        updated_at: "2026-09-01T00:00:00Z",
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
    const imageUrl =
      "https://project.supabase.co/storage/v1/object/public/products/catalog/shoe%20photo.jpg";

    function mockProductDeletion({
      product = { img: imageUrl },
      lookupError = null,
      deleteError = null,
    } = {}) {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: product,
        error: lookupError,
      });
      const mockSelectEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });
      const mockDeleteEq = vi.fn().mockResolvedValue({ data: null, error: deleteError });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });
      mockFrom.mockReturnValue({ select: mockSelect, delete: mockDelete });

      return { mockMaybeSingle, mockSelect, mockSelectEq, mockDelete, mockDeleteEq };
    }

    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
      mockStorageFrom.remove.mockResolvedValue({ data: [], error: null });
    });

    it("deletes the row, then removes the image using its decoded object path", async () => {
      const mocks = mockProductDeletion();

      await deleteProduct("p-del");

      expect(mocks.mockSelect).toHaveBeenCalledWith("img");
      expect(mocks.mockSelectEq).toHaveBeenCalledWith("id", "p-del");
      expect(mocks.mockDeleteEq).toHaveBeenCalledWith("id", "p-del");
      expect(mockStorageFrom.remove).toHaveBeenCalledWith(["catalog/shoe photo.jpg"]);
      expect(mocks.mockDeleteEq.mock.invocationCallOrder[0]).toBeLessThan(
        mockStorageFrom.remove.mock.invocationCallOrder[0]
      );
    });

    it("still deletes the row when storage removal rejects", async () => {
      const mocks = mockProductDeletion();
      mockStorageFrom.remove.mockRejectedValue(new Error("Object not found"));

      await expect(deleteProduct("p-del")).resolves.toBeUndefined();

      expect(mocks.mockDeleteEq).toHaveBeenCalledWith("id", "p-del");
      expect(mockStorageFrom.remove).toHaveBeenCalledWith(["catalog/shoe photo.jpg"]);
    });

    it("still succeeds when storage returns an object-not-found error", async () => {
      const mocks = mockProductDeletion();
      mockStorageFrom.remove.mockResolvedValue({
        data: null,
        error: new Error("Object not found"),
      });

      await expect(deleteProduct("p-del")).resolves.toBeUndefined();

      expect(mocks.mockDeleteEq).toHaveBeenCalledWith("id", "p-del");
      expect(mockStorageFrom.remove).toHaveBeenCalledWith(["catalog/shoe photo.jpg"]);
    });

    it("still deletes the row when image lookup fails", async () => {
      const mocks = mockProductDeletion({
        product: null,
        lookupError: new Error("Query timeout"),
      });

      await expect(deleteProduct("p-del")).resolves.toBeUndefined();

      expect(mocks.mockDeleteEq).toHaveBeenCalledWith("id", "p-del");
      expect(mockStorageFrom.remove).not.toHaveBeenCalled();
    });

    it("does not remove the image when row deletion fails", async () => {
      mockProductDeletion({
        deleteError: new Error("Foreign key constraint violation"),
      });

      await expect(deleteProduct("p-del")).rejects.toThrow("Foreign key constraint violation");
      expect(mockStorageFrom.remove).not.toHaveBeenCalled();
    });

    it("does not remove an external image from the products bucket", async () => {
      const mocks = mockProductDeletion({
        product: { img: "https://images.example.com/products/shoe.jpg" },
      });

      await deleteProduct("p-del");

      expect(mocks.mockDeleteEq).toHaveBeenCalledWith("id", "p-del");
      expect(mockStorageFrom.remove).not.toHaveBeenCalled();
    });
  });

  describe("parseStoragePathFromUrl", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co/base/");
    });

    it("parses nested paths from the configured project's public bucket URL", () => {
      expect(
        parseStoragePathFromUrl(
          "https://project.supabase.co/base/storage/v1/object/public/products/catalog/shoe%20photo.jpg?download=1#preview"
        )
      ).toBe("catalog/shoe photo.jpg");
    });

    it.each([
      "https://other.supabase.co/base/storage/v1/object/public/products/shoe.jpg",
      "https://project.supabase.co/storage/v1/object/public/products/shoe.jpg",
      "https://project.supabase.co/base/storage/v1/object/public/avatars/shoe.jpg",
      "https://project.supabase.co/base/storage/v1/object/public/products/",
      "not-a-url",
    ])("rejects a URL outside the configured public products bucket: %s", (url) => {
      expect(parseStoragePathFromUrl(url)).toBeNull();
    });

    it("returns null when the Supabase project URL is unavailable", () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      expect(
        parseStoragePathFromUrl(
          "https://project.supabase.co/storage/v1/object/public/products/shoe.jpg"
        )
      ).toBeNull();
    });
  });
});
