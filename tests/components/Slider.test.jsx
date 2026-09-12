import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Slider from "../../app/(landingpage)/Slider";

vi.mock("next/image", () => ({
  default: (props) => <img data-testid="slide" {...props} />,
}));

describe("Slider", () => {
  it("renders exactly 5 images (no duplicated strip)", () => {
    render(<Slider />);
    expect(screen.getAllByTestId("slide")).toHaveLength(5);
  });

  it("renders each of the 5 image URLs exactly once (stable src-based keys)", () => {
    const { container } = render(<Slider />);
    const srcs = Array.from(container.querySelectorAll("img")).map((img) =>
      img.getAttribute("src")
    );
    expect(srcs).toHaveLength(5);
    expect(new Set(srcs).size).toBe(5);
    const duplicates = srcs.filter((src, i) => srcs.indexOf(src) !== i);
    expect(duplicates).toHaveLength(0);
  });
});
