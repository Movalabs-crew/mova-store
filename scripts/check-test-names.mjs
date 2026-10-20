#!/usr/bin/env node
/**
 * Enforces the repository test-file naming convention.
 *
 * A test file lives under `tests/` (or `__tests__/`) and is named:
 *
 *   <kebab-case-stem>.test.ts
 *   <kebab-case-stem>.test.tsx
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

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "out",
  "dist",
  "coverage",
  "target",
  "contracts",
]);
const TEST_FILE = /\.(test|spec)\.(js|jsx|ts|tsx)$/;
const VALID_NAME = /^[a-z0-9]+(?:[-.][a-z0-9]+)*\.(test|spec)\.tsx?$/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (TEST_FILE.test(entry)) out.push(relative(ROOT, full).split(sep).join("/"));
  }
  return out;
}

const files = walk(ROOT);
const problems = [];
const seenStems = new Map();

for (const file of files) {
  const dir = file.slice(0, file.length - file.split("/").pop().length);
  const base = file.split("/").pop();

  if (!VALID_NAME.test(base)) {
    problems.push(`${file}\n      expected <kebab-case-stem>.test.ts|.test.tsx`);
    continue;
  }

  const stem = base.replace(/\.(test|spec)\.tsx?$/, "").toLowerCase();
  const key = `${dir}${stem}`;
  if (seenStems.has(key)) {
    problems.push(`${file}\n      duplicate stem in ${dir || "./"}: also ${seenStems.get(key)}`);
  } else {
    seenStems.set(key, file);
  }
}

if (problems.length > 0) {
  console.error(`Test file naming convention violations (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("\nSee CONTRIBUTING.md -> Testing Guidelines for the convention.");
  process.exit(1);
}

console.log(`test naming: ${files.length} test file(s) conform.`);
