/**
 * Accessibility Utilities
 *
 * Helper functions and constants for improving accessibility
 * throughout the Mova Store application.
 */

// =============================================================================
// Keyboard Navigation
// =============================================================================

/**
 * Common keyboard keys used for navigation.
 */
export const Keys = {
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
  TAB: "Tab",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
} as const;

/**
 * Checks if an element is focusable.
 */
export function isFocusable(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;

  // Check if element is disabled
  if ((element as HTMLButtonElement).disabled) return false;

  // Check tabindex
  const tabindex = element.getAttribute("tabindex");
  if (tabindex && parseInt(tabindex) < 0) return false;

  // Check for naturally focusable elements
  const focusableTags = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"];
  if (focusableTags.includes(element.tagName)) return true;

  // Check for elements with positive tabindex
  if (tabindex && parseInt(tabindex) >= 0) return true;

  return false;
}

/**
 * Gets all focusable elements within a container.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  return Array.from(elements).filter(
    (el) => isFocusable(el) && isVisible(el as HTMLElement)
  ) as HTMLElement[];
}

/**
 * Checks if an element is visible.
 */
export function isVisible(element: HTMLElement): boolean {
  return !!(
    element.offsetWidth ||
    element.offsetHeight ||
    element.getClientRects().length
  );
}

/**
 * Traps focus within a container (useful for modals).
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== Keys.TAB) return;

    // Re-query focusable elements on each Tab so dynamically added or
    // removed controls (e.g. a submit button that becomes disabled) are
    // respected and focus cannot escape the container.
    const currentFocusable = getFocusableElements(container);
    const first = currentFocusable[0];
    const last = currentFocusable[currentFocusable.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: go backwards
      if (document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
    } else {
      // Tab: go forwards
      if (document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  };

  container.addEventListener("keydown", handleKeyDown);

  // Focus first element
  firstElement?.focus();

  // If focus is moved outside the container (e.g. by a click on the
  // background or programmatically), pull it back in.
  const handleFocusIn = (event: FocusEvent) => {
    if (!container.contains(event.target as Node)) {
      const currentFocusable = getFocusableElements(container);
      (currentFocusable[0] ?? container).focus();
    }
  };

  document.addEventListener("focusin", handleFocusIn);

  // Return cleanup function
  return () => {
    container.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("focusin", handleFocusIn);
  };
}

// =============================================================================
// ARIA Helpers
// =============================================================================

/**
 * Adds an Escape key handler to a container (useful for modals/dialogs).
 * Returns a cleanup function to remove the listener.
 */
export function handleEscape(
  container: HTMLElement,
  onEscape: () => void
): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === Keys.ESCAPE) {
      event.stopPropagation();
      onEscape();
    }
  };

  container.addEventListener("keydown", handleKeyDown);
  return () => container.removeEventListener("keydown", handleKeyDown);
}

/**
 * Generates a unique ID for ARIA relationships.
 */
export function generateAriaId(prefix = "aria"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Creates ARIA props for a button that controls expandable content.
 */
export function ariaExpanded(isExpanded: boolean, controlsId: string) {
  return {
    "aria-expanded": isExpanded,
    "aria-controls": controlsId,
  };
}

/**
 * Creates ARIA props for a live region (for screen reader announcements).
 */
export function ariaLive(priority: "polite" | "assertive" = "polite") {
  return {
    "aria-live": priority,
    "aria-atomic": true,
  };
}

/**
 * Creates ARIA props for an invalid form field.
 */
export function ariaInvalid(
  isInvalid: boolean,
  errorId?: string
): Record<string, string | boolean> {
  const props: Record<string, string | boolean> = {
    "aria-invalid": isInvalid,
  };

  if (isInvalid && errorId) {
    props["aria-describedby"] = errorId;
  }

  return props;
}

// =============================================================================
// Screen Reader Utilities
// =============================================================================

/**
 * Announces a message to screen readers.
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite"
): void {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * CSS class for visually hidden but screen-reader accessible content.
 * Include this in your global CSS or Tailwind config.
 */
export const srOnlyStyles = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
`;

// =============================================================================
// Focus Management
// =============================================================================

/**
 * Saves the currently focused element and returns a function to restore it.
 */
export function saveFocus(): () => void {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  return () => {
    previouslyFocused?.focus();
  };
}

/**
 * Ensures the container is focusable (adds tabindex="-1" if needed) and
 * moves focus to it. Useful for dialogs that have no focusable children.
 */
export function focusContainer(container: HTMLElement): void {
  if (!container.hasAttribute("tabindex")) {
    container.setAttribute("tabindex", "-1");
  }
  container.focus();
}

/**
 * Moves focus to the first error in a form.
 */
/**
 * Moves focus to the first error in a form.
 */
export function focusFirstError(container: HTMLElement): void {
  const errorElement = container.querySelector('[aria-invalid="true"]');
  if (errorElement instanceof HTMLElement) {
    errorElement.focus();
  }
}

// =============================================================================
// Reduced Motion
// =============================================================================

/**
 * Checks if user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Gets animation duration respecting reduced motion preference.
 */
export function getAnimationDuration(normalDuration: number): number {
  return prefersReducedMotion() ? 0 : normalDuration;
}

// =============================================================================
// Color Contrast
// =============================================================================

const HEX_COLOR_RE = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR_RE =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(?:0|1|\d*\.\d+|\d+%)\s*)?\)$/i;

function parseHexColor(input: string): [number, number, number] | null {
  const trimmed = input.trim();

  const rgbMatch = RGB_COLOR_RE.exec(trimmed);
  if (rgbMatch) {
    const channels = [rgbMatch[1], rgbMatch[2], rgbMatch[3]].map((c) =>
      parseInt(c, 10)
    );
    if (channels.some((c) => c < 0 || c > 255)) return null;
    return [channels[0], channels[1], channels[2]];
  }

  if (!HEX_COLOR_RE.test(trimmed)) return null;

  let cleaned = trimmed.replace(/^#/, "");
  if (cleaned.length === 3 || cleaned.length === 4) {
    cleaned = cleaned
      .slice(0, 3)
      .split("")
      .map((c) => c + c)
      .join("");
  } else if (cleaned.length === 8) {
    cleaned = cleaned.slice(0, 6);
  }

  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return null;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getChannelLuminance(val: number): number {
  const sRGB = val / 255;
  return sRGB <= 0.04045
    ? sRGB / 12.92
    : Math.pow((sRGB + 0.055) / 1.055, 2.4);
}

/**
 * Calculates the relative luminance of an sRGB color.
 *
 * Returns `NaN` for input that is not a parsable 3- or 6-digit hex colour.
 * Callers must not treat that as black: an unreadable colour has no luminance,
 * and `meetsContrastRequirement` already fails closed on a non-finite ratio.
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = parseHexColor(hex);
  if (!rgb) return NaN;
  const [r, g, b] = rgb.map(getChannelLuminance);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates the contrast ratio between two colors.
 */
export function getContrastRatio(foreground: string, background: string): number {
  const l1 = getRelativeLuminance(foreground);
  const l2 = getRelativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if a color combination meets WCAG AA contrast requirements.
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text.
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  largeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  // Fail closed: a colour this helper cannot parse has no meaningful ratio, and
  // a compliance check must never certify what it could not compute. Previously
  // an invalid colour inherited black's luminance of 0, so
  // meetsContrastRequirement("not-a-color", "#ffffff") reported a 21:1 pass.
  if (!Number.isFinite(ratio)) return false;
  const threshold = largeText ? 3.0 : 4.5;
  return ratio >= threshold;
}
