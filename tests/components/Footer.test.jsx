import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "../../components/Footer";

describe("Footer", () => {
  it("links legal and support destinations to real routes (not /)", () => {
    render(<Footer />);

    const terms = screen.getByRole("link", { name: /terms of use/i });
    const privacy = screen.getByRole("link", { name: /privacy policy/i });
    const about = screen.getByRole("link", { name: /about us/i });
    const support = screen.getByRole("link", { name: /24\/7 customer service/i });

    expect(terms).toHaveAttribute("href", "/terms");
    expect(privacy).toHaveAttribute("href", "/privacy");
    expect(about).toHaveAttribute("href", "/about");
    expect(support).toHaveAttribute("href", "/contact");

    for (const link of [terms, privacy, about, support]) {
      expect(link.getAttribute("href")).not.toBe("/");
    }
  });
});
