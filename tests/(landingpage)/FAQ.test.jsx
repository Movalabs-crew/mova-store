import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FAQ from "../../app/(landingpage)/FAQ";

function openButtons() {
  return screen
    .getAllByRole("button")
    .filter((b) => b.getAttribute("aria-expanded") === "true");
}

describe("FAQ", () => {
  it("starts with no panel open", () => {
    render(<FAQ />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(8);
    for (const button of buttons) {
      expect(button).toHaveAttribute("aria-expanded", "false");
    }
    expect(openButtons()).toHaveLength(0);
  });

  it("opens exactly one panel and toggles aria-expanded", () => {
    render(<FAQ />);
    const [first, second] = screen.getAllByRole("button");

    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(openButtons()).toHaveLength(1);

    // opening a second question closes the first (single-open accordion)
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(openButtons()).toHaveLength(1);

    // clicking the open question again closes it
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-expanded", "false");
    expect(openButtons()).toHaveLength(0);
  });

  it("expands the answer panel of the open question", () => {
    render(<FAQ />);
    const [first] = screen.getAllByRole("button");
    // the answer panel is the sibling right after the question button
    const panel = first.nextElementSibling;
    expect(panel.className).toContain("max-h-0");

    fireEvent.click(first);
    expect(panel.className).toContain("max-h-96");
    expect(panel.textContent).toContain(
      "Stellar is a fast, low-cost blockchain network"
    );
  });
});
