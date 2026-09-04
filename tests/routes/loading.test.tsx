import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LoadingSpinner from "@/components/LoadingSpinner";
import RootLoading from "@/app/loading";
import ShopLoading from "@/app/shop/loading";

describe("LoadingSpinner Component", () => {
  it("renders the shared loader element with animation and border classes", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".loader");

    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("loader");
    expect(spinner).toHaveClass("animate-spin");
    expect(spinner).toHaveClass("border-t-4");
    expect(spinner).toHaveClass("border-purple-700");
    expect(spinner).toHaveClass("rounded-full");
    expect(spinner).toHaveClass("w-16");
    expect(spinner).toHaveClass("h-16");
  });
});

describe("Route Loading Files", () => {
  it("app/loading.jsx renders the shared LoadingSpinner structure", () => {
    const { container } = render(<RootLoading />);
    const spinner = container.querySelector(".loader");

    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("animate-spin");
    expect(spinner).toHaveClass("border-t-4");
    expect(spinner).toHaveClass("border-purple-700");
  });

  it("app/shop/loading.jsx renders the shared LoadingSpinner structure", () => {
    const { container } = render(<ShopLoading />);
    const spinner = container.querySelector(".loader");

    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("animate-spin");
    expect(spinner).toHaveClass("border-t-4");
    expect(spinner).toHaveClass("border-purple-700");
  });
});
