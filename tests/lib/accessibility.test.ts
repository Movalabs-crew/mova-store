import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isFocusable,
  getFocusableElements,
  isVisible,
  trapFocus,
  announceToScreenReader,
  saveFocus,
  focusFirstError,
  prefersReducedMotion,
  getAnimationDuration,
  generateAriaId,
  ariaExpanded,
  ariaLive,
  ariaInvalid,
  Keys,
  srOnlyStyles,
  meetsContrastRequirement,
} from "../../lib/accessibility";

describe("lib/accessibility", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("Keys constants", () => {
    it("defines standard navigation key values", () => {
      expect(Keys.ENTER).toBe("Enter");
      expect(Keys.SPACE).toBe(" ");
      expect(Keys.ESCAPE).toBe("Escape");
      expect(Keys.TAB).toBe("Tab");
      expect(Keys.ARROW_UP).toBe("ArrowUp");
      expect(Keys.ARROW_DOWN).toBe("ArrowDown");
      expect(Keys.ARROW_LEFT).toBe("ArrowLeft");
      expect(Keys.ARROW_RIGHT).toBe("ArrowRight");
      expect(Keys.HOME).toBe("Home");
      expect(Keys.END).toBe("End");
    });
  });

  describe("isFocusable", () => {
    it("returns false for non-HTMLElement", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      expect(isFocusable(svg as unknown as Element)).toBe(false);
    });

    it("returns false for disabled form elements", () => {
      const btn = document.createElement("button");
      btn.disabled = true;
      expect(isFocusable(btn)).toBe(false);

      const input = document.createElement("input");
      input.disabled = true;
      expect(isFocusable(input)).toBe(false);
    });

    it("returns false for negative tabindex", () => {
      const div = document.createElement("div");
      div.setAttribute("tabindex", "-1");
      expect(isFocusable(div)).toBe(false);

      const btn = document.createElement("button");
      btn.setAttribute("tabindex", "-1");
      expect(isFocusable(btn)).toBe(false);
    });

    it("returns true for naturally focusable elements", () => {
      const a = document.createElement("a");
      const btn = document.createElement("button");
      const input = document.createElement("input");
      const select = document.createElement("select");
      const textarea = document.createElement("textarea");

      expect(isFocusable(a)).toBe(true);
      expect(isFocusable(btn)).toBe(true);
      expect(isFocusable(input)).toBe(true);
      expect(isFocusable(select)).toBe(true);
      expect(isFocusable(textarea)).toBe(true);
    });

    it("returns true for non-form elements with non-negative tabindex", () => {
      const div = document.createElement("div");
      div.setAttribute("tabindex", "0");
      expect(isFocusable(div)).toBe(true);

      const span = document.createElement("span");
      span.setAttribute("tabindex", "1");
      expect(isFocusable(span)).toBe(true);
    });

    it("returns false for standard plain elements without tabindex", () => {
      const div = document.createElement("div");
      const span = document.createElement("span");
      const p = document.createElement("p");
      expect(isFocusable(div)).toBe(false);
      expect(isFocusable(span)).toBe(false);
      expect(isFocusable(p)).toBe(false);
    });
  });

  describe("isVisible", () => {
    it("returns true if offsetWidth or offsetHeight is positive", () => {
      const div = document.createElement("div");
      Object.defineProperty(div, "offsetWidth", { configurable: true, value: 100 });
      expect(isVisible(div)).toBe(true);

      const div2 = document.createElement("div");
      Object.defineProperty(div2, "offsetHeight", { configurable: true, value: 50 });
      expect(isVisible(div2)).toBe(true);
    });

    it("returns true if getClientRects returns entries", () => {
      const div = document.createElement("div");
      Object.defineProperty(div, "getClientRects", {
        configurable: true,
        value: () => [{ width: 10, height: 10 }] as unknown as DOMRectList,
      });
      expect(isVisible(div)).toBe(true);
    });

    it("returns false if dimensions and clientRects are empty", () => {
      const div = document.createElement("div");
      expect(isVisible(div)).toBe(false);
    });
  });

  describe("getFocusableElements", () => {
    it("finds and filters visible and focusable elements within container", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <a href="#test" id="link">Link</a>
        <button id="btn1">Button 1</button>
        <button id="btn-disabled" disabled>Disabled</button>
        <input id="input1" type="text" />
        <select id="select1"><option>Opt</option></select>
        <textarea id="text1"></textarea>
        <div id="tabindex-div" tabindex="0">Focusable Div</div>
        <div id="tabindex-neg" tabindex="-1">Hidden Div</div>
        <button id="btn-hidden">Hidden</button>
      `;
      document.body.appendChild(container);

      // Make elements visible by default in jsdom
      const allEls = container.querySelectorAll<HTMLElement>("*");
      allEls.forEach((el) => {
        if (el.id === "btn-hidden") {
          Object.defineProperty(el, "offsetWidth", { configurable: true, value: 0 });
          Object.defineProperty(el, "offsetHeight", { configurable: true, value: 0 });
        } else {
          Object.defineProperty(el, "offsetWidth", { configurable: true, value: 50 });
          Object.defineProperty(el, "offsetHeight", { configurable: true, value: 20 });
        }
      });

      const focusable = getFocusableElements(container);
      const ids = focusable.map((el) => el.id);

      expect(ids).toEqual(["link", "btn1", "input1", "select1", "text1", "tabindex-div"]);
      expect(ids).not.toContain("btn-disabled");
      expect(ids).not.toContain("tabindex-neg");
      expect(ids).not.toContain("btn-hidden");
    });
  });

  describe("trapFocus", () => {
    it("focuses first element and traps Tab / Shift+Tab cycling, cleaning up on return", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <button id="first">First</button>
        <button id="middle">Middle</button>
        <button id="last">Last</button>
      `;
      document.body.appendChild(container);

      const buttons = container.querySelectorAll<HTMLElement>("button");
      buttons.forEach((b) => {
        Object.defineProperty(b, "offsetWidth", { configurable: true, value: 50 });
        Object.defineProperty(b, "offsetHeight", { configurable: true, value: 20 });
      });

      const cleanup = trapFocus(container);

      const first = document.getElementById("first") as HTMLButtonElement;
      const middle = document.getElementById("middle") as HTMLButtonElement;
      const last = document.getElementById("last") as HTMLButtonElement;

      expect(document.activeElement).toBe(first);

      // Tab on last element -> wraps to first
      last.focus();
      expect(document.activeElement).toBe(last);

      const tabEvent = new KeyboardEvent("keydown", {
        key: Keys.TAB,
        shiftKey: false,
        bubbles: true,
        cancelable: true,
      });
      container.dispatchEvent(tabEvent);
      expect(tabEvent.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(first);

      // Shift+Tab on first element -> wraps to last
      first.focus();
      expect(document.activeElement).toBe(first);

      const shiftTabEvent = new KeyboardEvent("keydown", {
        key: Keys.TAB,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      container.dispatchEvent(shiftTabEvent);
      expect(shiftTabEvent.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(last);

      // Other keys do nothing
      middle.focus();
      const enterEvent = new KeyboardEvent("keydown", {
        key: Keys.ENTER,
        bubbles: true,
        cancelable: true,
      });
      container.dispatchEvent(enterEvent);
      expect(enterEvent.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(middle);

      // Cleanup removes listener
      cleanup();
      last.focus();
      const afterCleanupTab = new KeyboardEvent("keydown", {
        key: Keys.TAB,
        shiftKey: false,
        bubbles: true,
        cancelable: true,
      });
      container.dispatchEvent(afterCleanupTab);
      expect(afterCleanupTab.defaultPrevented).toBe(false);
    });
  });

  describe("announceToScreenReader", () => {
    it("creates polite role=status alert div and removes it after 1000ms", () => {
      vi.useFakeTimers();

      announceToScreenReader("Order placed successfully");

      const announcement = document.body.querySelector('[role="status"]');
      expect(announcement).not.toBeNull();
      expect(announcement?.textContent).toBe("Order placed successfully");
      expect(announcement?.getAttribute("aria-live")).toBe("polite");
      expect(announcement?.getAttribute("aria-atomic")).toBe("true");
      expect(announcement?.className).toContain("sr-only");

      vi.advanceTimersByTime(1000);

      expect(document.body.querySelector('[role="status"]')).toBeNull();
    });

    it("respects assertive priority", () => {
      vi.useFakeTimers();

      announceToScreenReader("Error occurred", "assertive");

      const announcement = document.body.querySelector('[role="status"]');
      expect(announcement?.getAttribute("aria-live")).toBe("assertive");

      vi.advanceTimersByTime(1000);
      expect(document.body.querySelector('[role="status"]')).toBeNull();
    });
  });

  describe("saveFocus", () => {
    it("captures activeElement and restores focus when returned function is called", () => {
      const btn = document.createElement("button");
      const input = document.createElement("input");
      document.body.appendChild(btn);
      document.body.appendChild(input);

      btn.focus();
      expect(document.activeElement).toBe(btn);

      const restore = saveFocus();

      input.focus();
      expect(document.activeElement).toBe(input);

      restore();
      expect(document.activeElement).toBe(btn);
    });
  });

  describe("focusFirstError", () => {
    it("moves focus to the first element with aria-invalid='true'", () => {
      const form = document.createElement("form");
      form.innerHTML = `
        <input id="valid" type="text" />
        <input id="invalid-1" type="text" aria-invalid="true" />
        <input id="invalid-2" type="text" aria-invalid="true" />
      `;
      document.body.appendChild(form);

      focusFirstError(form);

      const invalid1 = document.getElementById("invalid-1");
      expect(document.activeElement).toBe(invalid1);
    });

    it("does nothing when no invalid element exists", () => {
      const form = document.createElement("form");
      form.innerHTML = `<input id="valid" type="text" />`;
      document.body.appendChild(form);

      const valid = document.getElementById("valid") as HTMLInputElement;
      valid.focus();

      focusFirstError(form);
      expect(document.activeElement).toBe(valid);
    });
  });

  describe("prefersReducedMotion & getAnimationDuration", () => {
    it("returns boolean according to window.matchMedia", () => {
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

      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(prefersReducedMotion()).toBe(false);
      expect(getAnimationDuration(300)).toBe(300);
    });
  });

  describe("ARIA helpers", () => {
    it("generateAriaId produces unique ids with prefix", () => {
      const id1 = generateAriaId("modal");
      const id2 = generateAriaId("modal");
      expect(id1.startsWith("modal-")).toBe(true);
      expect(id2.startsWith("modal-")).toBe(true);
      expect(id1).not.toBe(id2);

      const defaultId = generateAriaId();
      expect(defaultId.startsWith("aria-")).toBe(true);
    });

    it("ariaExpanded produces aria-expanded and aria-controls attributes", () => {
      expect(ariaExpanded(true, "panel-1")).toEqual({
        "aria-expanded": true,
        "aria-controls": "panel-1",
      });
      expect(ariaExpanded(false, "panel-2")).toEqual({
        "aria-expanded": false,
        "aria-controls": "panel-2",
      });
    });

    it("ariaLive produces aria-live and aria-atomic attributes", () => {
      expect(ariaLive()).toEqual({
        "aria-live": "polite",
        "aria-atomic": true,
      });
      expect(ariaLive("assertive")).toEqual({
        "aria-live": "assertive",
        "aria-atomic": true,
      });
    });

    it("ariaInvalid formats invalid state and describes errorId if provided", () => {
      expect(ariaInvalid(true, "err-msg")).toEqual({
        "aria-invalid": true,
        "aria-describedby": "err-msg",
      });
      expect(ariaInvalid(false)).toEqual({
        "aria-invalid": false,
      });
      expect(ariaInvalid(false, "err-msg")).toEqual({
        "aria-invalid": false,
      });
    });
  });

  describe("Color contrast & srOnlyStyles", () => {
    it("meetsContrastRequirement returns boolean", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(meetsContrastRequirement("#000000", "#ffffff")).toBe(true);
      warnSpy.mockRestore();
    });

    it("srOnlyStyles contains css class definitions", () => {
      expect(srOnlyStyles).toContain(".sr-only");
      expect(srOnlyStyles).toContain("position: absolute");
    });
  });
});
