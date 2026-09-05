import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import Modal from "../../components/Modal";

describe("Modal component", () => {
  it("renders nothing when show is false", () => {
    const { container } = render(
      <Modal show={false} onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("Modal Content")).not.toBeInTheDocument();
  });

  it("renders children and close button when show is true", () => {
    render(
      <Modal show={true} onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.getByText("Modal Content")).toBeInTheDocument();
    const closeButton = screen.getByRole("button");
    expect(closeButton).toBeInTheDocument();
  });

  it("calls onClose exactly once when the close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <Modal show={true} onClose={handleClose}>
        <div>Modal Content</div>
      </Modal>
    );

    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("removes subtree when re-rendered with show=false", () => {
    const { rerender, container } = render(
      <Modal show={true} onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.getByText("Modal Content")).toBeInTheDocument();

    rerender(
      <Modal show={false} onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("Modal Content")).not.toBeInTheDocument();
  });
});
