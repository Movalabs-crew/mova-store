# Client bundle budget

This repo measures what actually ships. `scripts/bundle-report.mjs` reads the built app
(`.next/`) and reports the client JavaScript per route and per chunk, comparing it with the
budget in `scripts/bundle-budget.json`. It uses `node:fs` / `node:zlib` only — no analyzer
dependency — so there is nothing to install and nothing to keep in step with Next.js.

## Running it

```bash
npm run build          # the report reads the production build, so build first
npm run bundle:report  # print the report, write .next/bundle-report.json, never fail
npm run bundle:check   # same report, exits 1 when any metric is over budget
```

`npm run bundle:report` is wired into the `frontend` CI job right after `Build Next.js`, and the
JSON report is uploaded as the `bundle-report` artifact on every run. CI stays in report mode
(a red build on a borderline number hides the lint/test signal); `bundle:check` is the gate to
run locally, or a release check, when you want the budget enforced and fail the run.

## What is measured

| Metric     | Meaning                                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **route**  | Client JS a single app route ships: the sum of the unique files in its `app-build-manifest.json` entry. The number to watch for regressions. |
| **shared** | The `/layout` entry — what every route pays for before its own code loads.                                                                   |
| **chunk**  | One file under `.next/static`, the finest granularity the build exposes without a full webpack stats export.                                 |
| **total**  | Every `.js` file under `.next/static`. A coarse ceiling to catch a runaway dependency landing somewhere unexpected.                          |

All sizes are **gzip** (zlib level 9, a local estimate). A CDN serving brotli will ship less, so
the budget is deliberately conservative.

## Budget

`scripts/bundle-budget.json`:

| Budget           | kB (gzip) |
| ---------------- | --------- |
| `routeKb`        | 600       |
| `sharedKb`       | 300       |
| `largestChunkKb` | 450       |
| `totalJsKb`      | 2500      |

These are **initial ceilings**, not targets. They are set wide enough for a stock Next.js 14 App
Router baseline plus this app's known heavy dependencies, so the check catches a real regression
(a dependency duplicated into a route, an eager import of a heavy module) without failing on
ordinary noise. **Tighten them to the first recorded CI report** — the budget only has teeth once
it sits just above today's real number. Per-route overrides go in `routeOverrides`, keyed by the
normalised route (`/checkout`, `/shop`).

## Heavy dependencies and attribution

The report scans each chunk for package-distinctive strings (`markers` in the budget file) and
names the heavy dependencies a chunk contains. This is a heuristic — minified code does not carry
package names — so treat a match as "this dependency is in this chunk", never as a precise byte
count.

Known client-side weight in this app:

| Dependency               | Where it comes from                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@stellar/stellar-sdk`   | `lib/stellar/*` (`config`, `checkout`, `events`, `indexer`, `scval`, `simulate`); `optimizePackageImports` is enabled in `next.config.mjs`                                                                    |
| `@stellar/freighter-api` | `lib/stellar/freighter.ts`, pulled in by the Stellar wallet/checkout components                                                                                                                               |
| `@emailjs/browser`       | `lib/sendmail.js`; only the landing-page contact form and the checkout page use it                                                                                                                            |
| `@supabase/supabase-js`  | `lib/supabase.js` (auth), used from `lib/auth.js` and `lib/AuthContext.js`                                                                                                                                    |
| `react-icons`            | 20+ files, each importing a collection barrel (`react-icons/fa`, `/si`, …); `optimizePackageImports` handles these, so prefer a collection import over a deep icon path only if the optimizer is ever removed |

## Splitting the landing page

`app/page.jsx` is a client component, so every section it imports statically lands in the `/`
route's client JS even though most of the page is below the fold. The six below-the-fold sections
— `Slider`, `Testimonials`, `FAQ`, `Aboutus`, `newsletter`, `ContactUs` — are loaded with
`next/dynamic`, which moves them into their own chunks. `ContactUs` is the concrete win: it is the
only landing section that imports `lib/sendmail`, and therefore `@emailjs/browser`, so the email
client is no longer in the `/` route's initial JavaScript.

Add a new below-the-fold section to that list rather than importing it statically, and add the
route to `routeOverrides` when a legitimately heavy route needs headroom.
