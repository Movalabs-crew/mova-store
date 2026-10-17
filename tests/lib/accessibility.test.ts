import { describe, it, expect, vi, beforeEach } from "vitest";
import * as accessibilityModule from "../../lib/accessibility";
import {
  Keys,
  isFocusable,
  getFocusableElements,
  isVisible,
  trapFocus,
  ariaInvalid,
  announceToScreenReader,
  saveFocus,
  focusFirstError,
  prefersReducedMotion,
} from "../../lib/accessibility";

describe("Accessibility - Exported Surface (#1073)", () => {
  it("only exports helpers that have real UI callers or documented internal roles", () => {
    const exportedNames = Object.keys(accessibilityModule).sort();
    expect(exportedNames).toEqual(
      [
        "Keys",
        "announceToScreenReader",
        "ariaInvalid",
        "focusFirstError",
        "getFocusableElements",
        "isFocusable",
        "isVisible",
        "prefersReducedMotion",
        "saveFocus",
        "trapFocus",
      ].sort()
    );
  });
});

describe("Accessibility - DOM and ARIA Helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("Keys defines standard keyboard navigation constants", () => {
    expect(Keys.TAB).toBe("Tab");
    expect(Keys.ESCAPE).toBe("Escape");
    expect(Keys.ENTER).toBe("Enter");
  });

  it("isFocusable identifies focusable vs disabled/tabindex=-1 elements", () => {
    const btn = document.createElement("button");
    const disabledBtn = document.createElement("button");
    disabledBtn.disabled = true;
    const div = document.createElement("div");
    const divTabindex = document.createElement("div");
    divTabindex.setAttribute("tabindex", "0");
    const divNegativeTabindex = document.createElement("div");
    divNegativeTabindex.setAttribute("tabindex", "-1");

    expect(isFocusable(btn)).toBe(true);
    expect(isFocusable(disabledBtn)).toBe(false);
    expect(isFocusable(div)).toBe(false);
    expect(isFocusable(divTabindex)).toBe(true);
    expect(isFocusable(divNegativeTabindex)).toBe(false);
  });

  it("getFocusableElements returns only visible focusable elements", () => {
    const container = document.createElement("div");
    const btn1 = document.createElement("button");
    const btnHidden = document.createElement("button");
    Object.defineProperty(btn1, "offsetWidth", { value: 100, configurable: true });
    container.appendChild(btn1);
    container.appendChild(btnHidden);

    expect(getFocusableElements(container)).toEqual([btn1]);
  });

  it("trapFocus cycles focus between first and last focusable elements", () => {
    const container = document.createElement("div");
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("button");
    Object.defineProperty(btn1, "offsetWidth", { value: 100, configurable: true });
    Object.defineProperty(btn2, "offsetWidth", { value: 100, configurable: true });
    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);

    const cleanup = trapFocus(container);
    expect(document.activeElement).toBe(btn1);

    btn2.focus();
    const tabForward = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
    container.dispatchEvent(tabForward);
    expect(document.activeElement).toBe(btn1);

    const tabBackward = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
    });
    container.dispatchEvent(tabBackward);
    expect(document.activeElement).toBe(btn2);

    cleanup();
  });

  it("ariaInvalid returns aria-invalid and optional aria-describedby", () => {
    expect(ariaInvalid(true, "err-1")).toEqual({
      "aria-invalid": true,
      "aria-describedby": "err-1",
    });
    expect(ariaInvalid(false)).toEqual({
      "aria-invalid": false,
    });
  });

  it("prefersReducedMotion reads window.matchMedia", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(prefersReducedMotion()).toBe(true);
  });

  it("isVisible checks element dimensions", () => {
    const el = document.createElement("div");
    expect(isVisible(el)).toBe(false);

    Object.defineProperty(el, "offsetWidth", { value: 100, configurable: true });
    expect(isVisible(el)).toBe(true);
  });

  it("saveFocus stores and restores previous active element", () => {
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    btn.focus();
    expect(document.activeElement).toBe(btn);

    const restore = saveFocus();
    const otherBtn = document.createElement("button");
    document.body.appendChild(otherBtn);
    otherBtn.focus();
    expect(document.activeElement).toBe(otherBtn);

    restore();
    expect(document.activeElement).toBe(btn);
  });

  it("focusFirstError focuses the first element marked with aria-invalid=true", () => {
    const form = document.createElement("form");
    const input1 = document.createElement("input");
    const input2 = document.createElement("input");
    input2.setAttribute("aria-invalid", "true");
    form.appendChild(input1);
    form.appendChild(input2);
    document.body.appendChild(form);

    focusFirstError(form);
    expect(document.activeElement).toBe(input2);
  });

  it("announceToScreenReader creates a live assertive/polite region and cleans up", () => {
    vi.useFakeTimers();
    announceToScreenReader("Order placed successfully", "assertive");

    const liveEl = document.querySelector('[role="status"]');
    expect(liveEl).not.toBeNull();
    expect(liveEl?.getAttribute("aria-live")).toBe("assertive");
    expect(liveEl?.textContent).toBe("Order placed successfully");

    vi.advanceTimersByTime(1100);
    expect(document.querySelector('[role="status"]')).toBeNull();
    vi.useRealTimers();
  });
});
