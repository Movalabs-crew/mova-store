import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import FAQ from "@/app/(landingpage)/FAQ";

// Panels stay mounted and are collapsed with `max-h-0`, so open/closed state is
// asserted through aria-expanded rather than through answer text presence.
const questionToggles = () =>
  screen.getAllByRole("button").filter((button) => button.hasAttribute("aria-expanded"));

const openToggles = () => screen.queryAllByRole("button", { expanded: true });

describe("FAQ component", () => {
  it("renders every question collapsed by default", () => {
    render(<FAQ />);

    const toggles = questionToggles();
    expect(toggles.length).toBeGreaterThan(1);
    toggles.forEach((toggle) => {
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    });
    expect(openToggles()).toHaveLength(0);
  });

  it("toggles aria-expanded on the clicked question", () => {
    render(<FAQ />);
    const first = questionToggles()[0];

    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps exactly one panel open when another question is clicked", () => {
    render(<FAQ />);
    const [first, , third] = questionToggles();

    fireEvent.click(first);
    expect(openToggles()).toHaveLength(1);
    expect(openToggles()[0]).toBe(first);

    fireEvent.click(third);
    expect(openToggles()).toHaveLength(1);
    expect(openToggles()[0]).toBe(third);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(third).toHaveAttribute("aria-expanded", "true");
  });

  it("closes the open panel when its own question is clicked again", () => {
    render(<FAQ />);
    const second = questionToggles()[1];

    fireEvent.click(second);
    expect(openToggles()).toHaveLength(1);

    fireEvent.click(second);
    expect(openToggles()).toHaveLength(0);
    expect(second).toHaveAttribute("aria-expanded", "false");
  });
});
