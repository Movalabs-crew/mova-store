#!/usr/bin/env node
/**
 * Fail when two tracked paths differ only by letter case.
 *
 * Linux materialises both entries as two files, so Vitest runs the same suite
 * twice; macOS collapses them into one, so a local edit touches only one name
 * and produces a phantom diff. Keeping one canonical path avoids both.
 *
 * Usage: node scripts/check-case-collisions.mjs
 */
import { execFileSync } from "node:child_process";

/** @returns {string[]} every tracked path, case preserved. */
function trackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  return out.split("\0").filter(Boolean);
}

const groups = new Map();
for (const path of trackedFiles()) {
  const key = path.toLowerCase();
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(path);
}

const collisions = [...groups.entries()].filter(
  ([, paths]) => new Set(paths).size > 1,
);

if (collisions.length === 0) {
  console.log(`No case-colliding tracked paths (${groups.size} paths checked).`);
  process.exit(0);
}

console.error("Case-colliding tracked paths found:\n");
for (const [key, paths] of collisions) {
  console.error(`  ${key}`);
  for (const path of paths) console.error(`    - ${path}`);
}
console.error(
  "\nKeep one canonical filename and delete the twin so checkouts behave the same on every OS.",
);
process.exit(1);
