import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import Footer from "../../components/Footer";

describe("Footer component", () => {
  it("renders all footer navigation links with real route destinations", () => {
    render(<Footer />);

    const termsLink = screen.getByRole("link", { name: /terms of use/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute("href", "/terms");

    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute("href", "/privacy");

    const aboutLink = screen.getByRole("link", { name: /about us/i });
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink).toHaveAttribute("href", "/about");

    const contactLink = screen.getByRole("link", { name: /24\/7 customer service/i });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute("href", "/contact");
  });

  it("fixes ungrammatical 'Term of use' wording", () => {
    render(<Footer />);

    // Should not have the singular 'Term of use'
    expect(screen.queryByText(/^term of use$/i)).not.toBeInTheDocument();
    // Should have 'Terms of Use'
    expect(screen.getByText(/^terms of use$/i)).toBeInTheDocument();
  });

  it("ensures no footer link points back to home page '/'", () => {
    render(<Footer />);

    const links = screen.getAllByRole("link");
    expect(links.length).toBe(4);

    links.forEach((link) => {
      expect(link).not.toHaveAttribute("href", "/");
    });
  });

  it("renders current year copyright notice", () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear().toString();
    expect(
      screen.getByText(new RegExp(`© ${currentYear} Mova Store. All rights reserved.`))
    ).toBeInTheDocument();
  });
});
