import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Footer from "../../components/Footer";

vi.mock("next/link", () => ({
  default: ({ href, ...rest }) => (
    <a href={href} data-testid="footer-link" {...rest} />
  ),
}));

const linkText = (text) => screen.getByText(text).closest("a");

describe("Footer", () => {
  it("has no footer link that just bounces to the root path", () => {
    render(<Footer />);
    const hrefs = screen
      .getAllByTestId("footer-link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).not.toContain("/");
  });

  it("points Terms of Use / Privacy Policy at their own routes", () => {
    render(<Footer />);
    expect(linkText("Terms of Use").getAttribute("href")).toBe("/terms");
    expect(linkText("Privacy Policy").getAttribute("href")).toBe("/privacy");
  });

  it("points About us and 24/7 Customer Service at their home-page sections", () => {
    render(<Footer />);
    expect(linkText("About us").getAttribute("href")).toBe("/#aboutus");
    expect(
      linkText("24/7 Customer Service").getAttribute("href")
    ).toBe("/#contact");
  });

  it("uses the corrected 'Terms of Use' wording", () => {
    render(<Footer />);
    expect(screen.queryByText("Term of use")).toBeNull();
    expect(screen.getByText("Terms of Use")).toBeTruthy();
  });
});
