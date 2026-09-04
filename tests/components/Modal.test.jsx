import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Modal from "../../components/Modal";

describe("Modal", () => {
  it("renders nothing when show is false", () => {
    const { container } = render(
      <Modal show={false} onClose={vi.fn()}>
        <p>Hidden body</p>
      </Modal>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders children and the close button when show is true", () => {
    render(
      <Modal show={true} onClose={vi.fn()}>
        <p>Visible body</p>
      </Modal>
    );

    expect(screen.getByText("Visible body")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("invokes onClose exactly once when the close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal show={true} onClose={onClose}>
        <p>Body</p>
      </Modal>
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("removes the whole subtree when show flips back to false", () => {
    const { rerender } = render(
      <Modal show={true} onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText("Modal content")).toBeInTheDocument();

    rerender(
      <Modal show={false} onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });
});
