import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

const { lookup, deleteQuery, remove } = vi.hoisted(() => ({
  lookup: vi.fn(),
  deleteQuery: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: lookup }) }),
      delete: () => ({ eq: deleteQuery }),
    }),
    storage: { from: () => ({ remove }) },
  },
}));

import { deleteProduct } from "../../lib/products";

const imageUrl = "https://proj.supabase.co/storage/v1/object/public/products/1700-a.jpg";

describe("deleteProduct storage cleanup observability", () => {
  let warn: MockInstance;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    lookup.mockResolvedValue({ data: { img: imageUrl }, error: null });
    deleteQuery.mockResolvedValue({ data: null, error: null });
    remove.mockResolvedValue({ data: [], error: null });
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    vi.unstubAllEnvs();
  });

  it("reports a resolved storage error without failing the deletion", async () => {
    remove.mockResolvedValue({ data: null, error: { message: "Object not found" } });

    await expect(deleteProduct("p-del")).resolves.toBeUndefined();

    expect(deleteQuery).toHaveBeenCalledWith("id", "p-del");
    expect(remove).toHaveBeenCalledWith(["1700-a.jpg"]);
    expect(warn).toHaveBeenCalledTimes(1);

    const message = String(warn.mock.calls[0][0]);
    expect(message).toContain("p-del");
    expect(message).toContain("1700-a.jpg");
    expect(message).toContain("Object not found");
  });

  it("reports a rejected storage request without failing the deletion", async () => {
    remove.mockRejectedValue(new Error("Storage unreachable"));

    await expect(deleteProduct("p-del")).resolves.toBeUndefined();

    expect(deleteQuery).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("Storage unreachable");
  });

  it("stays silent when cleanup succeeds", async () => {
    remove.mockResolvedValue({ data: [], error: null });

    await expect(deleteProduct("p-del")).resolves.toBeUndefined();

    expect(remove).toHaveBeenCalledWith(["1700-a.jpg"]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not attempt or report cleanup when the row deletion fails", async () => {
    deleteQuery.mockResolvedValue({
      data: null,
      error: { message: "Foreign key constraint violation" },
    });

    await expect(deleteProduct("p-del")).rejects.toThrow("Foreign key constraint violation");

    expect(remove).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not attempt or report cleanup for an external image", async () => {
    lookup.mockResolvedValue({
      data: { img: "https://images.unsplash.com/photo-123.jpg" },
      error: null,
    });
    remove.mockResolvedValue({ data: null, error: { message: "Object not found" } });

    await expect(deleteProduct("p-del")).resolves.toBeUndefined();

    expect(remove).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
