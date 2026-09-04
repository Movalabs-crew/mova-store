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
});
