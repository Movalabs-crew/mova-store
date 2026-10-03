#!/usr/bin/env node
/**
 * Bundle report for the built Next.js client output.
 *
 * Reads the *built* app (`.next/`) — nothing here depends on a new toolchain:
 * only `node:fs` / `node:zlib`, so there is no analyzer dependency to install.
 *
 * What it does:
 *   1. Walks the built client chunks under `.next/static` and measures each one
 *      (raw + gzip).
 *   2. Reads `.next/app-build-manifest.json` and sums the client JS each route
 *      actually ships, so a regression is attributed to a route, not just to
 *      "the bundle".
 *   3. Attributes the largest chunks to known heavy dependencies via a small
 *      marker table (`scripts/bundle-budget.json` -> `markers`). This is a
 *      heuristic: it looks for package-distinctive strings in the minified
 *      chunk, so a chunk is only listed when the dependency is really in it.
 *   4. Compares the result with the documented budget and prints WARN / FAIL.
 *   5. Writes a machine-readable report so CI can upload it as an artifact.
 *
 * Usage:
 *   node scripts/bundle-report.mjs                     # report, warn only (CI)
 *   node scripts/bundle-report.mjs --strict            # exit 1 when over budget
 *   node scripts/bundle-report.mjs --json report.json  # choose the JSON output
 *
 * Budgets live in scripts/bundle-budget.json and are documented in
 * docs/BUNDLE_BUDGET.md. Run this AFTER `npm run build`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, ".next");
const STATIC_DIR = path.join(NEXT_DIR, "static");

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const jsonIndex = args.indexOf("--json");
const jsonOut =
  jsonIndex !== -1
    ? path.resolve(ROOT, args[jsonIndex + 1])
    : path.join(NEXT_DIR, "bundle-report.json");

const kB = (bytes) => Number((bytes / 1024).toFixed(1));

function loadBudget() {
  const file = path.join(ROOT, "scripts", "bundle-budget.json");
  const raw = JSON.parse(readFileSync(file, "utf8"));
  return {
    budgets: raw.budgets || {},
    routeOverrides: raw.routeOverrides || {},
    markers: raw.markers || {},
  };
}

function walkJs(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, out);
    else if (entry.isFile() && entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

/** "static/chunks/app/page-abc.js" -> path inside `.next`, with a stable label. */
function relativeToNext(file) {
  return path.relative(NEXT_DIR, file).split(path.sep).join("/");
}

/** "/shop/page" -> "/shop"; "/page" -> "/"; "/layout" stays as the shared baseline. */
function normalizeRoute(key) {
  if (key === "/page") return "/";
  if (key.endsWith("/page")) return key.slice(0, -"/page".length) || "/";
  return key;
}

function measure(file, cache) {
  if (cache.has(file)) return cache.get(file);
  const buf = readFileSync(file);
  const text = buf.toString("utf8");
  const value = { raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length, text };
  cache.set(file, value);
  return value;
}

function markersFor(text, markers) {
  const found = [];
  for (const [dep, needles] of Object.entries(markers)) {
    if (needles.some((needle) => text.includes(needle))) found.push(dep);
  }
  return found;
}

function readManifest(name) {
  const file = path.join(NEXT_DIR, name);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function main() {
  if (!existsSync(STATIC_DIR)) {
    console.error(
      `No client build found at ${path.relative(ROOT, STATIC_DIR)} — run \`npm run build\` first.`
    );
    process.exit(strict ? 1 : 0);
  }

  const config = loadBudget();
  const { budgets, routeOverrides, markers } = config;
  const cache = new Map();

  const chunkFiles = walkJs(STATIC_DIR).sort();
  const chunks = chunkFiles.map((file) => {
    const m = measure(file, cache);
    return {
      file: relativeToNext(file),
      raw: m.raw,
      gzip: m.gzip,
      markers: markersFor(m.text, markers),
    };
  });
  const totalGzip = chunks.reduce((sum, c) => sum + c.gzip, 0);
  const totalRaw = chunks.reduce((sum, c) => sum + c.raw, 0);

  // Per-route client JS, from the build manifest Next writes for the app router.
  const appManifest = readManifest("app-build-manifest.json");
  const pagesManifest = readManifest("build-manifest.json");
  const pages = (appManifest && appManifest.pages) || (pagesManifest && pagesManifest.pages) || {};

  const routes = [];
  for (const [key, files] of Object.entries(pages)) {
    const unique = [...new Set(files)];
    let raw = 0;
    let gzip = 0;
    for (const rel of unique) {
      const abs = path.join(NEXT_DIR, rel);
      // A manifest entry can outlive a file (e.g. a dev-only chunk); skip rather
      // than crash the report.
      if (!existsSync(abs)) continue;
      const m = measure(abs, cache);
      raw += m.raw;
      gzip += m.gzip;
    }
    routes.push({ key, route: normalizeRoute(key), files: unique.length, raw, gzip });
  }
  routes.sort((a, b) => b.gzip - a.gzip);

  // Shared baseline: what every route pays for (the `/layout` entry).
  const layout = routes.find((r) => r.key === "/layout");
  const sharedFiles = (appManifest && appManifest.rootMainFiles) || [];
  let sharedGzip = layout ? layout.gzip : 0;
  if (!layout && sharedFiles.length) {
    let gzip = 0;
    for (const rel of new Set(sharedFiles)) {
      const abs = path.join(NEXT_DIR, rel);
      if (existsSync(abs)) gzip += measure(abs, cache).gzip;
    }
    sharedGzip = gzip;
  }

  const largest = [...chunks].sort((a, b) => b.gzip - a.gzip).slice(0, 10);

  const violations = [];
  // `value` is bytes; budgets are kilobytes, so normalise before comparing.
  const check = (label, value, limitKb) => {
    if (typeof limitKb !== "number") return "—";
    const valueKb = kB(value);
    const failed = valueKb > limitKb;
    if (failed) violations.push(`${label} is ${valueKb} kB gzip (budget ${limitKb} kB)`);
    return failed ? "FAIL" : "ok";
  };

  console.log("Bundle report — built client JS under .next/static\n");
  console.log(
    `chunks: ${chunks.length}   raw total: ${kB(totalRaw)} kB   gzip total: ${kB(totalGzip)} kB`
  );
  console.log(`gzip is a local estimate (zlib level 9); a CDN serving brotli will ship less.\n`);

  if (routes.length) {
    console.log("Per-route client JS (route <- app-build-manifest.json):");
    console.log("  route                              files      raw      gzip   budget  status");
    for (const r of routes) {
      const limit = routeOverrides[r.route] ?? budgets.routeKb;
      const status = limit ? check(r.route, r.gzip, limit) : "—";
      console.log(
        `  ${r.route.padEnd(32)} ${String(r.files).padStart(5)} ${String(kB(r.raw)).padStart(9)} ${String(
          kB(r.gzip)
        ).padStart(9)} ${(limit ? `≤${limit}` : "—").padStart(8)}  ${status}`
      );
    }
    console.log("");
  } else {
    console.log("No app/build manifest found — only chunk sizes are reported.\n");
  }

  console.log(`Shared baseline (every route): ${sharedGzip ? kB(sharedGzip) : 0} kB gzip`);
  check("shared baseline", sharedGzip, budgets.sharedKb);
  check("total client JS", totalGzip, budgets.totalJsKb);

  console.log("\nLargest chunks:");
  largest.forEach((c, i) => {
    const marker = c.markers.length ? `   <- ${c.markers.join(", ")}` : "";
    console.log(
      `  ${String(i + 1).padStart(2)}. ${kB(c.gzip).toString().padStart(7)} kB gzip  ${c.file}${marker}`
    );
    check(`chunk ${c.file}`, c.gzip, budgets.largestChunkKb);
  });

  const attribution = largest.filter((c) => c.markers.length);
  if (attribution.length) {
    console.log("\nHeavy-dependency attribution (marker match on the largest chunks):");
    for (const c of attribution)
      console.log(`  ${c.markers.join(", ")} -> ${c.file} (${kB(c.gzip)} kB gzip)`);
  }

  console.log(
    `\nBudget (scripts/bundle-budget.json): route ≤${budgets.routeKb} kB · shared ≤${budgets.sharedKb} kB · ` +
      `chunk ≤${budgets.largestChunkKb} kB · total ≤${budgets.totalJsKb} kB (all gzip)`
  );
  if (violations.length) {
    console.log(`\n${strict ? "FAIL" : "WARN"}: ${violations.length} budget violation(s):`);
    for (const v of violations) console.log(`  - ${v}`);
    if (strict) console.log("\nRe-run without --strict to report only.");
  } else {
    console.log("\nOK: every measured metric is within budget.");
  }

  const report = {
    generatedAt: new Date().toISOString(),
    static: { chunks: chunks.length, rawKb: kB(totalRaw), gzipKb: kB(totalGzip) },
    sharedGzipKb: kB(sharedGzip),
    budgets,
    routes: routes.map((r) => ({
      route: r.route,
      files: r.files,
      rawKb: kB(r.raw),
      gzipKb: kB(r.gzip),
    })),
    largestChunks: largest.map((c) => ({ file: c.file, gzipKb: kB(c.gzip), markers: c.markers })),
    violations,
  };
  mkdirSync(path.dirname(jsonOut), { recursive: true });
  writeFileSync(jsonOut, JSON.stringify(report, null, 2));
  console.log(`\nJSON report: ${path.relative(ROOT, jsonOut)}`);

  if (violations.length && strict) process.exit(1);
}

main();
