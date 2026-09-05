import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import RootLoading from "@/app/loading";
import ShopLoading from "@/app/shop/loading";

describe("Loading components", () => {
  it("renders LoadingSpinner with expected loader classes", () => {
    const { container } = render(<LoadingSpinner />);
    const loader = container.querySelector(".loader");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass("border-t-4", "border-purple-700", "rounded-full", "animate-spin");
  });

  it("renders LoadingSpinner in root app/loading", () => {
    const { container } = render(<RootLoading />);
    const loader = container.querySelector(".loader");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass("animate-spin");
  });

  it("renders LoadingSpinner in app/shop/loading", () => {
    const { container } = render(<ShopLoading />);
    const loader = container.querySelector(".loader");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass("animate-spin");
  });
});
