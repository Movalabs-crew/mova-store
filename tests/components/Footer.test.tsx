import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "../../components/Footer";

describe("Footer component", () => {
  it("renders all footer navigation links with correct destinations and grammar", () => {
    render(<Footer />);

    const termsLink = screen.getByRole("link", { name: /Terms of Use/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute("href", "/terms");

    const privacyLink = screen.getByRole("link", { name: /Privacy Policy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute("href", "/privacy");

    const aboutLink = screen.getByRole("link", { name: /About us/i });
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink).toHaveAttribute("href", "/#aboutus");

    const supportLink = screen.getByRole("link", { name: /24\/7 Customer Service/i });
    expect(supportLink).toBeInTheDocument();
    expect(supportLink).toHaveAttribute("href", "/#contact");
  });

  it("does not hardcode any link to '/'", () => {
    render(<Footer />);
    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link.getAttribute("href")).not.toBe("/");
    });
  });
});
