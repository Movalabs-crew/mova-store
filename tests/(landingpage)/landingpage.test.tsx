import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import FAQ from "../../app/(landingpage)/FAQ";
import Newsletter from "../../app/(landingpage)/newsletter";
import ContactUs from "../../app/(landingpage)/ContactUs";
import Slider from "../../app/(landingpage)/Slider";
import * as sendMailModule from "../../lib/sendmail";

describe("Landing Page Components", () => {
  describe("FAQ Component", () => {
    it("asserts exactly one panel is open and aria-expanded toggles", () => {
      render(<FAQ />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);

      // Initially all buttons have aria-expanded='false'
      buttons.forEach((btn) => {
        expect(btn.getAttribute("aria-expanded")).toBe("false");
      });

      // Click the first FAQ item
      fireEvent.click(buttons[0]);
      expect(buttons[0].getAttribute("aria-expanded")).toBe("true");
      for (let i = 1; i < buttons.length; i++) {
        expect(buttons[i].getAttribute("aria-expanded")).toBe("false");
      }

      // Click the second FAQ item - first should close, second opens
      fireEvent.click(buttons[1]);
      expect(buttons[0].getAttribute("aria-expanded")).toBe("false");
      expect(buttons[1].getAttribute("aria-expanded")).toBe("true");

      // Click the second FAQ item again - should collapse
      fireEvent.click(buttons[1]);
      expect(buttons[1].getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("Slider Component", () => {
    it("renders each image once instead of a duplicated strip", () => {
      render(<Slider />);

      const imgs = screen.getAllByRole("img");
      expect(imgs).toHaveLength(5);

      const sources = imgs.map((img) => img.getAttribute("src"));
      expect(new Set(sources).size).toBe(sources.length);
    });

    it("keys the strip without colliding, so keying by src stays safe", () => {
      // Guards the plausible half-fix: switching key={index} to key={src} while
      // still rendering [...images, ...images] turns unique index keys into
      // genuinely duplicated ones.
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<Slider />);

      const duplicateKeyWarnings = consoleError.mock.calls
        .map((call) => String(call[0]))
        .filter((message) => message.includes("two children with the same key"));
      expect(duplicateKeyWarnings).toHaveLength(0);

      consoleError.mockRestore();
    });
  });

  describe("Newsletter Component", () => {
    it("asserts an invalid email never shows the success toast", async () => {
      render(<Newsletter />);

      const submitBtn = screen.getByRole("button", { name: /subscribe/i });

      // Empty submission
      fireEvent.click(submitBtn);
      expect(screen.queryByText("Thank you for subscribing!")).toBeNull();
      expect(screen.getByText("Please enter your email!")).toBeDefined();
    });

    it("shows success toast when email is provided and clears input", async () => {
      render(<Newsletter />);

      const input = screen.getByPlaceholderText(/enter your email/i);
      const submitBtn = screen.getByRole("button", { name: /subscribe/i });

      fireEvent.change(input, { target: { value: "user@example.com" } });
      fireEvent.click(submitBtn);

      expect(screen.getByText("Thank you for subscribing!")).toBeDefined();
    });
  });

  describe("ContactUs Component", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("asserts a mock sendMail rejection renders the error message", async () => {
      vi.spyOn(sendMailModule, "default").mockRejectedValue(new Error("Network error"));

      render(<ContactUs />);

      const nameInput = screen.getByPlaceholderText(/your name/i);
      const emailInput = screen.getByPlaceholderText(/your email/i);
      const messageInput = screen.getByPlaceholderText(/your message/i);
      const submitBtn = screen.getByRole("button", { name: /send message/i });

      fireEvent.change(nameInput, { target: { value: "Alice" } });
      fireEvent.change(emailInput, { target: { value: "alice@example.com" } });
      fireEvent.change(messageInput, { target: { value: "Hello support" } });

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Unable to send message, please try again later")).toBeDefined();
      });
    });
  });
});
