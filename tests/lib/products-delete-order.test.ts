import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("deleteProduct image cleanup ordering", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    lookup.mockResolvedValue({ data: { img: imageUrl }, error: null });
    deleteQuery.mockResolvedValue({ data: null, error: null });
    remove.mockResolvedValue({ data: [], error: null });
  });

  it("preserves the image when the database returns an error", async () => {
    deleteQuery.mockResolvedValue({
      data: null,
      error: { message: "Foreign key constraint violation" },
    });

    await expect(deleteProduct("p-del")).rejects.toThrow("Foreign key constraint violation");

    expect(deleteQuery).toHaveBeenCalledWith("id", "p-del");
    expect(remove).not.toHaveBeenCalled();
  });

  it("preserves the image when the database request rejects", async () => {
    deleteQuery.mockRejectedValue(new Error("Database unavailable"));

    await expect(deleteProduct("p-del")).rejects.toThrow("Database unavailable");

    expect(remove).not.toHaveBeenCalled();
  });

  it("waits for successful row deletion before removing the image", async () => {
    let finishDelete!: (result: { data: null; error: null }) => void;
    const pendingDelete = new Promise<{ data: null; error: null }>((resolve) => {
      finishDelete = resolve;
    });
    deleteQuery.mockReturnValue(pendingDelete);

    const deletion = deleteProduct("p-del");
    await vi.waitFor(() => expect(deleteQuery).toHaveBeenCalledWith("id", "p-del"));
    const cleanupCallsBeforeSuccess = remove.mock.calls.length;
    finishDelete({ data: null, error: null });
    await deletion;

    expect(cleanupCallsBeforeSuccess).toBe(0);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(["1700-a.jpg"]);
  });

  it("tolerates a storage error result after the row was deleted", async () => {
    remove.mockResolvedValue({ data: null, error: { message: "Object not found" } });

    await expect(deleteProduct("p-del")).resolves.toBeUndefined();

    expect(deleteQuery).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(["1700-a.jpg"]);
  });

  it("still deletes the row without cleanup when the image lookup rejects", async () => {
    lookup.mockRejectedValue(new Error("Image lookup unavailable"));

    await expect(deleteProduct("p-del")).resolves.toBeUndefined();

    expect(deleteQuery).toHaveBeenCalledWith("id", "p-del");
    expect(remove).not.toHaveBeenCalled();
  });
});
