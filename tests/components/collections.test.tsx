import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: ({ fill, style, ...props }: any) => (
    <img data-fill={fill ? "true" : undefined} style={style} {...props} />
  ),
}));

import ShoesCollection from "../../app/collections/page";

describe("ShoesCollection Component", () => {
  it("renders the collection title and 4 shoe products", () => {
    render(<ShoesCollection />);

    expect(screen.getByRole("heading", { level: 1, name: /shoes collection/i })).toBeDefined();

    expect(screen.getByText("Running Shoes")).toBeDefined();
    expect(screen.getByText("$99.99")).toBeDefined();

    expect(screen.getByText("Basketball Shoes")).toBeDefined();
    expect(screen.getByText("$129.99")).toBeDefined();

    expect(screen.getByText("Casual Sneakers")).toBeDefined();
    expect(screen.getByText("$79.99")).toBeDefined();

    expect(screen.getByText("Formal Shoes")).toBeDefined();
    expect(screen.getByText("$149.99")).toBeDefined();

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(4);
  });

  it("passes fill and cover objectFit style to images without legacy props", () => {
    const { container } = render(<ShoesCollection />);
    const images = container.querySelectorAll("img");
    expect(images.length).toBe(4);

    images.forEach((img) => {
      expect(img.getAttribute("layout")).toBeNull();
      expect(img.getAttribute("objectfit")).toBeNull();
      expect(img.getAttribute("data-fill")).toBe("true");
      expect(img.getAttribute("style")).toContain("object-fit: cover");
    });
  });
});
