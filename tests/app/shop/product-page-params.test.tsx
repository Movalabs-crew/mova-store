import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductPage from "../../../app/shop/[id]/page";
import { useCart } from "../../../context/CartContext";
import { getProductById } from "../../../lib/products";

vi.mock("../../../context/CartContext", () => ({ useCart: vi.fn() }));
vi.mock("../../../lib/products", () => ({ listProducts: vi.fn(), getProductById: vi.fn() }));
vi.mock("../../../components/Toast", () => ({ default: () => null }));

const product = { id: "runner-42", name: "Mova Runner", price: 75, img: "/images/shoe1.png" };

/**
 * `params` changed shape between Next majors and the change is silent.
 *
 * Next 15 types it as `Promise<SegmentParams>` (see the generated route types),
 * while Next 14 and every existing component test pass a plain object. Reading
 * `params.id` directly therefore yields `undefined` on Next 15, and the page
 * renders "Product not found" for every product without failing the build, the
 * type check (the page is plain JS) or the rest of the suite.
 *
 * Both shapes are asserted here so that a future major cannot reintroduce it.
 */
describe("product page params shape", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCart).mockReturnValue({
      cartItems: [],
      itemCount: 0,
      totalPrice: 0,
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
    });
    vi.mocked(getProductById).mockResolvedValue(product);
  });

  it("resolves a plain object, as Next 14 and the component tests pass", async () => {
    render(<ProductPage params={{ id: "runner-42" }} />);

    await waitFor(() => expect(getProductById).toHaveBeenCalledWith("runner-42"));
  });

  it("resolves a promise, as Next 15 passes", async () => {
    render(<ProductPage params={Promise.resolve({ id: "runner-42" })} />);

    await waitFor(() => expect(getProductById).toHaveBeenCalledWith("runner-42"));
  });

  it("does not fetch when the resolved params carry no id", async () => {
    render(<ProductPage params={Promise.resolve({})} />);

    await waitFor(() => expect(getProductById).not.toHaveBeenCalled());
  });

  it("does not call the fetch with undefined when params is a promise", async () => {
    // The specific regression: `params.id` on a promise is `undefined`, which
    // would reach getProductById as an undefined id.
    render(<ProductPage params={Promise.resolve({ id: "runner-42" })} />);

    await waitFor(() => expect(getProductById).toHaveBeenCalled());
    expect(getProductById).not.toHaveBeenCalledWith(undefined);
  });
});
