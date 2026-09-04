"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-mova-deep via-purple-700 to-purple-600 py-2 text-white">
      <section className="container mx-auto flex h-28 flex-col items-center justify-between divide-black text-center font-normal sm:flex-row sm:divide-x-2 sm:divide-white/30">
        <span className="my-10 hidden gap-2 text-sm sm:my-0 sm:flex">
          <Link href="/" className="transition hover:underline hover:underline-offset-1">
            Term of use
          </Link>
          <Link href="/" className="transition hover:underline hover:underline-offset-1">
            Privacy Policy
          </Link>
          <Link href="/" className="transition hover:underline hover:underline-offset-1">
            About us
          </Link>
          <Link href="/" className="transition hover:underline hover:underline-offset-1">
            24/7 Customer Service
          </Link>
        </span>
        <span className="my-10 sm:my-0 sm:pl-10">
          &copy; {new Date().getFullYear()} Mova Store. All rights reserved.
        </span>
      </section>
    </footer>
  );
}
