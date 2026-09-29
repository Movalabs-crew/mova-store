import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, userState } = vi.hoisted(() => ({
  push: vi.fn(),
  userState: { current: { email: "someone@example.com" } as { email?: string } | null },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("../../lib/AuthContext", () => ({
  useAuth: () => ({ user: userState.current }),
}));

import Hero from "../../app/(landingpage)/Hero";

describe("Hero", () => {
  beforeEach(() => {
    push.mockClear();
    userState.current = { email: "someone@example.com" };
  });

  it("routes a signed-in visitor straight to the shop", () => {
    render(<Hero />);

    const cta = screen.getByRole("link", { name: "Shop Now" });
    expect(cta).toHaveAttribute("href", "/shop");

    fireEvent.click(cta);

    expect(push).toHaveBeenCalledWith("/shop");
    expect(screen.queryByText("Kindly login first")).not.toBeInTheDocument();
  });

  it("sends a signed-out visitor to login instead of the shop", () => {
    userState.current = null;
    render(<Hero />);

    const cta = screen.getByRole("link", { name: "Shop Now" });
    expect(cta).toHaveAttribute("href", "#");

    fireEvent.click(cta);

    expect(push).toHaveBeenCalledWith("/profile/login");
    expect(screen.getByText("Kindly login first")).toBeInTheDocument();
  });

  it("renders the storefront pitch", () => {
    render(<Hero />);

    expect(screen.getByText("Mova Store")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pay with Stellar" })).toHaveAttribute(
      "href",
      "#stellar"
    );
  });
});
