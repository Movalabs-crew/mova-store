import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing lib/products, matching tests/lib/products.test.ts
const mockStorageFrom = {
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  remove: vi.fn(),
};

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: (bucket: string) => mockStorageFrom,
    },
  },
}));

import {
  uploadProductImage,
  validateProductImage,
  ALLOWED_PRODUCT_IMAGE_TYPES,
  MAX_PRODUCT_IMAGE_BYTES,
} from "../../lib/products";

const pngFile = () => new File(["x"], "product.png", { type: "image/png" });

describe("uploadProductImage image validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageFrom.upload.mockResolvedValue({ data: { path: "stored.png" }, error: null });
    mockStorageFrom.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: "https://proj.supabase.co/storage/v1/object/public/products/stored.png",
      },
    });
  });

  it.each([
    "image/svg+xml",
    "text/html",
    "application/pdf",
    "image/gif",
    "image/png; charset=utf-8",
    "",
  ])("rejects a file whose MIME type is not on the allow-list: %s", async (type) => {
    const file = new File(["<svg onload=alert(1)/>"], "product.png", { type });

    await expect(uploadProductImage(file)).rejects.toThrow(/PNG, JPEG or WebP/);
    // The rejected payload must never reach storage.
    expect(mockStorageFrom.upload).not.toHaveBeenCalled();
  });

  it("rejects a file whose MIME type is missing entirely", async () => {
    const file = new File(["<svg onload=alert(1)/>"], "product.svg");

    await expect(uploadProductImage(file)).rejects.toThrow(/PNG, JPEG or WebP/);
    expect(mockStorageFrom.upload).not.toHaveBeenCalled();
  });

  it("rejects an image above the size limit before uploading", async () => {
    const file = pngFile();
    Object.defineProperty(file, "size", { value: MAX_PRODUCT_IMAGE_BYTES + 1 });

    await expect(uploadProductImage(file)).rejects.toThrow(/too large/);
    expect(mockStorageFrom.upload).not.toHaveBeenCalled();
  });

  it("accepts an image exactly at the size limit", async () => {
    const file = pngFile();
    Object.defineProperty(file, "size", { value: MAX_PRODUCT_IMAGE_BYTES });

    await uploadProductImage(file);

    expect(mockStorageFrom.upload).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty payload", async () => {
    const file = new File([], "empty.png", { type: "image/png" });

    await expect(uploadProductImage(file)).rejects.toThrow(/appears to be empty/);
    expect(mockStorageFrom.upload).not.toHaveBeenCalled();
  });

  it("rejects a value that is not a file", async () => {
    await expect(uploadProductImage(undefined)).rejects.toThrow(/choose an image file/);
    await expect(uploadProductImage(null)).rejects.toThrow(/choose an image file/);
    await expect(uploadProductImage("product.png")).rejects.toThrow(/choose an image file/);
    expect(mockStorageFrom.upload).not.toHaveBeenCalled();
  });

  it("derives the stored extension from the MIME type, not the filename", async () => {
    // A JPEG renamed to .png must still be stored (and served) as a JPEG.
    const file = new File(["jpeg-bytes"], "product.png", { type: "image/jpeg" });

    const url = await uploadProductImage(file);

    const [path, fileArg, options] = mockStorageFrom.upload.mock.calls[0];
    expect(path).toMatch(/^\d+-[a-z0-9]+\.jpg$/);
    expect(fileArg).toBe(file);
    expect(options).toEqual({
      cacheControl: "3600",
      upsert: false,
      contentType: "image/jpeg",
    });
    expect(url).toBe("https://proj.supabase.co/storage/v1/object/public/products/stored.png");
  });

  it("never stores a client-supplied html or svg extension", async () => {
    const file = new File(["payload"], "evil.html", { type: "image/png" });
    // Even a real png payload declared under a dangerous name must be stored as .png.
    await uploadProductImage(file);

    expect(mockStorageFrom.upload.mock.calls[0][0]).toMatch(/\.png$/);
    expect(mockStorageFrom.upload.mock.calls[0][2].contentType).toBe("image/png");
  });

  it("normalizes the MIME type before matching the allow-list", async () => {
    await uploadProductImage(new File(["webp-bytes"], "shot.WEBP", { type: "IMAGE/WEBP" }));

    const [path, , options] = mockStorageFrom.upload.mock.calls[0];
    expect(path).toMatch(/\.webp$/);
    expect(options.contentType).toBe("image/webp");
  });

  it("accepts every allow-listed type with the matching extension", async () => {
    for (const [type, ext] of Object.entries(ALLOWED_PRODUCT_IMAGE_TYPES)) {
      vi.clearAllMocks();
      await uploadProductImage(new File(["bytes"], "upload", { type }));

      const [path, , options] = mockStorageFrom.upload.mock.calls[0];
      expect(path).toMatch(new RegExp(`\\.${ext}$`));
      expect(options.contentType).toBe(type);
    }
  });

  it("reports the validated type, extension and size", () => {
    expect(validateProductImage(pngFile())).toEqual({
      type: "image/png",
      ext: "png",
      size: 1,
    });
  });

  it("surfaces a storage failure after a valid image is accepted", async () => {
    mockStorageFrom.upload.mockResolvedValue({
      data: null,
      error: new Error("Storage quota exceeded"),
    });

    await expect(uploadProductImage(pngFile())).rejects.toThrow("Storage quota exceeded");
  });
});
