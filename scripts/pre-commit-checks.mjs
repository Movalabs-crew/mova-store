#!/usr/bin/env node
/**
 * Formats and lints the files staged for the current commit.
 *
 * This is the body of the `pre-commit` hook installed by
 * `scripts/setup-git-hooks.mjs`. It uses the Prettier and ESLint that already
 * ship in `devDependencies`, so no additional tooling is required.
 *
 * Steps:
 *   1. collect the staged files (Added/Copied/Modified/Renamed, not Deleted)
 *   2. run Prettier over the formattable ones
 *   3. run ESLint --fix over the JS/TS ones; fail the commit if errors remain
 *   4. re-stage everything the tools rewrote so the fixes are part of the commit
 */

import { execFileSync } from "node:child_process";

const FORMATTABLE = /\.(js|jsx|ts|tsx|json|md|css)$/;
const LINTABLE = /\.(js|jsx|ts|tsx)$/;
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

/** Runs a tool from `node_modules/.bin`, failing loudly when it is missing. */
function run(bin, args) {
  execFileSync(NPX, ["--no-install", bin, ...args], { stdio: "inherit" });
}

const staged = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
  encoding: "utf8",
})
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

if (staged.length === 0) {
  process.exit(0);
}

const toFormat = staged.filter((file) => FORMATTABLE.test(file));
const toLint = staged.filter((file) => LINTABLE.test(file));

if (toFormat.length > 0) {
  run("prettier", ["--write", ...toFormat]);
}

let lintFailed = false;
if (toLint.length > 0) {
  try {
    run("eslint", ["--fix", ...toLint]);
  } catch {
    lintFailed = true;
  }
}

// Fold the formatter/linter rewrites back into the index so they are included
// in the commit that is being created rather than left as unstaged noise.
if (toFormat.length > 0 || toLint.length > 0) {
  execFileSync("git", ["add", "--", ...staged], { stdio: "inherit" });
}

if (lintFailed) {
  console.error(
    "\npre-commit: ESLint reported errors it could not fix automatically. Commit aborted."
  );
  process.exit(1);
}
