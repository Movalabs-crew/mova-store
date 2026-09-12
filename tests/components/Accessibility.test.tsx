import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "../../components/Modal";
import Cart from "../../components/Cart";
import SkipLink from "../../components/SkipLink";
import Whatsapp from "../../components/Whatsapp";
import ScrollToTop from "../../components/ScrollToTop";

describe("WCAG 2.1 AA Accessibility Tests for Storefront Components (#4)", () => {
  describe("Modal Accessibility", () => {
    it("renders with role='dialog', aria-modal='true', and accessible title", () => {
      render(
        <Modal show={true} onClose={() => {}} title="Product Options">
          <div>Modal Content</div>
        </Modal>
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-label", "Product Options");
    });

    it("close button has an accessible label", () => {
      render(
        <Modal show={true} onClose={() => {}}>
          <div>Modal Content</div>
        </Modal>
      );

      const closeBtn = screen.getByRole("button", { name: /close modal/i });
      expect(closeBtn).toBeInTheDocument();
      expect(closeBtn).toHaveAttribute("type", "button");
    });

    it("calls onClose when Escape key is pressed", () => {
      const handleClose = vi.fn();
      render(
        <Modal show={true} onClose={handleClose}>
          <div>Modal Content</div>
        </Modal>
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Cart Button Accessibility", () => {
    it("provides accessible name when empty", () => {
      render(<Cart itemCount={0} onClick={() => {}} />);
      const btn = screen.getByRole("button", { name: /shopping cart is empty/i });
      expect(btn).toBeInTheDocument();
    });

    it("announces item count in accessible name and hides redundant badge from screen readers", () => {
      render(<Cart itemCount={3} onClick={() => {}} />);
      const btn = screen.getByRole("button", { name: /shopping cart with 3 items/i });
      expect(btn).toBeInTheDocument();

      const badge = screen.getByText("3");
      expect(badge).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("SkipLink Accessibility", () => {
    it("renders skip link targeting main-content with accessible label", () => {
      render(<SkipLink />);
      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "#main-content");
    });
  });

  describe("Whatsapp & External Link Accessibility", () => {
    it("renders valid anchor without nested buttons and provides accessible label", () => {
      render(<Whatsapp />);
      const link = screen.getByRole("link", { name: /chat with mova store on whatsapp/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link.querySelector("button")).toBeNull();
    });
  });
});
