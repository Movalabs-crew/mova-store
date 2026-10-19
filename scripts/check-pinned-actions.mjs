#!/usr/bin/env node
/**
 * Enforces that every third-party `uses:` in .github/workflows is pinned to an
 * immutable ref.
 *
 * A branch (`master`) or a floating major tag (`v4`) is mutable: moving it
 * upstream changes what runs in this repository with no review. Every action
 * must therefore reference a full 40-character commit SHA, with a `# vX.Y.Z`
 * comment recording the version that SHA corresponds to.
 *
 * Local actions (`./path`) and digest references (`docker://...@sha256:...`)
 * are not third-party Git refs and are allowed.
 *
 * Run with `node scripts/check-pinned-actions.mjs`; CI fails on any violation.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const WORKFLOWS = join(ROOT, ".github", "workflows");
const COMMIT_SHA = /^[0-9a-f]{40}$/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.ya?ml$/.test(entry)) out.push(full);
  }
  return out;
}

const problems = [];
let checked = 0;

for (const file of walk(WORKFLOWS)) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    const match = line.match(/^\s*(?:-\s*)?uses:\s*(\S+)/);
    if (!match) return;

    const ref = match[1].replace(/^["']|["']$/g, "");
    if (ref.startsWith("./") || ref.startsWith("docker://")) return;

    checked += 1;
    const at = ref.lastIndexOf("@");
    const pin = at >= 0 ? ref.slice(at + 1) : "";
    if (!COMMIT_SHA.test(pin)) {
      problems.push(
        `${rel}:${index + 1}  ${ref}\n      expected <owner>/<repo>@<40-char commit sha> # vX.Y.Z`
      );
    }
  });
}

if (problems.length > 0) {
  console.error(`Unpinned workflow action(s) found (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("\nPin each action to a full commit SHA and record the version in a comment.");
  process.exit(1);
}

console.log(`workflow action pins: ${checked} action reference(s) are immutable.`);
