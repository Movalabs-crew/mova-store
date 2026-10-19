#!/usr/bin/env node
/**
 * Pull-request triage: merge status and reviewer engagement.
 *
 * Written to replace a scraper that reported two things that were not true:
 *
 *   1. No maintainer had commented on any PR.
 *   2. 34 of 43 open PRs were in conflict.
 *
 * Both were artefacts of calling the GitHub API **without a token**:
 *
 *   - `author_association` for an org member is reported as `MEMBER` to an
 *     authenticated caller, but downgraded to `CONTRIBUTOR` for an anonymous
 *     one. GitHub will not disclose org membership to unauthenticated callers,
 *     so a maintainer filter looking for OWNER/MEMBER/COLLABORATOR matches
 *     nothing. Verified on this repo: the same comment endpoint returns
 *     MEMBER with a token and CONTRIBUTOR without.
 *
 *   - `mergeable_state` is also authorization-sensitive (`blocked` with a
 *     token, `unstable` without). Only the `mergeable` boolean is stable, and
 *     even that is `null` until GitHub has computed it, which is what turned
 *     "unknown" into "conflict".
 *
 * So this script refuses to run without a token, derives the maintainer set
 * from an endpoint that cannot be silently downgraded, and polls
 * `mergeable` until it is a real answer.
 *
 * Usage:
 *   node scripts/triage-prs.mjs                 # all open PRs
 *   node scripts/triage-prs.mjs --repo o/r      # a different repository
 *   node scripts/triage-prs.mjs --json          # machine-readable
 *   node scripts/triage-prs.mjs --conflicts     # only conflicting PRs
 *
 * Token: $GITHUB_TOKEN, else `gh auth token`.
 *
 * Exit codes:
 *   0  ran successfully
 *   1  no usable token, or the API rejected the token
 *   2  one or more PRs are in conflict (only with --conflicts)
 */

import { execSync } from "node:child_process";
import process from "node:process";

const API = "https://api.github.com";

/** Logins that are bots but whose name does not end in `[bot]`. */
const EXTRA_BOTS = new Set(["Copilot", "copilot-pull-request-reviewer"]);

/** How many times to re-ask for `mergeable` before giving up on a PR. */
const MERGEABLE_ATTEMPTS = 8;
const MERGEABLE_BACKOFF_MS = 1500;

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);

function flag(name) {
  return argv.includes(`--${name}`);
}

function option(name, fallback) {
  const index = argv.indexOf(`--${name}`);
  return index !== -1 && argv[index + 1] ? argv[index + 1] : fallback;
}

const AS_JSON = flag("json");
const ONLY_CONFLICTS = flag("conflicts");
const REPO = option("repo", "Movalabs-crew/mova-store");

// ---------------------------------------------------------------------------
// auth -- the whole point
// ---------------------------------------------------------------------------

function resolveToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execSync("gh auth token", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

const TOKEN = resolveToken();

if (!TOKEN) {
  console.error(
    [
      "No GitHub token available.",
      "",
      "This script refuses to run anonymously on purpose. Without a token the",
      "API reports org members as CONTRIBUTOR instead of MEMBER, and leaves",
      "mergeable_state unreliable, so every maintainer and every conflict count",
      "it produces would be wrong.",
      "",
      "Set GITHUB_TOKEN, or authenticate the GitHub CLI with `gh auth login`.",
    ].join("\n")
  );
  process.exit(1);
}

const HEADERS = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${TOKEN}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "mova-triage",
};

// ---------------------------------------------------------------------------
// api helpers
// ---------------------------------------------------------------------------

async function api(path, { allow404 = false } = {}) {
  const res = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
    headers: HEADERS,
  });

  if (res.status === 404 && allow404) return null;

  if (res.status === 401) {
    console.error("GitHub rejected the token (401). Check GITHUB_TOKEN.");
    process.exit(1);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} for ${path}\n${body.slice(0, 300)}`);
  }
  return res.json();
}

/** Follow `Link: rel="next"` until exhausted. */
async function paginate(path) {
  const out = [];
  let next = `${API}${path}`;
  while (next) {
    const res = await fetch(next, { headers: HEADERS });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${res.status} for ${next}\n${body.slice(0, 300)}`);
    }
    out.push(...(await res.json()));

    const link = res.headers.get("link") || "";
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    next = match ? match[1] : null;
  }
  return out;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// maintainer set -- from permissions, not from author_association
// ---------------------------------------------------------------------------

async function loadMaintainers() {
  const [owner] = REPO.split("/");

  // Anyone with push access. `affiliation=all` includes outside collaborators
  // and org members alike, and `permissions.push` is the fact that matters.
  const collaborators = await paginate(`/repos/${REPO}/collaborators?affiliation=all&per_page=100`);
  const pushers = new Set(collaborators.filter((c) => c.permissions?.push).map((c) => c.login));

  // Org members are worth knowing about even at read level. This 403s for
  // tokens without org scope, which is not fatal.
  let members = new Set();
  try {
    members = new Set((await paginate(`/orgs/${owner}/members?per_page=100`)).map((m) => m.login));
  } catch {
    // fine -- collaborators alone are the authoritative signal
  }

  return { pushers, members };
}

function isBot(login, type) {
  return Boolean(type === "Bot" || login?.endsWith("[bot]") || EXTRA_BOTS.has(login));
}

// ---------------------------------------------------------------------------
// mergeable, polled
// ---------------------------------------------------------------------------

/**
 * `mergeable` is null until GitHub computes it. A single read turning null
 * into "conflict" is exactly how 11 of 16 real conflicts were missed.
 */
async function resolveMergeable(number) {
  let last = { mergeable: null, mergeable_state: "unknown" };

  for (let attempt = 0; attempt < MERGEABLE_ATTEMPTS; attempt += 1) {
    const pr = await api(`/repos/${REPO}/pulls/${number}`);
    last = { mergeable: pr.mergeable, mergeable_state: pr.mergeable_state };
    if (pr.mergeable !== null) return { ...last, resolved: true };
    await sleep(MERGEABLE_BACKOFF_MS * (attempt + 1));
  }

  return { ...last, resolved: false };
}

// ---------------------------------------------------------------------------
// comments
// ---------------------------------------------------------------------------

async function loadEngagement(numbers, pushers, members) {
  const perPr = new Map(numbers.map((n) => [n, []]));

  // One sweep for the whole repo rather than two calls per PR.
  const comments = await paginate(`/repos/${REPO}/issues/comments?per_page=100`);
  for (const c of comments) {
    const number = Number(c.issue_url.split("/").pop());
    if (!perPr.has(number)) continue;

    const login = c.user?.login || "";
    perPr.get(number).push({
      login,
      association: c.author_association,
      isBot: isBot(login, c.user?.type),
      at: c.created_at,
    });
  }
  return perPr;
}

function classify(comments, prAuthor, pushers, members) {
  const humans = comments.filter((c) => !c.isBot);
  const external = humans.filter((c) => c.login !== prAuthor);
  return {
    bots: comments.length - humans.length,
    byAuthor: humans.filter((c) => c.login === prAuthor).length,
    maintainer: external.filter((c) => pushers.has(c.login)).length,
    member: external.filter((c) => !pushers.has(c.login) && members.has(c.login)).length,
    external: external.filter((c) => !pushers.has(c.login) && !members.has(c.login)).length,
    lastExternal: external.at(-1)?.login || "",
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function pad(value, width, right = false) {
  const s = String(value ?? "");
  if (s.length >= width) return s;
  return right ? s.padStart(width) : s.padEnd(width);
}

async function main() {
  const { pushers, members } = await loadMaintainers();

  const prs = await paginate(`/repos/${REPO}/pulls?state=open&per_page=100`);
  if (prs.length === 0) {
    console.log("No open pull requests.");
    return;
  }

  const numbers = prs.map((p) => p.number);
  const engagement = await loadEngagement(numbers, pushers, members);

  const rows = [];
  for (const pr of prs) {
    const { mergeable, mergeable_state, resolved } = await resolveMergeable(pr.number);
    const counts = classify(engagement.get(pr.number) || [], pr.user?.login, pushers, members);

    const conflicting = mergeable === false;
    const behind = mergeable_state === "behind" && !conflicting;
    const unknown = mergeable === null;

    rows.push({
      number: pr.number,
      title: pr.title,
      author: pr.user?.login || "",
      draft: Boolean(pr.draft),
      state: unknown ? "UNKNOWN" : conflicting ? "CONFLICT" : behind ? "BEHIND" : "CLEAN",
      resolved,
      ...counts,
    });
  }

  rows.sort((a, b) => a.number - b.number);

  if (AS_JSON) {
    console.log(JSON.stringify({ repo: REPO, maintainers: [...pushers], rows }, null, 2));
  } else {
    console.log(`repo: ${REPO}`);
    console.log(
      `maintainers with push access (${pushers.size}): ${[...pushers].join(", ") || "none"}`
    );
    if (members.size) {
      console.log(`org members (${members.size}): ${[...members].join(", ")}`);
    }
    console.log("");

    const header = [
      pad("PR", 6),
      pad("STATE", 9),
      pad("M", 4, true),
      pad("EXT", 5, true),
      pad("BOT", 5, true),
      pad("AUTHOR", 20),
      "LAST EXTERNAL COMMENT",
    ].join(" ");
    console.log(header);
    console.log("-".repeat(header.length));

    for (const r of rows) {
      if (ONLY_CONFLICTS && r.state !== "CONFLICT") continue;
      console.log(
        [
          pad(`#${r.number}`, 6),
          pad(r.state + (r.draft ? "*" : ""), 9),
          pad(r.maintainer, 4, true),
          pad(r.external, 5, true),
          pad(r.bots, 5, true),
          pad(r.author.slice(0, 19), 20),
          r.lastExternal,
        ].join(" ")
      );
    }

    const conflicts = rows.filter((r) => r.state === "CONFLICT");
    const unknown = rows.filter((r) => r.state === "UNKNOWN");
    const needsReview = rows.filter((r) => r.maintainer === 0 && !r.draft);

    console.log("");
    console.log(`open:        ${rows.length}`);
    console.log(`conflicting: ${conflicts.length}`);
    console.log(`behind only: ${rows.filter((r) => r.state === "BEHIND").length}`);
    console.log(`clean:       ${rows.filter((r) => r.state === "CLEAN").length}`);
    if (unknown.length) {
      console.log(`unresolved:  ${unknown.length} (GitHub never returned mergeable)`);
    }
    console.log(`no maintainer comment yet: ${needsReview.length}`);
    console.log("");
    console.log("M   = comments from accounts with push access (excluding the PR author)");
    console.log("EXT = comments from everyone else, bots excluded");
    console.log("BOT = bot comments, excluded from M and EXT");
    console.log("*   = draft PR");
  }

  if (ONLY_CONFLICTS && rows.some((r) => r.state === "CONFLICT")) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
