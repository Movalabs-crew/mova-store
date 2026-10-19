import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("announces the loading state with role=status and aria-live=polite", () => {
    render(<LoadingSpinner />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Loading…");
  });

  it("exposes a visually hidden Loading… label without changing the spinner markup", () => {
    const { container } = render(<LoadingSpinner />);

    const label = screen.getByText("Loading…");
    expect(label.tagName).toBe("SPAN");
    expect(label).toHaveClass("sr-only");

    // The loader element itself is untouched: the hidden label is a sibling,
    // so the spinner stays visually identical.
    const loader = container.querySelector(".loader");
    expect(loader).toBeInTheDocument();
    expect(loader?.parentElement).toHaveAttribute("role", "status");
    expect(loader?.nextElementSibling).toBe(label);
  });

  it("keeps the loader styling stable across every loading surface", () => {
    const { container } = render(
      <>
        <RootLoading />
        <ShopLoading />
      </>,
    );

    const statuses = container.querySelectorAll('[role="status"]');
    expect(statuses).toHaveLength(2);
    container.querySelectorAll(".loader").forEach((loader) => {
      expect(loader).toHaveClass("border-t-4", "border-purple-700", "rounded-full", "w-16", "h-16", "mx-auto", "animate-spin");
    });
  });
});
