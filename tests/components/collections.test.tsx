/* eslint-disable @next/next/no-img-element */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next/image to inspect rendered attributes and verify modern props
vi.mock("next/image", () => ({
  default: ({
    fill,
    style,
    layout,
    objectFit,
    src,
    alt,
    className,
    ...props
  }: {
    fill?: boolean;
    style?: React.CSSProperties;
    layout?: string;
    objectFit?: string;
    src: any;
    alt: string;
    className?: string;
    [key: string]: any;
  }) => (
    <img
      src={typeof src === "string" ? src : src?.src || "shoe-image"}
      alt={alt}
      className={className}
      data-fill={fill ? "true" : undefined}
      data-layout={layout}
      data-objectfit={objectFit}
      style={style}
      {...props}
    />
  ),
}));

import ShoesCollection from "../../app/collections/page";

describe("ShoesCollection Component", () => {
  it("renders the collection title and all 4 distinct shoe products", () => {
    render(<ShoesCollection />);

    expect(
      screen.getByRole("heading", { level: 1, name: /shoes collection/i })
    ).toBeInTheDocument();

    expect(screen.getByText("Running Shoes")).toBeInTheDocument();
    expect(screen.getByText("$99.99")).toBeInTheDocument();

    expect(screen.getByText("Basketball Shoes")).toBeInTheDocument();
    expect(screen.getByText("$129.99")).toBeInTheDocument();

    expect(screen.getByText("Casual Sneakers")).toBeInTheDocument();
    expect(screen.getByText("$79.99")).toBeInTheDocument();

    expect(screen.getByText("Formal Shoes")).toBeInTheDocument();
    expect(screen.getByText("$149.99")).toBeInTheDocument();

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(4);
  });

  it("assigns unique images to products and does not use duplicate images", () => {
    const { container } = render(<ShoesCollection />);
    const images = Array.from(container.querySelectorAll("img"));
    expect(images).toHaveLength(4);

    const alts = images.map((img) => img.getAttribute("alt"));
    expect(new Set(alts).size).toBe(4);

    const srcs = images.map((img) => img.getAttribute("src"));
    expect(new Set(srcs).size).toBe(4);
  });

  it("passes fill and cover objectFit style to images without legacy layout/objectFit props", () => {
    const { container } = render(<ShoesCollection />);
    const images = Array.from(container.querySelectorAll("img"));
    expect(images).toHaveLength(4);

    images.forEach((img) => {
      // Legacy props must not be present
      expect(img.getAttribute("data-layout")).toBeNull();
      expect(img.getAttribute("data-objectfit")).toBeNull();

      // Modern Next.js 13/14 props must be present
      expect(img.getAttribute("data-fill")).toBe("true");
      expect(img.style.objectFit).toBe("cover");
    });
  });
});
