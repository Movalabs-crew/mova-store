/**
 * Type environment for the test suite (#465).
 *
 * `tsconfig.json` excludes `tests/`, so these files were never seen by
 * `tsc --noEmit`. `tsconfig.test.json` pulls them into their own program; this
 * file supplies the two ambient type surfaces a test file needs and that the
 * application tsconfig gets from elsewhere:
 *
 *  1. `vitest/globals` — the suite runs with `globals: true` in vitest.config.ts,
 *     so `describe` / `it` / `expect` are ambient in several test files that do
 *     not import them.
 *  2. `@testing-library/jest-dom/vitest` — the matcher augmentations
 *     (`toBeInTheDocument`, `toHaveAttribute`, …) that `tests/setup.ts` registers
 *     at runtime. The package's default entry augments Jest's matcher interface,
 *     not Vitest's, so the `/vitest` entry is the one whose types apply here.
 *
 * This is a declaration file only: it is compiled for types and emits nothing,
 * so it cannot change test behaviour.
 */
/// <reference types="vitest/globals" />
import "@testing-library/jest-dom/vitest";
