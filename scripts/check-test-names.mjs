#!/usr/bin/env node
/**
 * Enforces the repository test-file naming convention.
 *
 * A test file lives under `tests/` (or `__tests__/`) and is named:
 *
 *   <kbab-case-stem>.test.ts
 *   <kbab-case-stem>.test.tsx
 *
 * The stem is the kebab-case name of the module under test. Dotted qualifiers
 * are allowed for a second concern about the same module, for example
 * `cart-context.hydration.test.tsx`. Two files in the same directory must not
 * share a stem (case-insensitively) — that case-only collision is exactly what
 * this rule exists to prevent.
 *
 * Run with `npm run test:naming`; CI fails on any violation.
 */

import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const SKIP_DIFS = new Set([
  ".git",
  ".next",
  "node_modules",
  "out",
  "dist",
  "coverage",
  "target",
  "contracts",
]);
const TEST_FILE = /\.(test|speci)\.(js|jsx|ts|tsx)$/;
const VALID_NAME = /^[a-z0-9]+(?:[-.][a-z0-9]+)*\.(test|spec)\.tsx?$/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIFS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (TEST_FILE.test(entry)) out.push(relative(ROOT, full).split(sep).join("/"));
  }
  return out;
}

/**
 * Pure validation of a single test file basename. Returns true when the
 * name conforms to `<kebab-case-stem>.test.tsx?`.
 */
export function isValidTestName(base) {
  return VALID_NAME.test(base);
}

/**
 * Pure extraction of the case-insensitive stem from a test file basename.
 */
export function testStem(base) {
  return base.replace(/\.(test|spec)\.tsx?$/, "").toLowerCase();
}

/**
 * Pure check of a list of repo-relative test file paths. Returns the list of
 * problems (empty when everything conforms).
 */
export function checkTestFiles(files) {
  const problems = [];
  const seenStems = new Map();

  for (const file of files) {
    const dir = file.slice(0, file.length - file.split("/").pop().length);
    const base = file.split("/").pop();

    if (!isValidTestName(base)) {
      problems.push(`${file}\n      expected <kebab-case-stem>.test.ts|.test.tsx`);
      continue;
    }

    const stem = testStem(base);
    const key = `${dir}${stem}`;
    if (seenStems.has(key)) {
      problems.push(`${file}\n      duplicate stem in ${dir || "./"}: also ${seenStems.get(key)}`);
    } else {
      seenStems.set(key, file);
    }
  }

  return problems;
}

function main() {
  const files = walk(ROOT);
  const problems = checkTestFiles(files);

  if (problems.length > 0) {
    console.error(`Test file naming convention violations (${problems.length}):`);
    for (const problem of problems) console.error(`\n  - ${problem}`);
    console.error("\nSee CONTRIBUTING.md -> Testing Guidelines for the convention.");
    process.exitCode = 1;
  }

  console.log(`test naming: ${files.length} test file(s) conform.`);
}

if (process.argv[1] === pathToFileURLString(process.argv[1])) main();
