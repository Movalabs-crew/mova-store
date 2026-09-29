import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/products", async () => {
  const { invalidateProductCache } = await import("../../../lib/productCache");
  return {
    listProducts: vi.fn(),
    deleteProduct: vi.fn(async () => {
      invalidateProductCache();
    }),
  };
});

vi.mock("../../../components/AdminGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../../../app/admin/AddProductForm", () => ({ default: () => null }));
vi.mock("../../../app/admin/EditProductForm", () => ({ default: () => null }));

import ProductsAdmin from "../../../app/admin/page";
import { deleteProduct, listProducts } from "../../../lib/products";

const shoes = [
  { id: "p1", name: "Mova Runner", price: 75, img: "/runner.png" },
  { id: "p2", name: "Mova Sprint", price: 90, img: "/sprint.png" },
];

async function renderAndWaitForProducts() {
  render(<ProductsAdmin />);
  await screen.findByText("Mova Runner");
}

describe("Products admin reads through the shared product cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // mockClear keeps queued once-implementations, so drop them explicitly;
    // otherwise a leftover queue entry from an earlier test silently decides
    // which list this test renders.
    vi.mocked(listProducts).mockReset();
  });

  it("loads the product list once on mount", async () => {
    vi.mocked(listProducts).mockResolvedValue(shoes);

    render(<ProductsAdmin />);

    expect(await screen.findByText("Mova Runner")).toBeInTheDocument();
    expect(listProducts).toHaveBeenCalledTimes(1);
  });

  it("refreshes the list after a delete invalidates the cache", async () => {
    vi.mocked(listProducts).mockResolvedValueOnce(shoes).mockResolvedValueOnce([shoes[1]]);

    await renderAndWaitForProducts();

    fireEvent.click(screen.getByRole("button", { name: "Delete Mova Runner" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm deleting Mova Runner" }));

    await waitFor(() => expect(screen.queryByText("Mova Runner")).not.toBeInTheDocument());
    expect(screen.getByText("Mova Sprint")).toBeInTheDocument();
    expect(listProducts).toHaveBeenCalledTimes(2);
    expect(deleteProduct).toHaveBeenCalledWith("p1");
  });
});

// Issue #564: Delete used to be a single click straight into the database.
describe("Products admin delete confirmation (issue #564)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listProducts).mockReset();
    vi.mocked(listProducts).mockResolvedValue(shoes);
  });

  it("cancelling closes the dialog and leaves the product intact", async () => {
    await renderAndWaitForProducts();

    fireEvent.click(screen.getByRole("button", { name: "Delete Mova Runner" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Mova Runner");
    expect(dialog).toHaveTextContent("This action cannot be undone.");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(deleteProduct).not.toHaveBeenCalled();
    expect(screen.getByText("Mova Runner")).toBeInTheDocument();
    expect(screen.getByText("Mova Sprint")).toBeInTheDocument();
  });

  it("closes the dialog on Escape without deleting", async () => {
    await renderAndWaitForProducts();

    fireEvent.click(screen.getByRole("button", { name: "Delete Mova Sprint" }));
    await screen.findByRole("dialog");

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(deleteProduct).not.toHaveBeenCalled();
    expect(screen.getByText("Mova Sprint")).toBeInTheDocument();
  });

  it("deletes exactly once when the admin confirms", async () => {
    // First read returns both rows; the read triggered by the cache
    // invalidation returns the list with the deleted row gone.
    vi.mocked(listProducts).mockResolvedValueOnce(shoes).mockResolvedValueOnce([shoes[1]]);

    await renderAndWaitForProducts();

    fireEvent.click(screen.getByRole("button", { name: "Delete Mova Runner" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm deleting Mova Runner" }));

    await waitFor(() => expect(deleteProduct).toHaveBeenCalledTimes(1));
    expect(deleteProduct).toHaveBeenCalledWith("p1");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByText("Mova Runner")).not.toBeInTheDocument();
    expect(screen.getByText("Mova Sprint")).toBeInTheDocument();
  });

  it("keeps the buttons disabled while the delete is in flight", async () => {
    let resolveDelete: () => void = () => {};
    vi.mocked(deleteProduct).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        })
    );

    await renderAndWaitForProducts();

    fireEvent.click(screen.getByRole("button", { name: "Delete Mova Runner" }));
    const confirm = await screen.findByRole("button", { name: "Confirm deleting Mova Runner" });

    fireEvent.click(confirm);
    expect(confirm).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    // A second click while in flight must not start a second delete.
    fireEvent.click(confirm);
    expect(deleteProduct).toHaveBeenCalledTimes(1);

    resolveDelete();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
