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
 * Common keyboard keys used for navigation (consumed by trapFocus and keyboard handlers).
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
 * Checks if an element is focusable (used by getFocusableElements and trapFocus).
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
 * Gets all focusable elements within a container (used by trapFocus).
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
 * Checks if an element is visible (used by getFocusableElements).
 */
export function isVisible(element: HTMLElement): boolean {
  return !!(
    element.offsetWidth ||
    element.offsetHeight ||
    element.getClientRects().length
  );
}

/**
 * Traps focus within a container (used by Modal and Navbar mobile drawer).
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
 * Creates ARIA props for an invalid form field (used by checkout form fields).
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
 * Announces a message to screen readers via a polite or assertive live region
 * (used by OrderCard clipboard actions).
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite"
): void {
  if (typeof document === "undefined") return;
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    if (announcement.parentNode) {
      announcement.parentNode.removeChild(announcement);
    }
  }, 1000);
}

// =============================================================================
// Focus Management
// =============================================================================

/**
 * Saves the currently focused element and returns a function to restore it
 * (used by Modal).
 */
export function saveFocus(): () => void {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  return () => {
    previouslyFocused?.focus();
  };
}

/**
 * Moves focus to the first error in a form (used by checkout validation).
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
 * Checks if user prefers reduced motion (used by Navbar in-page scrolling).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
