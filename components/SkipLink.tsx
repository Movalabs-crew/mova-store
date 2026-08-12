"use client";

/**
 * SkipLink Component
 *
 * Provides a hidden link that becomes visible on focus, allowing
 * keyboard users to skip navigation and go directly to main content.
 *
 * Usage:
 * 1. Add <SkipLink /> at the beginning of your layout
 * 2. Add id="main-content" to your main content wrapper
 *
 * Example:
 * ```tsx
 * <body>
 *   <SkipLink />
 *   <nav>...</nav>
 *   <main id="main-content">...</main>
 * </body>
 * ```
 */
export default function SkipLink({
  href = "#main-content",
  children = "Skip to main content",
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="
        sr-only focus:not-sr-only
        focus:fixed focus:top-4 focus:left-4 focus:z-[100]
        focus:px-4 focus:py-2 focus:rounded-lg
        focus:bg-purple-600 focus:text-white focus:font-medium
        focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2
        transition-transform
      "
    >
      {children}
    </a>
  );
}

/**
 * SkipLinks Component
 *
 * Multiple skip links for complex pages with multiple sections.
 */
export function SkipLinks({
  links,
}: {
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <nav aria-label="Skip links" className="sr-only focus-within:not-sr-only">
      <ul className="fixed top-4 left-4 z-[100] flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="
                sr-only focus:not-sr-only
                focus:block focus:px-4 focus:py-2 focus:rounded-lg
                focus:bg-purple-600 focus:text-white focus:font-medium
                focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2
              "
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
