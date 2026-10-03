import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Toast from "../../components/Toast";

afterEach(cleanup);

describe("Toast hidden focusability (#595)", () => {
  it("marks the hidden toast inert and takes the dismiss button out of the tab order", () => {
    render(<Toast message="Saved" show={false} onClose={() => {}} />);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("inert");

    const dismiss = screen.getByRole("button", { name: "Dismiss notification" });
    expect(dismiss).toHaveAttribute("tabindex", "-1");
  });

  it("keeps the dismiss button reachable while the toast is visible", () => {
    render(<Toast message="Saved" show={true} onClose={() => {}} />);

    const region = screen.getByRole("status");
    expect(region).not.toHaveAttribute("inert");

    const dismiss = screen.getByRole("button", { name: "Dismiss notification" });
    expect(dismiss).not.toHaveAttribute("tabindex", "-1");
  });

  it("still exposes the hidden live region so a later message can be announced", () => {
    render(<Toast message="Saved" show={false} onClose={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });
});
