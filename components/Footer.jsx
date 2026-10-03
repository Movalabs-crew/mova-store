"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-mova-deep via-purple-700 to-purple-600 py-2 text-white">
      <section className="container mx-auto flex min-h-28 flex-col items-center justify-between gap-2 py-4 text-center font-normal sm:flex-row sm:gap-0 sm:divide-x-2 sm:divide-white/30 sm:py-0">
        <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm sm:my-0 sm:gap-2 sm:pl-4">
          <Link href="/terms" className="transition hover:underline hover:underline-offset-1">
            Terms of Use
          </Link>
          <Link href="/privacy" className="transition hover:underline hover:underline-offset-1">
            Privacy Policy
          </Link>
          <Link href="/about" className="transition hover:underline hover:underline-offset-1">
            About Us
          </Link>
          <Link href="/contact" className="transition hover:underline hover:underline-offset-1">
            Contact Us
          </Link>
        </span>
        <span className="my-2 sm:my-0 sm:pl-10">
          &copy; {new Date().getFullYear()} Mova Store. All rights reserved.
        </span>
      </section>
    </footer>
  );
}
