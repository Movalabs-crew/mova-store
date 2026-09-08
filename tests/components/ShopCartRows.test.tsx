import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ShopPage from "../../app/shop/page";
import ProductPage from "../../app/shop/[id]/page";
import { useCart } from "../../context/CartContext";
import { getProductById, listProducts } from "../../lib/products";

vi.mock("../../context/CartContext", () => ({ useCart: vi.fn() }));
vi.mock("../../lib/products", () => ({ listProducts: vi.fn(), getProductById: vi.fn() }));
vi.mock("../../components/Toast", () => ({ default: () => null }));

const product = { id: "runner-42", name: "Mova Runner", price: 75, img: "/images/shoe1.png" };
type CartRow = typeof product & { cartItemId?: string; lineId?: string };
const removeFromCart = vi.fn();

function setCartRows(cartItems: CartRow[]) {
  vi.mocked(useCart).mockReturnValue({
    cartItems,
    itemCount: cartItems.length,
    totalPrice: cartItems.reduce((sum, item) => sum + item.price, 0),
    addToCart: vi.fn(),
    removeFromCart,
  });
}

describe.each([
  { name: "shop page", page: <ShopPage /> },
  { name: "product page", page: <ProductPage params={{ id: product.id }} /> },
])("$name cart rows", ({ page }) => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listProducts).mockResolvedValue([]);
    vi.mocked(getProductById).mockResolvedValue(product);
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function expectUniqueRowKeys() {
    const warnings = consoleError.mock.calls.filter((args) =>
      args.some((arg) => typeof arg === "string" && arg.includes("same key"))
    );
    expect(warnings).toHaveLength(0);
  }

  describe.each(["cartItemId", "lineId"] as const)("with %s identities", (idField) => {
    it.each([0, 1])(
      "keeps the other row's DOM identity when row %i is removed",
      async (removedIndex) => {
        const rows: CartRow[] = [
          { ...product, [idField]: "first-line" },
          { ...product, [idField]: "second-line" },
        ];
        setCartRows(rows);
        const view = render(page);
        await act(async () => {});
        fireEvent.click(screen.getByRole("button", { name: "2" }));

        const buttons = screen.getAllByRole("button", { name: "Remove" });
        expect(buttons).toHaveLength(2);
        expectUniqueRowKeys();

        fireEvent.click(buttons[removedIndex]);
        expect(removeFromCart).toHaveBeenCalledTimes(1);
        expect(removeFromCart.mock.calls[0][0]).toBe(rows[removedIndex]);

        // Feed back the context's next value; this test exercises the actual
        // modal consumer, while CartContext tests own the removal algorithm.
        const remainingIndex = 1 - removedIndex;
        setCartRows([rows[remainingIndex]]);
        view.rerender(React.cloneElement(page));

        const remainingButton = screen.getByRole("button", { name: "Remove" });
        expect(remainingButton).toBe(buttons[remainingIndex]);
        fireEvent.click(remainingButton);
        expect(removeFromCart).toHaveBeenCalledTimes(2);
        expect(removeFromCart.mock.calls[1][0]).toBe(rows[remainingIndex]);
        expectUniqueRowKeys();
      }
    );
  });

  it("renders legacy duplicate products without key warnings and routes each callback", async () => {
    const rows = [{ ...product }, { ...product }];
    setCartRows(rows);
    render(page);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "2" }));

    const buttons = screen.getAllByRole("button", { name: "Remove" });
    expect(buttons).toHaveLength(2);
    expectUniqueRowKeys();

    fireEvent.click(buttons[1]);
    fireEvent.click(buttons[0]);
    expect(removeFromCart.mock.calls[0][0]).toBe(rows[1]);
    expect(removeFromCart.mock.calls[1][0]).toBe(rows[0]);
  });
});
