import { describe, it, expect, beforeEach } from "vitest";
import {
  isFocusable,
  getFocusableElements,
  isVisible,
  trapFocus,
  ariaInvalid,
  saveFocus,
  focusFirstError,
} from "../../lib/accessibility";

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

  it("ariaInvalid generator works as expected", () => {
    expect(ariaInvalid(true, "err-1")).toEqual({
      "aria-invalid": true,
      "aria-describedby": "err-1",
    });
    expect(ariaInvalid(false)).toEqual({
      "aria-invalid": false,
    });
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

  it("getFocusableElements returns visible focusable elements", () => {
    const container = document.createElement("div");
    const btn = document.createElement("button");
    const disabledBtn = document.createElement("button");
    disabledBtn.disabled = true;
    container.appendChild(btn);
    container.appendChild(disabledBtn);
    document.body.appendChild(container);

    Object.defineProperty(btn, "offsetWidth", { value: 100, configurable: true });
    Object.defineProperty(btn, "offsetHeight", { value: 40, configurable: true });

    const elements = getFocusableElements(container);
    expect(elements).toContain(btn);
    expect(elements).not.toContain(disabledBtn);
  });

  it("trapFocus cycles focus within the container", () => {
    const container = document.createElement("div");
    const first = document.createElement("button");
    const last = document.createElement("button");
    container.appendChild(first);
    container.appendChild(last);
    document.body.appendChild(container);

    for (const el of [first, last]) {
      Object.defineProperty(el, "offsetWidth", { value: 100, configurable: true });
      Object.defineProperty(el, "offsetHeight", { value: 40, configurable: true });
    }

    const release = trapFocus(container);
    last.focus();
    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
    container.dispatchEvent(event);
    expect(document.activeElement).toBe(first);
    release();
  });
});
