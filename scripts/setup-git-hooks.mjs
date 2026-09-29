#!/usr/bin/env node
/**
 * Installs this repository's git hooks.
 *
 * Runs from `npm install` through the root `prepare` script so a fresh clone
 * gets a working `pre-commit` hook with no extra setup. The hook formats and
 * lints only the files being committed (`scripts/pre-commit-checks.mjs`).
 *
 * The script is deliberately a no-op outside a git checkout (CI tarballs, the
 * npm cache, production installs) — it never fails an install.
 */

import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const HOOK_CONTENTS = `#!/bin/sh
# Installed by \`npm run prepare\` (scripts/setup-git-hooks.mjs).
# Formats and lints the files staged for this commit.
cd "$(git rev-parse --show-toplevel)" || exit 1
node scripts/pre-commit-checks.mjs
`;

/** Resolves the absolute git hooks directory, or null when not in a repo. */
function resolveHooksDir() {
  try {
    const gitPath = execFileSync("git", ["rev-parse", "--git-path", "hooks"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return gitPath ? resolve(gitPath) : null;
  } catch {
    return null;
  }
}

const hooksDir = resolveHooksDir();

if (!hooksDir) {
  console.log("prepare: no git checkout found, skipping hook installation");
  process.exit(0);
}

if (!existsSync(hooksDir)) {
  mkdirSync(hooksDir, { recursive: true });
}

const hookPath = join(hooksDir, "pre-commit");
writeFileSync(hookPath, HOOK_CONTENTS, "utf8");
chmodSync(hookPath, 0o755);
console.log(`prepare: installed pre-commit hook at ${hookPath}`);
