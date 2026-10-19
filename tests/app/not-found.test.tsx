import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import Custom404 from "@/app/not-found";

/**
 * The 404 route used to render only a link pushed down the viewport with a
 * large `mt-80` offset: no heading and no explanation, so a dead URL looked
 * like a blank page. These tests pin the orienting content in place.
 */

describe("app/not-found.jsx (#602)", () => {
  it("renders a heading that names the 404", () => {
    render(<Custom404 />);

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });

  it("explains what happened instead of showing a blank page", () => {
    render(<Custom404 />);

    const message = screen.getByText(/couldn't find the page/i);
    expect(message).toBeInTheDocument();
    expect(message.textContent?.trim().length).toBeGreaterThan(0);
  });

  it("offers a home action that is not pushed off-screen", () => {
    render(<Custom404 />);

    const homeLink = screen.getByRole("link", { name: "Go to Homepage" });
    expect(homeLink).toHaveAttribute("href", "/");
    // The old `mt-80` offset pushed the action to the bottom of the page.
    expect(homeLink.className).not.toContain("mt-80");
  });
});
