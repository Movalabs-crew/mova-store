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

    if (event.shiftKey) {
      // Shift + Tab: go backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab: go forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener("keydown", handleKeyDown);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener("keydown", handleKeyDown);
  };
}

// =============================================================================
// ARIA Helpers
// =============================================================================

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
