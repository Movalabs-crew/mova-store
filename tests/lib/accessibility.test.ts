import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isFocusable,
  getFocusableElements,
  isVisible,
  trapFocus,
  generateAriaId,
  ariaExpanded,
  ariaLive,
  ariaInvalid,
  announceToScreenReader,
  saveFocus,
  focusFirstError,
  prefersReducedMotion,
  getAnimationDuration,
  getRelativeLuminance,
  getContrastRatio,
  meetsContrastRequirement,
} from "../../lib/accessibility";

describe("Accessibility - Color Contrast & Luminance (#39)", () => {
  it("calculates relative luminance correctly", () => {
    expect(getRelativeLuminance("#000000")).toBe(0);
    expect(getRelativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("calculates contrast ratio correctly", () => {
    expect(getContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(getContrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 1);
  });

  it("meetsContrastRequirement returns true for black on white", () => {
    expect(meetsContrastRequirement("#000000", "#ffffff")).toBe(true);
    expect(meetsContrastRequirement("#ffffff", "#000000")).toBe(true);
  });

  it("meetsContrastRequirement returns false for identical colors", () => {
    expect(meetsContrastRequirement("#ffffff", "#ffffff")).toBe(false);
    expect(meetsContrastRequirement("#000000", "#000000")).toBe(false);
  });

  it("meetsContrastRequirement handles ~3.8:1 pair like #828282 on #ffffff correctly with largeText flag", () => {
    // #828282 on #ffffff has a contrast ratio around ~3.84:1 (< 4.5:1, but >= 3.0:1)
    expect(meetsContrastRequirement("#828282", "#ffffff", false)).toBe(false);
    expect(meetsContrastRequirement("#828282", "#ffffff", true)).toBe(true);
  });

  it("does not call console.warn when meetsContrastRequirement is executed", () => {
    const warnSpy = vi.spyOn(console, "warn");
    meetsContrastRequirement("#000000", "#ffffff");
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("fails closed on unparseable colours instead of treating them as black (#605)", () => {
    expect(Number.isNaN(getRelativeLuminance("not-a-color"))).toBe(true);
    expect(Number.isNaN(getRelativeLuminance("#12"))).toBe(true);
    expect(Number.isNaN(getRelativeLuminance("#gggggg"))).toBe(true);

    // The old behaviour defaulted an invalid colour to luminance 0, so this
    // reported a passing 21:1 ratio against white for input it could not read.
    expect(meetsContrastRequirement("not-a-color", "#ffffff")).toBe(false);
    expect(meetsContrastRequirement("#ffffff", "not-a-color")).toBe(false);
    expect(meetsContrastRequirement("not-a-color", "#ffffff", true)).toBe(false);
  });

  it("leaves valid colours unchanged (#605)", () => {
    expect(getRelativeLuminance("#000000")).toBe(0);
    expect(getRelativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(meetsContrastRequirement("#000000", "#ffffff")).toBe(true);
    expect(meetsContrastRequirement("#ffffff", "#000000")).toBe(true);
    expect(meetsContrastRequirement("#828282", "#ffffff", true)).toBe(true);
  });
  it("rejects trailing garbage in hex colours (#accessibility-contrast)", () => {
    expect(Number.isNaN(getRelativeLuminance("#12345g"))).toBe(true);
    expect(Number.isNaN(getRelativeLuminance("#ffffffzz"))).toBe(true);
    expect(getRelativeLuminance("#ffffff ")).toBeCloseTo(1, 5); // padded input is trimmed
    expect(meetsContrastRequirement("#12345g", "#ffffff")).toBe(false);
  });

  it("parses rgb() and rgba() colours (#accessibility-contrast)", () => {
    expect(getRelativeLuminance("rgb(0, 0, 0)")).toBe(0);
    expect(getRelativeLuminance("rgb(255, 255, 255)")).toBeCloseTo(1, 5);
    expect(getRelativeLuminance("rgb(255,255,255)")).toBeCloseTo(1, 5);
    expect(getRelativeLuminance("rgba(0, 0, 0, 0.5)")).toBe(0);
    expect(meetsContrastRequirement("rgb(0, 0, 0)", "rgb(255, 255, 255)")).toBe(true);
  });

  it("parses 8-digit hex colours (#accessibility-contrast)", () => {
    expect(getRelativeLuminance("#00000000")).toBe(0);
    expect(getRelativeLuminance("#ffffffff")).toBeCloseTo(1, 5);
    expect(getRelativeLuminance("#ffffff00")).toBeCloseTo(1, 5);
    expect(meetsContrastRequirement("#00000000", "#ffffffff")).toBe(true);
  });

  it("rejects malformed rgb() colours (#accessibility-contrast)", () => {
    expect(Number.isNaN(getRelativeLuminance("rgb(255, 255)"))).toBe(true);
    expect(Number.isNaN(getRelativeLuminance("rgb(255, 255, 255, 255)"))).toBe(true);
    expect(Number.isNaN(getRelativeLuminance("rgb(255, 255, 255) garbage"))).toBe(true);
  });
});

describe("Accessibility - DOM and ARIA Helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
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

  it("generateAriaId produces unique prefix IDs", () => {
    const id1 = generateAriaId("modal");
    const id2 = generateAriaId("modal");
    expect(id1.startsWith("modal-")).toBe(true);
    expect(id1).not.toBe(id2);
  });

  it("aria props generators work as expected", () => {
    expect(ariaExpanded(true, "panel-1")).toEqual({
      "aria-expanded": true,
      "aria-controls": "panel-1",
    });
    expect(ariaLive("assertive")).toEqual({
      "aria-live": "assertive",
      "aria-atomic": true,
    });
    expect(ariaInvalid(true, "err-1")).toEqual({
      "aria-invalid": true,
      "aria-describedby": "err-1",
    });
    expect(ariaInvalid(false)).toEqual({
      "aria-invalid": false,
    });
  });

  it("reduced motion helpers work with window.matchMedia", () => {
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
    expect(getAnimationDuration(300)).toBe(0);
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
