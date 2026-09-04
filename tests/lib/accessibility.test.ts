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

/**
 * jsdom does no layout: every element reports offsetWidth/Height = 0 and
 * empty getClientRects(), which would make isVisible() false for everything.
 * Give fixture elements a size, but zero size when display:none.
 */
function makeVisible(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const size = () =>
      getComputedStyle(el).display === "none" ? 0 : 100;
    Object.defineProperty(el, "offsetWidth", {
      configurable: true,
      get: size,
    });
    Object.defineProperty(el, "offsetHeight", {
      configurable: true,
      get: size,
    });
  });
}

function fixture(html: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("isFocusable", () => {
  it("accepts interactive elements and excludes disabled or negative-tabindex ones", () => {
    const root = fixture(
      '<button id="b">b</button>' +
        '<button id="bd" disabled>bd</button>' +
        '<a id="a" href="#x">a</a>' +
        '<span id="t0" tabindex="0">t0</span>' +
        '<span id="tn1" tabindex="-1">tn1</span>' +
        '<div id="d">d</div>'
    );
    makeVisible(root);
    const byId = (id: string) =>
      root.querySelector<HTMLElement>(`#${id}`)!;

    expect(isFocusable(byId("b"))).toBe(true);
    expect(isFocusable(byId("bd"))).toBe(false);
    expect(isFocusable(byId("a"))).toBe(true);
    expect(isFocusable(byId("t0"))).toBe(true);
    expect(isFocusable(byId("tn1"))).toBe(false);
    expect(isFocusable(byId("d"))).toBe(false);
  });
});

describe("getFocusableElements", () => {
  it("returns focusable elements in document order, excluding disabled/hidden", () => {
    const root = fixture(
      '<button id="b1">B1</button>' +
        '<input id="i1" />' +
        '<a id="a1" href="#x">A1</a>' +
        '<span id="s1" tabindex="0">S1</span>' +
        '<button id="b2" disabled>B2</button>' +
        '<a id="a2" href="#y" style="display:none">A2</a>' +
        '<span id="s2" tabindex="-1">S2</span>' +
        '<div id="d1">D1</div>'
    );
    makeVisible(root);

    const ids = getFocusableElements(root).map((el) => el.id);
    expect(ids).toEqual(["b1", "i1", "a1", "s1"]);
  });
});

describe("trapFocus", () => {
  it("focuses the first element and wraps Tab / Shift+Tab at the edges", () => {
    const root = fixture(
      '<button id="f1">F1</button>' +
        '<button id="f2">F2</button>' +
        '<button id="f3">F3</button>'
    );
    makeVisible(root);
    const first = root.querySelector<HTMLElement>("#f1")!;
    const last = root.querySelector<HTMLElement>("#f3")!;

    const cleanup = trapFocus(root);
    expect(document.activeElement).toBe(first);

    // Tab on the last element wraps to the first
    last.focus();
    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    root.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    // Shift+Tab on the first element wraps to the last
    const shiftTab = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    root.dispatchEvent(shiftTab);
    expect(shiftTab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);

    // cleanup removes the keydown listener
    cleanup();
    const after = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    root.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(last);
  });
});

describe("announceToScreenReader", () => {
  it("adds a role=status node, then removes it after the timeout", () => {
    vi.useFakeTimers();
    announceToScreenReader("cart updated", "assertive");

    const node = document.querySelector<HTMLElement>('[role="status"]');
    expect(node).not.toBeNull();
    expect(node!.textContent).toBe("cart updated");
    expect(node!.getAttribute("aria-live")).toBe("assertive");
    expect(node!.getAttribute("aria-atomic")).toBe("true");

    vi.advanceTimersByTime(1000);
    expect(document.querySelector('[role="status"]')).toBeNull();
  });
});

describe("saveFocus", () => {
  it("restores the previously focused element", () => {
    const first = fixture("<button id='sb1'>one</button>").querySelector<
      HTMLButtonElement
    >("#sb1")!;
    first.focus();
    const restore = saveFocus();

    const second = fixture("<button id='sb2'>two</button>").querySelector<
      HTMLButtonElement
    >("#sb2")!;
    second.focus();

    restore();
    expect(document.activeElement).toBe(first);
  });
});

describe("prefersReducedMotion", () => {
  function mockMatchMedia(matches: boolean) {
    const mql = {
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList;
    vi.spyOn(window, "matchMedia").mockReturnValue(mql);
  }

  it("honours a mocked matchMedia result and feeds getAnimationDuration", () => {
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(getAnimationDuration(300)).toBe(0);

    mockMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
    expect(getAnimationDuration(300)).toBe(300);
  });
});
