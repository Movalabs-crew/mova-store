import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ScrollToTop from "../../components/ScrollToTop";

const scrollTo = vi.fn();

function setScrollOffset(value: number) {
  Object.defineProperty(window, "pageYOffset", { value, configurable: true, writable: true });
}

describe("ScrollToTop", () => {
  beforeEach(() => {
    scrollTo.mockClear();
    Object.defineProperty(window, "scrollTo", {
      value: scrollTo,
      configurable: true,
      writable: true,
    });
    setScrollOffset(0);
  });

  it("stays hidden until the page is scrolled down", () => {
    render(<ScrollToTop />);

    expect(screen.queryByRole("button", { name: "Scroll to top of page" })).not.toBeInTheDocument();

    setScrollOffset(500);
    fireEvent.scroll(window);

    expect(screen.getByRole("button", { name: "Scroll to top of page" })).toBeInTheDocument();
  });

  it("hides again once the reader is back near the top", () => {
    setScrollOffset(800);
    render(<ScrollToTop />);
    fireEvent.scroll(window);
    expect(screen.getByRole("button", { name: "Scroll to top of page" })).toBeInTheDocument();

    setScrollOffset(0);
    fireEvent.scroll(window);

    expect(screen.queryByRole("button", { name: "Scroll to top of page" })).not.toBeInTheDocument();
  });

  it("smoothly scrolls the window back to the top when clicked", () => {
    setScrollOffset(400);
    render(<ScrollToTop />);
    fireEvent.scroll(window);

    fireEvent.click(screen.getByRole("button", { name: "Scroll to top of page" }));

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
