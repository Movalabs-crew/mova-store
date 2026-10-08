import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Hero from "../../app/(landingpage)/Hero";

describe("Hero primary call to action", () => {
  it("routes every visitor directly to the public shop", () => {
    render(<Hero />);

    const cta = screen.getByRole("link", { name: /shop now/i });
    expect(cta).toHaveAttribute("href", "/shop");
    expect(cta).not.toHaveAttribute("href", "#");
    expect(cta).not.toHaveAttribute("href", "/profile/login");
    expect(fireEvent.click(cta)).toBe(true);
  });

  it("does not render the retired login nudge", () => {
    const { container } = render(<Hero />);

    expect(screen.queryByText("Kindly login first")).toBeNull();
    expect(container.querySelector('a[href="/profile/login"]')).toBeNull();
  });
});
