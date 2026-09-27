# Mova Store — Wave Issue Drafts (250)

> **DRAFT — LOCAL ONLY. DO NOT COMMIT OR PUSH.**
> This file is the reserve roadmap. Publishing it exposes future bounty issues to contributors before each wave opens, which is what drained the previous wave. Keep it untracked (`git status` should never show it staged).
>
> Grounded in a read-only audit of `main`. Batches 1–10 were written against `e37a8e0`; Batches 11–13 were written against `da30241`. Every reference points at a real file and line on `main`.
> **Status:** Wave 9 = [#452](../../issues/452)–[#471](../../issues/471). Wave 10 = [#473](../../issues/473)–[#492](../../issues/492). Wave 11 = [#493](../../issues/493)–[#512](../../issues/512) (Batch 3, three drafts rewritten before publishing) + [#513](../../issues/513)–[#532](../../issues/532) (Batch 4). Wave 12 = [#533](../../issues/533)–[#552](../../issues/552) (Batch 5) + [#553](../../issues/553)–[#572](../../issues/572) (Batch 6). Wave 13 = [#573](../../issues/573)–[#592](../../issues/592) (Batch 7) + [#593](../../issues/593)–[#612](../../issues/612) (Batch 8). Wave 14 = [#617](../../issues/617)–[#636](../../issues/636) (Batch 9) + [#676](../../issues/676)–[#694](../../issues/694) (Batch 10, 19 issues; 197 shipped in `da302415`). Wave 15 = [#704](../../issues/704)–[#723](../../issues/723) (Batch 11, four drafts reworked before publishing). All 219 carry the community banner. Batches 12–13 drafted, awaiting approval.
> (`#472` is a pull request, so Batch 2 starts one number later than Batch 1's sequence would suggest.)

---

## How to use this file

1. Read a batch below.
2. Approve it in chat (e.g. _"approve batch 3"_, or _"approve 3 and 4"_).
3. I create exactly those issues with `gh`, in your wave format:
   - title: conventional-commit style, lowercase scope
   - body: `## Problem` / `## Recommended change` / `## Acceptance criteria` / `## Guideline`
   - absolute permalinks with line ranges
   - **no** bounty amounts in titles
   - **no** labels — the Drip bot labels them when the issue is added to the campaign
   - the community banner is prepended as the **first** line of every body (below) — it is boilerplate, so it is added at publish time rather than stored in each draft here

### Community banner (prepended to every published issue)

```
> 💬 **Questions or need a hand?** Ask in the [MovaLabs community on Telegram](https://t.me/movalabs_crew).
```

Applied to all 219 published issues ([#452](../../issues/452)–[#694](../../issues/694) and [#704](../../issues/704)–[#723](../../issues/723), excluding `#472` and the contributor pull requests `#613`–[#616](../../issues/616), `#637`–[#675](../../issues/675) and `#695`–[#703](../../issues/703)) on 2026-09-27, verified present and first-line on each. Batches 12–13 must include it at publish time.

## Batches

| #   | Theme                                      | Issues  | Count | Status                                                                                  |
| --- | ------------------------------------------ | ------- | ----- | --------------------------------------------------------------------------------------- |
| 1   | Restore green `main` (build + CI validity) | 1–20    | 20    | ✅ published [#452](../../issues/452)–[#471](../../issues/471)                          |
| 2   | Security & data integrity                  | 21–40   | 20    | ✅ published [#473](../../issues/473)–[#492](../../issues/492)                          |
| 3   | Soroban contract correctness & tests       | 41–60   | 20    | ✅ published [#493](../../issues/493)–[#512](../../issues/512)                          |
| 4   | Stellar client correctness                 | 61–80   | 20    | ✅ published [#513](../../issues/513)–[#532](../../issues/532)                          |
| 5   | Stellar client robustness & tests          | 81–100  | 20    | ✅ published [#533](../../issues/533)–[#552](../../issues/552)                          |
| 6   | Data layer & buyer orders                  | 101–120 | 20    | ✅ published [#553](../../issues/553)–[#572](../../issues/572)                          |
| 7   | React correctness & state                  | 121–140 | 20    | ✅ published [#573](../../issues/573)–[#592](../../issues/592)                          |
| 8   | Accessibility (WCAG)                       | 141–160 | 20    | ✅ published [#593](../../issues/593)–[#612](../../issues/612)                          |
| 9   | Performance & DX                           | 161–180 | 20    | ✅ published [#617](../../issues/617)–[#636](../../issues/636)                          |
| 10  | Tests, docs & repo hygiene                 | 181–200 | 19    | ✅ published [#676](../../issues/676)–[#694](../../issues/694) (197 done in `da302415`) |
| 11  | Mainnet safety & payment correctness       | 201–220 | 20    | ✅ published [#704](../../issues/704)–[#723](../../issues/723) (four drafts reworked)   |
| 12  | App shell, resilience & hardening          | 221–240 | 20    | awaiting approval                                                                       |
| 13  | Contract semantics, data & coverage        | 241–250 | 10    | awaiting approval (half batch)                                                          |

### Complexity at a glance

`trivial` = ≤1 file, mechanical, low risk · `medium` = 1–3 files, needs reasoning or a test · `high` = multi-file, design/security-sensitive, or broad test work.

| Batch | Theme                                | trivial | medium  | high   | total   |
| ----- | ------------------------------------ | ------- | ------- | ------ | ------- |
| 1     | Restore green `main`                 | 13      | 7       | 0      | 20      |
| 2     | Security & data integrity            | 4       | 11      | 5      | 20      |
| 3     | Soroban contract correctness & tests | 3       | 17      | 0      | 20      |
| 4     | Stellar client correctness           | 7       | 9       | 4      | 20      |
| 5     | Stellar client robustness & tests    | 3       | 17      | 0      | 20      |
| 6     | Data layer & buyer orders            | 7       | 11      | 2      | 20      |
| 7     | React correctness & state            | 12      | 7       | 1      | 20      |
| 8     | Accessibility                        | 13      | 7       | 0      | 20      |
| 9     | Performance & DX                     | 10      | 9       | 1      | 20      |
| 10    | Tests, docs & repo hygiene           | 13      | 3       | 3      | 19      |
| 11    | Mainnet safety & payment correctness | 3       | 15      | 2      | 20      |
| 12    | App shell, resilience & hardening    | 9       | 10      | 1      | 20      |
| 13    | Contract semantics, data & coverage  | 3       | 6       | 1      | 10      |
|       | **Total**                            | **100** | **129** | **20** | **249** |

#197 is not counted above because it shipped directly in commit `da302415`, which is why the batch totals sum to 249 of the 250 drafted issues.

**Wave suggestion:** Batch 1 → Wave 9, Batch 2 → Wave 10, 3+4 → Wave 11, 5+6 → Wave 12, 7+8 → Wave 13, 9+10 → Wave 14, 11 → Wave 15, 12 → Wave 16, 13 → Wave 17. That is 250 issues across 17 waves, roughly a year and a half at one wave per month.

---

# Batch 1 — Restore green `main` (issues 1–20)

> ✅ **PUBLISHED as Wave 9 — GitHub issues [#452](../../issues/452)–[#471](../../issues/471) on 2026-09-27.** No labels applied (the Drip bot labels on campaign add).

> Context: `main` is currently unbuildable and CI has been dead since 2026-09-13 (every run fails in 0s because the workflow file is invalid). This batch must land first so contributor PRs are not blamed for pre-existing failures.

---

### Complexity

| #   | Issue                                                                                   | Complexity |
| --- | --------------------------------------------------------------------------------------- | ---------- |
| 1   | `fix(ci): remove the duplicate concurrency key that makes the entire workflow invalid`  | trivial    |
| 2   | `fix(ci): remove duplicated cargo fmt and clippy steps in the contracts job`            | trivial    |
| 3   | `fix(ci): stop masking cargo audit failures`                                            | trivial    |
| 4   | `fix(layout): remove the duplicate SkipLink import and triplicate render`               | trivial    |
| 5   | `fix(checkout): remove the duplicate stellar config and price imports`                  | trivial    |
| 6   | `fix(landing): repair the malformed duplicated submit button in ContactUs`              | medium     |
| 7   | `fix(sidebar): fix undefined modal references that crash every shop route`              | medium     |
| 8   | `fix(supabase): repair the invalid dollar-quoting that aborts schema.sql`               | trivial    |
| 9   | `fix(contracts): repair the non-compiling refund event assertion in the contract tests` | medium     |
| 10  | `chore(lint): enable no-duplicate-imports`                                              | trivial    |
| 11  | `ci(workflows): fail the run when workflow YAML is invalid`                             | medium     |
| 12  | `fix(build): reconcile the two conflicting NODE_ENV definitions in the vitest config`   | trivial    |
| 13  | `fix(ci): stop running the test suite twice in the frontend job`                        | trivial    |
| 14  | `fix(types): type-check the test suite in CI`                                           | medium     |
| 15  | `fix(lint): lint hooks, context and tests in CI`                                        | medium     |
| 16  | `fix(ci): pin third-party actions to commit SHAs`                                       | medium     |
| 17  | `fix(ci): give the secret scan full history`                                            | trivial    |
| 18  | `fix(ci): align the rust-security toolchain with the pinned Rust version`               | trivial    |
| 19  | `fix(prettier): ignore build output and generated artifacts`                            | trivial    |
| 20  | `chore(types): remove the redundant strictNullChecks flag`                              | trivial    |

## 1. `fix(ci): remove the duplicate concurrency key that makes the entire workflow invalid`

**Problem** — `.github/workflows/ci.yml` declares the top-level `concurrency:` mapping twice, at lines 9–11 and again at 16–18, with `permissions: contents: read` in between. The workflow document root is a single YAML mapping, so a duplicate key invalidates the file. Every run on `main` since 2026-09-13 failed in 0 seconds with "This run likely failed because of a workflow file issue" (run 34780363106), so no job has executed and nothing has been enforced on any PR for two weeks. Compile errors reached `main` as a result.

**Recommended change**

- Delete one of the two `concurrency:` blocks, keeping a single block.
- Leave `permissions: contents: read` in place.
- Add workflow validation in CI (see #462) so this cannot regress.

**Acceptance criteria**

- `.github/workflows/ci.yml` contains exactly one top-level `concurrency:` key.
- A push or pull request schedules real jobs instead of failing at 0s.
- `actionlint .github/workflows/ci.yml` reports no errors.

**Guideline** — GitHub Actions workflow syntax: the document root is a single YAML mapping, so duplicate keys reject the whole file.

---

## 2. `fix(ci): remove duplicated cargo fmt and clippy steps in the contracts job`

**Problem** — The `contracts` job runs `cargo fmt -- --check` and `cargo clippy --all-targets -- -D warnings`, then repeats both steps verbatim with `cargo build` in between (lines 102–120). The duplicated clippy pass runs on a cold cache in a job that already carries `timeout-minutes: 30`, roughly doubling the most expensive stage.

**Recommended change**

- Delete the duplicated `Check formatting` and `Run clippy` pair at lines 114–120.
- Keep one fmt+clippy pair before the build.

**Acceptance criteria**

- `cargo fmt -- --check` appears exactly once in the `contracts` job.
- `cargo clippy --all-targets -- -D warnings` appears exactly once.
- The job still builds `wasm32v1-none` and runs `cargo test`.

**Guideline** — Every CI step should add a distinct signal; repeated steps only inflate runtime.

---

## 3. `fix(ci): stop masking cargo audit failures`

**Problem** — The `rust-security` job runs `cargo audit` with `continue-on-error: true` (line 173), so its step result is always `success` and `ci-success` passes regardless of findings. This contradicts `SECURITY.md`, which promises the pipeline fails on high-severity vulnerabilities. The same job installs `toolchain: stable` while `contracts` pins `RUST_VERSION: "1.91.0"` (line 22), so the two Rust jobs validate different compilers.

**Recommended change**

- Remove `continue-on-error`.
- If specific advisories must be tolerated, pin them with `cargo audit --ignore <RUSTSEC-id>` plus an explanatory comment.
- Run the job on `${{ env.RUST_VERSION }}` for parity.

**Acceptance criteria**

- An advisory reported by `cargo audit` fails the job.
- `ci-success` reflects the audit's real result.
- Any remaining ignores are documented.

**Guideline** — A security gate that cannot fail is documentation, not a control.

---

## 4. `fix(layout): remove the duplicate SkipLink import and triplicate render`

**Problem** — `app/layout.jsx` imports `SkipLink` twice (lines 8 and 13) and mounts `<SkipLink />` three times inside `<body>` (lines 68, 70, 73). Two imports of the same binding from one module is a parse error (`Identifier 'SkipLink' has already been declared`, TS2300), so the root layout cannot compile; this is why the Vercel deployment on `main` fails. Even with the import fixed, three skip links create duplicate landmarks and DOM ids.

**Recommended change**

- Delete the second import at line 13.
- Keep exactly one `<SkipLink />` as the first focusable element in `<body>`.
- Render the already-imported `ErrorBoundary` around the main content (see draft 138).

**Acceptance criteria**

- `SkipLink` is imported once and rendered once.
- `npm run type-check` and `next build` pass.
- The skip link remains first and still targets `#main-content`.

**Guideline** — WCAG 2.1 SC 2.4.1 (Bypass Blocks): one skip link landmark per page.

---

## 5. `fix(checkout): remove the duplicate stellar config and price imports`

**Problem** — `app/checkout/page.tsx` imports `SUPPORTED_TOKENS`, `defaultToken` and `TokenConfig` from `lib/stellar/config` at line 29 and again (with `NETWORK`) at lines 31–36, and imports `convertUsdToXlm` / `DEFAULT_XLM_USD_PRICE` from `lib/stellar/price` at lines 30 and 37. The duplicate bindings are a compile error, so the checkout route cannot build.

**Recommended change**

- Merge into a single `config` import including `NETWORK`.
- Merge into a single `price` import.

**Acceptance criteria**

- No identifier is imported twice in the file.
- `npm run type-check`, `npm run lint` and `next build` pass.
- `/checkout` renders and the token selector still resolves its config.

**Guideline** — ES modules declare one binding per identifier; a duplicate import is a syntax error.

---

## 6. `fix(landing): repair the malformed duplicated submit button in ContactUs`

**Problem** — In `app/(landingpage)/ContactUs.jsx` the submit button is duplicated and the first copy is truncated (lines 154–170): a `<button type="submit">` opens at 154, `{isLoading ? (<>` begins at 159, an `<svg>` opens at 161 and is never closed, a stray `</div>` and `)}` appear at 168–169, and a second complete button starts at 170. `app/page.jsx` renders `<ContactUs />`, so the landing page fails to parse.

**Recommended change**

- Delete the truncated first button block.
- Keep one button with the spinner `<svg>` (circle + path), the `Sending...` / `Send Message` label, and a single error renderer.
- Keep the error announced via `role="alert"`.

**Acceptance criteria**

- `ContactUs.jsx` parses with no duplicated button and no stray tags.
- `next build` passes and `/` renders exactly one submit button.
- The spinner still shows while submitting.

**Guideline** — JSX requires well-formed nesting; a form should expose a single submit control.

---

## 7. `fix(sidebar): fix undefined modal references that crash every shop route`

**Problem** — `components/Sidebar.jsx` uses `onClick={openModal}` (line 26) and renders `<Modal show={showModal} onClose={closeModal}>` (lines 125–131), but `openModal`, `showModal`, `closeModal` and `Modal` are never declared or imported. Evaluating an undefined identifier during render throws `ReferenceError`. `Sidebar` is mounted by `app/shop/layout.jsx`, so every `/shop` and product route crashes. `handleSearchSubmit` (lines 14–19) is dead code and the search input has no `value`/`onChange`.

**Recommended change**

- Either implement the modal state with `useState` + import `Modal` and wire the input, or remove the search `<li>` and `<Modal>` block to match the existing test expectation.
- Fix the `/blog` link that is labelled "Shop".

**Acceptance criteria**

- Sidebar renders without errors and `/shop` loads.
- No undefined identifiers remain; `npm run lint` passes.
- A test asserts the shipped behaviour (input and modal present and working, or absent).

**Guideline** — React render must not reference undefined bindings; UI that exists should be operable.

---

## 8. `fix(supabase): repair the invalid dollar-quoting that aborts schema.sql`

**Problem** — `set_updated_at()` in `supabase/schema.sql` is declared `returns trigger as ''` … `end;'' language plpgsql;` (lines 18–23), where the `$$` delimiters were typed as two single quotes. That is a syntax error, so the script aborts and every later statement never runs: the `products` RLS enablement, the `is_admin()` helper, all RLS policies, and the whole `orders` table. A setup following the documented "run schema.sql" step silently leaves the database without row level security.

**Recommended change**

- Replace both `''` delimiters with `$$`, matching `is_admin()` in the same file.
- Add a verification line to `supabase/README.md`.

**Acceptance criteria**

- `schema.sql` runs top-to-bottom on a fresh Supabase project with no error.
- `select relrowsecurity from pg_class where relname='products';` returns `true`.
- Updating a product sets `updated_at` via the trigger.

**Guideline** — PostgreSQL dollar-quoting wraps a function body so its contents are not parsed as SQL.

---

## 9. `fix(contracts): repair the non-compiling refund event assertion in the contract tests`

**Problem** — `contracts/checkout/src/test.rs` ends at line 512 with `assert_eq!(data_i128(ev_refund), amount, ...)`, but neither `data_i128` nor `ev_refund` is declared or imported anywhere in the file. `cargo test` therefore fails to compile, and the `OrderRefunded` event layout (the exact thing `lib/stellar/events.ts` and the indexer depend on) has no coverage at all.

**Recommended change**

- Remove the stray line and helper reference.
- Add a real refund assertion: call `client.refund(&id)`, then assert the emitted topics are `(refund, order_id, buyer)` and data is `{ amount }`.

**Acceptance criteria**

- `cargo test` compiles and passes.
- `test_events_emitted` covers `create_order`, `pay`, `dispatch` **and** `refund`.
- Topic order and data asserted for each event.

**Guideline** — Contracts are the source of truth for event layout, so their event assertions must compile and run.

---

## 10. `chore(lint): enable no-duplicate-imports`

**Problem** — Three files reached `main` with duplicate imports from the same module (`app/layout.jsx`, `app/checkout/page.tsx`, and others in history), each a hard compile error, because `.eslintrc.json` does not enable `no-duplicate-imports` and CI was not running.

**Recommended change**

- Enable core `no-duplicate-imports`, or `import/no-duplicates` if the import plugin is added.
- Confirm `next lint` covers `app/` and `components/`.

**Acceptance criteria**

- A file with two imports from the same module fails `npm run lint`.
- `npm run lint` passes once issues 4 and 5 are fixed.

**Guideline** — Catch syntax-level mistakes in lint rather than at build time.

---

## 11. `ci(workflows): fail the run when workflow YAML is invalid`

**Problem** — The duplicate `concurrency:` key disabled CI for two weeks unnoticed because nothing validates the workflow file itself; every run failed at 0s and no job executed.

**Recommended change**

- Add a job running `actionlint` and/or `yamllint` over `.github/workflows/*.yml`.
- Fail on duplicate keys, unknown keys and syntax errors.
- Have `ci-success` depend on it.

**Acceptance criteria**

- Introducing a duplicate top-level key fails the job.
- The job passes on the current workflows.
- `ci-success` `needs` the new job.

**Guideline** — Validate configuration in CI rather than trusting the platform to reject it at runtime.

---

## 12. `fix(build): reconcile the two conflicting NODE_ENV definitions in the vitest config`

**Problem** — `vitest.config.ts` statically replaces `process.env.NODE_ENV` with `"test"` via `define` (lines 6–8), while `test.env` sets the runtime value to `"development"` (lines 22–24). The two settings cancel each other, so modules branching on `NODE_ENV` behave differently on the transformed path versus the runtime path, and tests that need a specific environment must stub it manually.

**Recommended change**

- Pick one mechanism: delete the `define` replacement, or set `test.env.NODE_ENV` to `"test"` to match.

**Acceptance criteria**

- `process.env.NODE_ENV` resolves to a single, documented value under Vitest.
- A test pins that value so it cannot drift again.

**Guideline** — One source of truth for environment configuration.

---

## 13. `fix(ci): stop running the test suite twice in the frontend job`

**Problem** — The frontend job runs `npm run test` and then `npm run test:coverage` (lines 55–58). Vitest re-executes the entire suite for the coverage step, roughly doubling the slowest job, even though coverage already runs the tests.

**Recommended change**

- Drop one of the two steps; keep coverage if thresholds are enforced (see issue 186).

**Acceptance criteria**

- The suite executes once per CI run.
- Coverage is still produced and still gates when thresholds exist.

**Guideline** — Do not pay twice for the same signal.

---

## 14. `fix(types): type-check the test suite in CI`

**Problem** — `tsconfig.json` excludes `"tests"` and `"vitest.config.ts"` (lines 41–44), and `type-check` runs `tsc --noEmit --skipLibCheck`, so the CI type-check step never sees a single test file. Vitest transpiles with esbuild (type-stripping only), so type errors in test files pass CI silently.

**Recommended change**

- Add a `tsconfig.test.json` that includes `tests/**` and `__tests__/**`.
- Run it as its own CI step.

**Acceptance criteria**

- A deliberate type error in a test file fails CI.
- `npm run type-check` still passes on the current tree.

**Guideline** — Tests are code; type-check them like code.

---

## 15. `fix(lint): lint hooks, context and tests in CI`

**Problem** — `next lint` only covers Next's default directories. `hooks/`, `context/`, `tests/` and `__tests__/` are never linted, and there is no `.eslintignore` or `ignorePatterns` entry. Whole directories of the codebase therefore bypass lint entirely.

**Recommended change**

- Add explicit lint targets, e.g. `next lint --dir tests --dir hooks --dir context`.
- Wire them into the frontend CI job.

**Acceptance criteria**

- A deliberate lint error in `hooks/` or `context/` fails CI.
- The full-tree lint passes afterward.

**Guideline** — Lint coverage should match the codebase, not a framework default.

---

## 16. `fix(ci): pin third-party actions to commit SHAs`

**Problem** — `actions/checkout`, `actions/setup-node`, `actions/cache`, `dtolnay/rust-toolchain` and `taiki-e/install-action` are referenced by floating major tags, so an upstream tag move changes what runs in this repository with no review. Only `trufflesecurity/trufflehog` is version-pinned.

**Recommended change**

- Pin each `uses:` to a full 40-character SHA with a `# vX.Y.Z` comment.
- Document the update process.

**Acceptance criteria**

- No `uses:` references a mutable branch or major tag.
- The workflow still runs green.

**Guideline** — Supply-chain hygiene: pin CI dependencies to immutable refs.

---

## 17. `fix(ci): give the secret scan full history`

**Problem** — The trufflehog step uses the default shallow `checkout`, so it cannot scan history beyond the current commit; a secret committed and later removed would go undetected.

**Recommended change**

- Add `fetch-depth: 0` to the checkout used by the trufflehog job.

**Acceptance criteria**

- The checkout in that job uses `fetch-depth: 0`.
- The scan runs over full history.

**Guideline** — Secret scanning is only as good as the history it can see.

---

## 18. `fix(ci): align the rust-security toolchain with the pinned Rust version`

**Problem** — The `contracts` job pins `RUST_VERSION: "1.91.0"` (line 22) while `rust-security` installs `toolchain: stable` (line 163). The two Rust jobs therefore validate different compilers, so a toolchain bump can surface audit or build differences nobody can reproduce locally.

**Recommended change**

- Drive `rust-security` from `${{ env.RUST_VERSION }}`.

**Acceptance criteria**

- Both Rust jobs use the same version.
- A version bump happens in exactly one place.

**Guideline** — One compiler version per pipeline.

---

## 19. `fix(prettier): ignore build output and generated artifacts`

**Problem** — `.prettierignore` covers `node_modules/`, `.next/`, lock files, `*.wasm` and `.env*` but not `contracts/` or generated output consistently, while `package.json` runs Prettier over `"**/*.{js,jsx,ts,tsx,json,md}"`. After a local build, `npm run format` / `format:check` can walk generated files and produce spurious diffs or very slow runs; CI happens to run the check before the build, masking it.

**Recommended change**

- Add `.next/`, `contracts/`, `coverage/` and `public/` to `.prettierignore`.

**Acceptance criteria**

- `npm run format:check` gives the same result before and after a local build.
- Formatting checks complete quickly.

**Guideline** — Format checks must be deterministic regardless of local build state.

---

## 20. `chore(types): remove the redundant strictNullChecks flag`

**Problem** — `tsconfig.json` sets `strictNullChecks: true` at line 8, which is already implied by `strict: true` at line 7. Redundant config suggests the base flag is not trusted and invites drift.

**Recommended change**

- Delete the `strictNullChecks` entry.

**Acceptance criteria**

- `strict: true` remains and type-check still passes.
- No behavioural change in `tsc` output.

**Guideline** — Keep configuration minimal and non-contradictory.

---

# Batch 2 — Security & data integrity (issues 21–40)

> ✅ **PUBLISHED — GitHub issues [#473](../../issues/473)–[#492](../../issues/492) on 2026-09-27.** No labels applied (the Drip bot labels on campaign add).

> Context: the five `high` items here (22, 23, 37, 38, 39) touch admin exposure, price integrity, route authorization, OTP secrecy and payment verification. They are the most valuable issues in the backlog, so space them across waves rather than publishing all five together.

---

### Complexity

| #   | Issue                                                                                 | Complexity |
| --- | ------------------------------------------------------------------------------------- | ---------- |
| 21  | `security(supabase): restrict the orders INSERT policy that lets anon forge orders`   | medium     |
| 22  | `security(admin): stop shipping the admin email list to the browser`                  | high       |
| 23  | `security(checkout): recompute the payable total server-side`                         | high       |
| 24  | `security(admin): add search_path to the SECURITY DEFINER is_admin function`          | trivial    |
| 25  | `security(checkout): call the imported validation helpers or delete them`             | medium     |
| 26  | `security(uploads): validate product image type and size before upload`               | medium     |
| 27  | `security(email): strip CRLF from email fields and pin recipients`                    | medium     |
| 28  | `security(env): fail fast on missing Supabase env instead of placeholder credentials` | medium     |
| 29  | `security(env): call validateEnv at startup`                                          | medium     |
| 30  | `fix(orders): stop the cross-user buyer order cache leak`                             | medium     |
| 31  | `security(login): block protocol-relative open redirects`                             | trivial    |
| 32  | `security(headers): add a Content Security Policy or correct SECURITY.md`             | medium     |
| 33  | `docs(security): correct the RLS description in SECURITY.md`                          | trivial    |
| 34  | `security(supabase): make orders update and delete policies explicit`                 | medium     |
| 35  | `fix(auth): make AuthContext use the shared admin helper`                             | medium     |
| 36  | `security(supabase): scope reads on the admin_users table`                            | medium     |
| 37  | `fix(admin): enforce admin authorization on admin routes`                             | high       |
| 38  | `security(otp): move OTP generation and verification off the client`                  | high       |
| 39  | `security(supabase): verify the on-chain payment before recording an order`           | high       |
| 40  | `docs(security): document the card field threat model`                                | trivial    |

## 21. `security(supabase): restrict the orders INSERT policy that lets anon forge orders`

**Problem** — `supabase/schema.sql` creates `"Users can insert orders"` on `public.orders` for insert `to authenticated, anon with check (true)` (lines 157–162). Any visitor holding the public anon key can insert rows with arbitrary `user_id`, `user_email`, `total`, `status = 'Paid'` and `tx_hash`, with no server-side check that a payment occurred. The read policy then makes those forged rows visible to whichever account the attacker names.

**Recommended change**

- Remove `anon` and require `auth.uid() = user_id` in the `with check` clause.
- Constrain `status` and `total` server-side.
- Write order rows from a server route that verifies the on-chain payment.

**Acceptance criteria**

- An unauthenticated insert is rejected.
- An authenticated insert can only target the caller's own `user_id`.
- A forged "Paid" order cannot be created from the browser.

**Guideline** — RLS: never `with check (true)` for a role you do not control.

---

## 22. `security(admin): stop shipping the admin email list to the browser`

**Problem** — `lib/AuthContext.js` derives admin status from `NEXT_PUBLIC_ADMIN_EMAILS` (lines 13–22). `NEXT_PUBLIC_*` values are inlined into the client bundle, so the full admin allowlist is publicly readable. It also disagrees with server-side RLS, which authorizes through `admin_users` / JWT, so an operator listed only in the env var sees the panel but every write fails.

**Recommended change**

- Stop using `NEXT_PUBLIC_*` for the admin allowlist.
- Derive the UI gate from a server-verified claim (`app_metadata.is_admin` or an `admin_users` check).
- Keep one shared helper so client and server agree.

**Acceptance criteria**

- The admin email list does not appear in the client bundle.
- Client and server authorization agree.
- A non-admin cannot see the admin UI.

**Guideline** — `NEXT_PUBLIC_*` values are public by definition.

---

## 23. `security(checkout): recompute the payable total server-side`

**Problem** — `app/checkout/page.tsx` reads `localStorage.totalPrice` (lines 147–158) and passes it straight to the payment button as `amountUsd={totalPrice}` (line 458); `context/CartContext.jsx` also trusts stored line prices. Setting `totalPrice` to `0.01` (or editing a line price) reduces the amount actually charged.

**Recommended change**

- Recompute the payable total on the server from the cart's product ids and current prices.
- Pass only an order id and a server-signed total to the client.

**Acceptance criteria**

- Tampering with `localStorage` cannot reduce the charge.
- The server is the single source of truth for the amount.
- A test covers a tampered cart.

**Guideline** — Never trust a client-supplied price.

---

## 24. `security(admin): add search_path to the SECURITY DEFINER is_admin function`

**Problem** — `supabase/schema.sql` declares `public.is_admin()` as `security definer` (lines 49–62) without setting `search_path`. Supabase's linter flags this (`function_search_path_mutable`) as a privilege-escalation vector, because unqualified names resolve through a caller-influenced path.

**Recommended change**

- Add `set search_path = ''` and fully qualify `public.admin_users` in the body.
- Consider revoking execute from `public` and granting to the roles that need it.

**Acceptance criteria**

- The function has a pinned `search_path`.
- The Supabase security linter reports no issue for it.
- Admin checks still behave correctly.

**Guideline** — `SECURITY DEFINER` functions must pin `search_path`.

---

## 25. `security(checkout): call the imported validation helpers or delete them`

**Problem** — `app/checkout/page.tsx` imports `validateEmail`, `validateName`, `validateAddress`, `validateCardNumber`, `validateCardExpiry` and `validateCardCVV` (lines 38–45) but never calls any of them; only HTML `required`/`type=email` apply. The card handler strips digits but accepts any length (lines 292–306), so the validation the repo advertises is dead code.

**Recommended change**

- Call the validators in `handleSubmit` / `handleChange` and render field errors.
- Mark invalid fields with `aria-invalid` and gate submission.

**Acceptance criteria**

- Invalid email, name, address, card, expiry and CVV block submission with a visible message.
- A test asserts invalid input is rejected.
- No unused validation imports remain.

**Guideline** — Validate on the client for UX and on the server for safety.

---

## 26. `security(uploads): validate product image type and size before upload`

**Problem** — `lib/products.js` derives the stored extension from `file.name` and the content type from `file.type` with no allow-list and no size limit (`uploadProductImage`, lines 71–83), and the bucket is public. An accepted SVG/HTML payload would be served from the storage domain.

**Recommended change**

- Allow-list `image/png`, `image/jpeg`, `image/webp` and enforce a maximum size.
- Derive the extension from the MIME type, not the filename.
- Serve uploads with `X-Content-Type-Options: nosniff`.

**Acceptance criteria**

- Non-image and oversized files are rejected with a user-visible error.
- The stored extension matches the validated MIME type.
- A test covers rejection.

**Guideline** — Never trust client-supplied MIME type or filename.

---

## 27. `security(email): strip CRLF from email fields and pin recipients`

**Problem** — `lib/sendmail.js` forwards raw `name`, `email` and `message` plus caller-controlled `recipientEmail` and `subject` into EmailJS template params (lines 48–56). Both the contact form and checkout pass untrusted input, and the public key ships in the bundle, so the store's EmailJS quota and domain reputation can be abused.

**Recommended change**

- Strip CR/LF from any header-bound field and validate with `validateEmail` / `validateName` before sending.
- Disallow caller-chosen recipients for transactional mail.
- Add rate limiting or a captcha.

**Acceptance criteria**

- Newline injection into header-bound fields is impossible.
- Transactional recipients are fixed server-side.
- Abuse is rate-limited or captcha-gated.

**Guideline** — Header injection and open-relay abuse are classic email risks.

---

## 28. `security(env): fail fast on missing Supabase env instead of placeholder credentials`

**Problem** — `lib/supabase.js` constructs the client with `"https://placeholder.supabase.co"` and `"placeholder-anon-key"` when the variables are missing (lines 11–17). A misconfigured deployment therefore boots without complaint and every data and auth call fails against a fake project with confusing errors, even though `.env.local.example` marks these `[REQUIRED]`.

**Recommended change**

- Throw a clear, actionable error when required variables are absent.
- Keep placeholders out of the production path.

**Acceptance criteria**

- Missing configuration throws at startup with a message naming the variable.
- Tests that assert placeholder behaviour are updated.

**Guideline** — Fail fast on misconfiguration.

---

## 29. `security(env): call validateEnv at startup`

**Problem** — `lib/env.ts` defines `validateEnv()` (line 182) but nothing under `app/` imports it; only the test suite references it. Configuration problems are therefore never reported at runtime.

**Recommended change**

- Invoke `validateEnv()` once at startup (a server component or instrumentation hook).
- Surface the collected errors clearly.

**Acceptance criteria**

- Missing required variables produce a clear startup error.
- A test covers the failure path.

**Guideline** — Validate configuration at the application boundary.

---

## 30. `fix(orders): stop the cross-user buyer order cache leak`

**Problem** — `lib/buyer-orders.ts` filters cached orders with `||` clauses (lines 142–153), so any order lacking `userId`/`userEmail` is returned to **every** caller, and the `else` branch returns the entire device cache when no identifier is passed. `app/orders/page.tsx` passes the signed-in user, so on a shared browser one account can see another's orders, including names, totals and tx hashes.

**Recommended change**

- Filter with strict equality only; never surface non-matching entries.
- Scope the guest cache per user, or clear it on login.

**Acceptance criteria**

- A signed-in user sees only their own orders.
- Guest orders are not shown to a different account.
- A test covers the cross-user case.

**Guideline** — Least data exposure on shared devices.

---

## 31. `security(login): block protocol-relative open redirects`

**Problem** — `app/profile/login/page.jsx` treats any `redirect` starting with `/` as internal (lines 28–36), so the protocol-relative URL `//evil.com` passes the check and is then navigated to via `router.push` (lines 45 and 66). The comment states the intent the code does not enforce.

**Recommended change**

- Parse with `new URL(redirect, window.location.origin)` and require the origin to match.
- Reject values beginning with `//` or `/\`.

**Acceptance criteria**

- `//evil.com` and `/\evil.com` are rejected.
- Legitimate internal paths still redirect correctly.
- A test covers both cases.

**Guideline** — Open redirect prevention: resolve and compare origins, never prefix-match.

---

## 32. `security(headers): add a Content Security Policy or correct SECURITY.md`

**Problem** — `SECURITY.md` states a Content Security Policy is "Configured in Next.js headers" (line 65), but `next.config.mjs` sets only `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection` and `Referrer-Policy` (lines 31–54). No CSP exists anywhere, and `X-XSS-Protection` is deprecated and ignored by modern browsers.

**Recommended change**

- Add a real CSP (`default-src 'self'` plus the Stellar RPC, Supabase and Freighter origins), or correct the doc.
- Remove `X-XSS-Protection` or set it to `0`.

**Acceptance criteria**

- A CSP header is present in responses, or the doc matches reality.
- The deprecated header is removed.
- The app still functions (wallet connect, RPC calls, Supabase).

**Guideline** — OWASP secure headers: CSP is the primary XSS mitigation.

---

## 33. `docs(security): correct the RLS description in SECURITY.md`

**Problem** — `SECURITY.md` (lines 145–152) tells contributors the shipped policies allow any authenticated user to write products and to "tighten further for production". The schema already restricts product and storage writes to admins through `public.is_admin()`, so the doc describes an older, weaker policy set and misleads reviewers.

**Recommended change**

- Rewrite the section to describe the actual admin-only model.
- Link to the `is_admin()` helper.

**Acceptance criteria**

- The doc matches `supabase/schema.sql`.
- No stale "tighten later" advice remains.

**Guideline** — Security documentation must describe the deployed controls.

---

## 34. `security(supabase): make orders update and delete policies explicit`

**Problem** — `supabase/schema.sql` defines select and insert policies for `public.orders` but no update or delete policy, so the effective behaviour depends on RLS defaults (deny) while any admin flow that changes status has no sanctioned path. Ambiguity in a payments table is a security risk.

**Recommended change**

- Add explicit admin-only update/delete policies, or document that writes are insert-only and status is authoritative on-chain.

**Acceptance criteria**

- Update/delete on orders is denied by an explicit policy or allowed only for admins.
- The decision is documented in `supabase/README.md`.

**Guideline** — RLS defaults should be explicit, not accidental.

---

## 35. `fix(auth): make AuthContext use the shared admin helper`

**Problem** — `lib/AuthContext.js` re-implements admin detection against `NEXT_PUBLIC_ADMIN_EMAILS` (lines 13–22) instead of reusing `isAdminEmail` from `lib/env.ts`, and it disagrees with server-side RLS, which authorizes through `admin_users`/JWT. The result is an operator who sees the admin panel but whose writes all fail RLS, or the reverse.

**Recommended change**

- Reuse the shared helper and treat the server claim as the source of truth.

**Acceptance criteria**

- Exactly one implementation of the admin check.
- Client and server agree on who is an admin.

**Guideline** — A single source of truth for authorization.

---

## 36. `security(supabase): scope reads on the admin_users table`

**Problem** — `supabase/schema.sql` creates `public.admin_users` to back `is_admin()`. It holds the privileged allowlist, so its read policy must not expose the list to `anon` or ordinary `authenticated` users.

**Recommended change**

- Restrict select to the service role or admins only.
- Verify `is_admin()` still functions after tightening.

**Acceptance criteria**

- A non-admin cannot read `admin_users`.
- `is_admin()` continues to work.
- The policy decision is documented.

**Guideline** — Privileged allowlists must not be world-readable.

---

## 37. `fix(admin): enforce admin authorization on admin routes`

**Problem** — Admin protection relies on the client-side `components/AdminGuard.jsx`. There are no server route handlers or server actions performing an authorization check, so RLS is the only real control and the UI gate is bypassable.

**Recommended change**

- Add a server-side check (middleware or a server component guard).
- Keep RLS as defence in depth.

**Acceptance criteria**

- A non-admin navigating directly to `/admin` is blocked server-side.
- A test covers the denied case.

**Guideline** — Never rely on client-side route guards for authorization.

---

## 38. `security(otp): move OTP generation and verification off the client`

**Problem** — The checkout OTP is generated in the browser with `Math.random()` (`app/checkout/page.tsx` lines 51–53), emailed via EmailJS, then compared with an in-memory string comparison (line 128), with no expiry and no rate limiting. Because the EmailJS public key is in the bundle, the service can also be abused to send arbitrary mail.

**Recommended change**

- Generate, store (with expiry), verify and rate-limit the OTP on the server.

**Acceptance criteria**

- The OTP cannot be read or forged client-side.
- Attempts are rate-limited and the code expires.
- A test covers expiry and throttling.

**Guideline** — Verification secrets belong on the server.

---

## 39. `security(supabase): verify the on-chain payment before recording an order`

**Problem** — Order records are written from the browser using the anon key, with nothing verifying that a matching on-chain payment exists, so a client can record a "Paid" order that never happened.

**Recommended change**

- Write order rows from a server route that verifies the transaction or event against the checkout contract.

**Acceptance criteria**

- An order cannot be recorded without a verifiable on-chain payment.
- A test asserts an unverifiable order is rejected.

**Guideline** — The chain is the source of truth for payment state.

---

## 40. `docs(security): document the card field threat model`

**Problem** — `SECURITY.md` notes the card fields are UI-only placeholders, but the checkout collects card number, expiry and CVV (lines 308, 344, 375) in a non-PCI context, and the risk is not stated for contributors or operators.

**Recommended change**

- Document that no card data may be transmitted or stored, and mark the fields clearly as a demo affordance in the UI.

**Acceptance criteria**

- The doc and the UI both state the limitation.
- No card value leaves the browser.

**Guideline** — PCI scope avoidance: never transmit card data you do not intend to process.

---

# Batch 3 — Soroban contract correctness & tests (issues 41–60)

> ✅ **PUBLISHED — all 20 issues, GitHub [#493](../../issues/493)–[#512](../../issues/512) on 2026-09-27.** No labels applied (the Drip bot labels on campaign add).

> **⚠️ Blocked by an open defect.** `contracts/checkout/src/test.rs` does **not compile**: line 512 references `data_i128(ev_refund)`, neither of which is defined anywhere in the crate. This is the defect published as [#460](../../issues/460), which is still open. Every test issue in this batch edits that file, so **#460 should land first** — otherwise contributors hit a broken build before writing a line.

> **Three originally-numbered drafts were withdrawn and replaced** before anything was created, because their premise no longer held against current `main`. The replacement issues reuse those numbers; the withdrawn premises are recorded at the end of this batch.
>
> Draft→issue map: 41→[#493](../../issues/493), 42→[#494](../../issues/494), 43→[#510](../../issues/510), 44→[#495](../../issues/495), 45→[#496](../../issues/496), 46→[#497](../../issues/497), 47→[#498](../../issues/498), 48→[#499](../../issues/499), 49→[#500](../../issues/500), 50→[#511](../../issues/511), 51→[#501](../../issues/501), 52→[#502](../../issues/502), 53→[#503](../../issues/503), 54→[#504](../../issues/504), 55→[#505](../../issues/505), 56→[#506](../../issues/506), 57→[#507](../../issues/507), 58→[#508](../../issues/508), 59→[#509](../../issues/509), 60→[#512](../../issues/512).

---

### Complexity

| #   | Issue                                                                      | Complexity |
| --- | -------------------------------------------------------------------------- | ---------- |
| 41  | `fix(contracts): extend the token whitelist TTL when adding a token`       | medium     |
| 42  | `test(contracts): cover Order::is_escrowed`                                | medium     |
| 43  | `test(contracts): cover the contract reads before initialize`              | medium     |
| 44  | `test(contracts): cover set_merchant authorization failure`                | medium     |
| 45  | `test(contracts): cover add_token authorization failure`                   | medium     |
| 46  | `test(contracts): cover remove_token for an order already paid`            | medium     |
| 47  | `test(contracts): cover dispatching an already-dispatched order`           | medium     |
| 48  | `test(contracts): cover refunding an already-refunded order`               | medium     |
| 49  | `test(contracts): cover status and is_paid for a refunded order`           | medium     |
| 50  | `fix(contracts): stop pay from silently replacing a pending order's buyer` | medium     |
| 51  | `test(contracts): assert the order timestamp is recorded`                  | medium     |
| 52  | `test(contracts): cover paying an order created with a different token`    | medium     |
| 53  | `test(contracts): add a storage round-trip test for DataKey::Order`        | medium     |
| 54  | `test(contracts): cover the TokenAllowed key after remove_token`           | medium     |
| 55  | `test(contracts): verify TTL extension on set_order`                       | medium     |
| 56  | `fix(contracts): correct or remove the payment_received alias claim`       | trivial    |
| 57  | `chore(contracts): add the MIT license field to Cargo.toml`                | trivial    |
| 58  | `chore(contracts): declare a rust-version MSRV`                            | trivial    |
| 59  | `refactor(contracts): centralize TTL extension in the storage helpers`     | medium     |
| 60  | `test(contracts): cover TTL keep-alive on the read paths`                  | medium     |

## 41. `fix(contracts): extend the token whitelist TTL when adding a token`

**Problem** — `set_token_allowed` in `contracts/checkout/src/storage.rs` (lines 65–72) writes the whitelist entry without extending its TTL, unlike `set_admin` (lines 35–37) and `set_order` (lines 51–55), which both call `extend_ttl`. `add_token` is typically called once at deployment, so the `DataKey::TokenAllowed` entry receives the default persistent TTL and can be archived. After expiry, `is_token_allowed` returns `false` and every `pay` and `create_order` fails with `TokenNotAllowed` with no code change.

**Recommended change**

- Call `extend_ttl(env, &key)` in the `allowed == true` branch of `set_token_allowed`.

**Acceptance criteria**

- Whitelisting a token extends its TTL to the configured threshold.
- A test asserts the entry survives beyond the default TTL window.
- Existing whitelist behaviour is unchanged when `allowed` is false.

**Guideline** — Soroban persistent storage must be extended explicitly; whitelists are long-lived state.

---

## 42. `test(contracts): cover Order::is_escrowed`

**Problem** — `Order::is_escrowed` (`contracts/checkout/src/order.rs` line 41) returns `status == Paid`, but it is never referenced anywhere in `test.rs`. It is the predicate that distinguishes an escrowed order from a settled one, so an unverified regression here would be invisible.

**Recommended change**

- Add a test that asserts `is_escrowed` is true after `pay` and false after `dispatch` and after `refund`.

**Acceptance criteria**

- `is_escrowed` is exercised for Paid, Shipped and Refunded orders.
- The test fails if the predicate is inverted.

**Guideline** — Every public predicate that encodes lifecycle meaning needs direct coverage.

---

## 43. `test(contracts): cover the contract reads before initialize`

**Problem** — Every read entry point is exercised only on an initialized contract. `merchant()` (`contracts/checkout/src/lib.rs` lines 45–47) delegates to `get_admin`, which returns `Err(Error::NotInitialized)` when no admin is stored (`storage.rs` lines 24–33); `order()`, `status()` and `is_paid()` (lines 277–291) return `None`, `None` and `false` respectively. `test_pay_without_initialize` asserts `NotInitialized` for `dispatch` only, so the behaviour of the four read paths on a fresh contract is unasserted even though `merchant()` is the call an operator makes first to confirm a deployment.

**Recommended change**

- Add a test against an uninitialized contract asserting `merchant()` fails with `NotInitialized` and that `order()`, `status()` and `is_paid()` return `None`, `None` and `false`.

**Acceptance criteria**

- All four read paths are asserted on an uninitialized contract.
- `merchant()` returns `NotInitialized` rather than panicking.
- A test fails if any read starts returning a default value instead of the documented one.

**Guideline** — Reads are part of the ABI; their empty-state behaviour needs pinning too.
---

## 44. `test(contracts): cover set_merchant authorization failure`

**Problem** — `set_merchant` (`lib.rs` line 37) requires admin authorization, but only the success path is tested (`test_set_merchant_changes_escrow_destination`). A caller without the merchant's auth is untested.

**Recommended change**

- Add a test that calls `set_merchant` without mocking the admin auth and asserts an authorization failure.

**Acceptance criteria**

- An unauthorized `set_merchant` call fails.
- The merchant address is unchanged after the failed call.

**Guideline** — Authorization failures deserve the same coverage as successes.

---

## 45. `test(contracts): cover add_token authorization failure`

**Problem** — `add_token` (`lib.rs` line 52) requires admin auth, but only successful whitelisting is tested (`test_add_token_after_initialize`). An unauthorized caller is untested, so a missing `require_auth` would go unnoticed.

**Recommended change**

- Add a test that calls `add_token` without admin auth and asserts failure, then confirms the token is still not allowed.

**Acceptance criteria**

- An unauthorized `add_token` fails.
- `is_token_allowed` still returns false afterward.

**Guideline** — Privileged mutations must be tested for rejection.

---

## 46. `test(contracts): cover remove_token for an order already paid`

**Problem** — `test_remove_token_disables_payments` covers delisting before payment. The behaviour when an already-paid order's token is removed — whether `dispatch` and `refund` still succeed — is untested and ambiguous, which matters because escrowed funds must remain releasable.

**Recommended change**

- Add a test that pays, removes the token, then dispatches and asserts the escrow still reaches the merchant.

**Acceptance criteria**

- Delisting a token does not strand escrowed funds.
- The expected behaviour is asserted explicitly.

**Guideline** — Escrow escape hatches must keep working regardless of configuration changes.

---

## 47. `test(contracts): cover dispatching an already-dispatched order`

**Problem** — `test_dispatch_pending_order_rejected` covers a Pending order, but calling `dispatch` twice on a Shipped order is not directly asserted, so a double-release regression could pass.

**Recommended change**

- Add a test that dispatches, then calls `dispatch` again and asserts `InvalidOrderStatus`.

**Acceptance criteria**

- The second dispatch fails with `InvalidOrderStatus`.
- The merchant receives the escrow only once.

**Guideline** — State machines must reject repeated terminal transitions.

---

## 48. `test(contracts): cover refunding an already-refunded order`

**Problem** — `test_refund_after_dispatch_rejected` covers refund-after-dispatch, but refunding twice is untested, leaving a double-refund path unverified.

**Recommended change**

- Add a test that refunds, then calls `refund` again and asserts `InvalidOrderStatus`.

**Acceptance criteria**

- The second refund fails with `InvalidOrderStatus`.
- The buyer's balance is unchanged by the failed attempt.

**Guideline** — Double-spend style regressions must be explicitly excluded.

---

## 49. `test(contracts): cover status and is_paid for a refunded order`

**Problem** — `status` and `is_paid` are asserted for Pending, Paid and Shipped, but not for Refunded. `is_paid` returns true for Paid or Shipped, so the Refunded case (false) is the boundary that is untested.

**Recommended change**

- Add assertions that `status` is `Refunded` and `is_paid` is false after a refund.

**Acceptance criteria**

- Both reads are asserted post-refund.
- The test fails if `is_paid` includes Refunded.

**Guideline** — Boundary cases define the lifecycle contract.

---

## 50. `fix(contracts): stop pay from silently replacing a pending order's buyer`

**Problem** — `pay` treats a `Pending` order as overwritable: it loads the existing record and only rejects a status other than `Pending` (`contracts/checkout/src/lib.rs` lines 152–158), then writes a fresh `Order` built entirely from the `pay` arguments (lines 171–178). So if buyer A calls `create_order` for an order id and buyer B then calls `pay` with that same id, the contract accepts it, escrows **B's** amount and replaces the record — A's registered intent is destroyed with no error and no event. `pay` likewise never checks that the `token` or `amount` matches what `create_order` declared, so the binding between the two calls is unenforced rather than merely undocumented.

**Recommended change**

- Decide and enforce one rule: either bind `pay` to the recorded buyer/token/amount and reject a mismatch with a distinct error, or document that `create_order` is advisory and only the `pay` arguments are authoritative.
- Whichever is chosen, make the overwrite explicit rather than incidental.

**Acceptance criteria**

- A `pay` whose buyer differs from the `create_order` buyer has a defined, asserted outcome.
- The decision is recorded in `contracts/checkout/README.md`.
- A test covers the mismatch, and #502 covers the token case.

**Guideline** — A write path that silently discards another party's recorded state is a correctness defect, not a default.
---

## 51. `test(contracts): assert the order timestamp is recorded`

**Problem** — `OrderCreated` carries a `timestamp` field (`events.rs` line 43) and `Order.timestamp` is stored, but no test asserts that a timestamp is written or that it reflects ledger time, so a zero or constant timestamp would pass.

**Recommended change**

- Assert the stored `timestamp` is non-zero and matches the ledger timestamp used in the test.

**Acceptance criteria**

- The stored and emitted timestamps are asserted.
- A hardcoded or zero timestamp fails the test.

**Guideline** — Time is part of the data contract; pin it.

---

## 52. `test(contracts): cover paying an order created with a different token`

**Problem** — Nothing asserts what happens when `create_order` registers an order with one token and `pay` is called with another, which is exactly the kind of mismatch an integration would hit.

**Recommended change**

- Add a test that creates an order with token A and pays with token B, asserting the defined behaviour (rejection or overwrite).

**Acceptance criteria**

- The mismatch behaviour is asserted explicitly.
- The outcome is documented in the contract README.

**Guideline** — Cross-field consistency is a real integration failure mode.

---

## 53. `test(contracts): add a storage round-trip test for DataKey::Order`

**Problem** — `storage.rs` `set_order`/`get_order` (lines 40–55) are only covered indirectly through contract calls. There is no direct test that a written `Order` reads back with every field intact.

**Recommended change**

- Add a unit test writing and reading an `Order`, asserting all fields and status.

**Acceptance criteria**

- All five `Order` fields round-trip.
- A field truncation or ordering bug fails the test.

**Guideline** — Serialization round-trips deserve direct tests.

---

## 54. `test(contracts): cover the TokenAllowed key after remove_token`

**Problem** — `remove_token` removes the `DataKey::TokenAllowed` entry, but no test asserts the key is actually gone rather than set to false, which matters for TTL and storage-rent behaviour.

**Recommended change**

- Assert `env.storage().persistent().has(&key)` is false after `remove_token`.

**Acceptance criteria**

- The key is absent after removal.
- `is_token_allowed` still returns false.

**Guideline** — Distinguish "absent" from "present and false" in storage.

---

## 55. `test(contracts): verify TTL extension on set_order`

**Problem** — `set_order` calls `extend_ttl` (lines 51–55), but no test asserts the TTL is actually extended, so removing or misconfiguring the call would not be caught. The same applies to `set_admin`.

**Recommended change**

- Add tests asserting the TTL of `DataKey::Order` and `DataKey::Admin` is extended to `LEDGER_TO_EXTEND_TO` after a write.

**Acceptance criteria**

- Both TTLs are asserted.
- Removing `extend_ttl` fails a test.

**Guideline** — TTL management is behaviour, not an implementation detail.

---

## 56. `fix(contracts): correct or remove the payment_received alias claim`

**Problem** — `contracts/checkout/src/lib.rs` (around line 133) documents `pay` as emitting "`pay` (aliased `payment_received`)", but `events.rs` defines exactly one topic, `pay`, with no alias. The misleading comment propagates to any integration reading the source.

**Recommended change**

- Remove the alias claim, or document the single canonical topic.

**Acceptance criteria**

- The doc comment matches `events.rs`.
- No reference to `payment_received` remains in the contract sources.

**Guideline** — Event names are ABI; documentation must match exactly.

---

## 57. `chore(contracts): add the MIT license field to Cargo.toml`

**Problem** — `contracts/checkout/Cargo.toml` declares `publish = false` but carries no `license` field, even though the repository `LICENSE` is MIT and the README advertises an MIT reference implementation. Anyone copying the crate cannot machine-read its license.

**Recommended change**

- Add `license = "MIT"` (or ship a `LICENSE` file under `contracts/checkout/`).

**Acceptance criteria**

- The crate metadata declares MIT.
- It matches the repository `LICENSE`.

**Guideline** — Machine-readable licensing matters for a public-good reference implementation.

---

## 58. `chore(contracts): declare a rust-version MSRV`

**Problem** — `contracts/checkout/Cargo.toml` has no `rust-version`, while CI pins `RUST_VERSION: "1.91.0"`. Contributors cannot tell which toolchain is supported, and a toolchain bump can silently change build behaviour.

**Recommended change**

- Add a `rust-version` field matching the CI toolchain.

**Acceptance criteria**

- `rust-version` is present and matches CI.
- Building with an older toolchain reports the MSRV clearly.

**Guideline** — Declare the supported toolchain explicitly.

---

## 59. `refactor(contracts): centralize TTL extension in the storage helpers`

**Problem** — `extend_ttl` is called inconsistently: `set_admin` and `set_order` extend, `set_token_allowed` does not ([#493](../../issues/493)), and the threshold constants live at the top of `storage.rs`. The pattern is easy to forget for any new key.

**Recommended change**

- Route every persistent write through a helper that always extends, so a new key cannot be added without TTL handling.

**Acceptance criteria**

- Every persistent write path extends TTL.
- Adding a new `DataKey` variant without TTL handling is caught in review or by test.

**Guideline** — Make the correct behaviour the default path.

---

## 60. `test(contracts): cover TTL keep-alive on the read paths`

**Problem** — TTL is extended on two read paths as well as the writes: `get_admin` calls `extend_ttl` after a successful load (`storage.rs` lines 26–30) and `get_order` does the same (lines 45–47), so merely reading an order keeps it alive. Only the write-path extension is a candidate for testing (#505); the read-path keep-alive is asserted nowhere, so removing those two `extend_ttl` calls — which would let a frequently-read order archive out from under an active checkout — would not fail any test.

**Recommended change**

- Add tests asserting the TTL of `DataKey::Admin` and `DataKey::Order` is extended by a read alone, with no intervening write.

**Acceptance criteria**

- A read is shown to extend TTL for both keys.
- Removing `extend_ttl` from either read path fails a test.

**Guideline** — Keep-alive behaviour on the read path is load-bearing for long-lived state.

### Withdrawn before publishing

Three originally-numbered drafts were replaced after re-verifying them against current `main`; the premises no longer held. Because they were withdrawn **before** any issue was created, their numbers were reused for the replacement issues above rather than leaving gaps.

- **Draft 43** — Already satisfied: `contracts/checkout/src/test.rs` has 14 assertions of the form `assert_eq!(result, Err(Ok(Error::X)))` covering all seven `Error` variants.
- **Draft 50** — Premise false: `test_non_positive_amount_rejected` already asserts `create_order` with `-1` at lines 397-398. Residual gap: `create_order(0)` and `pay(-1)`.
- **Draft 60** — Already documented: `contracts/checkout/README.md` carries a per-event topics/data table plus a dedicated `pay` topic block.

---

# Batch 4 — Stellar client correctness (issues 61–80)

> ✅ **PUBLISHED — all 20 issues, GitHub [#513](../../issues/513)–[#532](../../issues/532) on 2026-09-27.** No labels applied (the Drip bot labels on campaign add).

> **⚠️ Two batches overlapped.** Drafts 68, 69 and 72 in this batch describe the same defects as drafts 209, 210 and 201/202 in Batch 11 — an error I introduced when drafting Batch 11 without cross-checking the earlier batches. This batch is the earlier wave, so the issues were published here and the Batch 11 duplicates are marked superseded (see Batch 11).

> Draft→issue map: 61→[#513](../../issues/513), 62→[#514](../../issues/514), 63→[#515](../../issues/515), 64→[#516](../../issues/516), 65→[#517](../../issues/517), 66→[#518](../../issues/518), 67→[#519](../../issues/519), 68→[#520](../../issues/520), 69→[#521](../../issues/521), 70→[#522](../../issues/522), 71→[#523](../../issues/523), 72→[#524](../../issues/524), 73→[#525](../../issues/525), 74→[#526](../../issues/526), 75→[#527](../../issues/527), 76→[#528](../../issues/528), 77→[#529](../../issues/529), 78→[#530](../../issues/530), 79→[#531](../../issues/531), 80→[#532](../../issues/532).

---

### Complexity

| #   | Issue                                                                             | Complexity |
| --- | --------------------------------------------------------------------------------- | ---------- |
| 61  | `fix(stellar): resolve the order id from the correct event topic in eventToOrder` | high       |
| 62  | `fix(stellar): stop eventToOrder falling back to the token address`               | medium     |
| 63  | `fix(stellar): format amounts from bigint instead of Number`                      | trivial    |
| 64  | `fix(stellar): remove the dead account lookup branch in readOrder`                | medium     |
| 65  | `fix(stellar): re-throw non-404 errors in getTrustline`                           | medium     |
| 66  | `fix(stellar): handle TRY_AGAIN_LATER when submitting a payment`                  | medium     |
| 67  | `fix(stellar): retry transient getTransaction failures in waitForTransaction`     | medium     |
| 68  | `fix(stellar): stop the indexer skipping events after any poll error`             | high       |
| 69  | `fix(stellar): recover from cursor expiry in the indexer`                         | high       |
| 70  | `fix(stellar): guard against overlapping indexer ticks`                           | medium     |
| 71  | `fix(stellar): bound the indexer seenIds set`                                     | medium     |
| 72  | `fix(stellar): derive the USDC contract from the network on mainnet`              | medium     |
| 73  | `fix(stellar): validate CHECKOUT_CONTRACT_ID in the indexer`                      | trivial    |
| 74  | `fix(stellar): validate CHECKOUT_CONTRACT_ID in the admin order actions`          | trivial    |
| 75  | `fix(stellar): pass token decimals to usdToRawUnits`                              | trivial    |
| 76  | `fix(stellar): remove the dead ternary in formatTokenPrice`                       | trivial    |
| 77  | `fix(stellar): use live fee budgeting in dispatch and refund`                     | high       |
| 78  | `fix(stellar): remove the unused FEE_BUFFER_STROOPS import or use it`             | trivial    |
| 79  | `fix(stellar): reconcile the mainnet RPC default with lib/env.ts`                 | trivial    |
| 80  | `test(stellar): cover readOrder with a mocked RPC`                                | medium     |

## 61. `fix(stellar): resolve the order id from the correct event topic in eventToOrder`

**Problem** — `lib/stellar/orders.ts` line 428 resolves the order id with `fields.order_id || fields.topic1 || ""`. For the contract's `pay` event the topics are `(pay, token, buyer, merchant, order_id)` (`events.rs` lines 8–22), so `topic1` is the **token contract address** and the order id is `topic4`. For `create_order` the topics are `(create_order, token, buyer, order_id)` (lines 30–43), so `topic1` is again the token. The admin dashboard therefore stores the USDC SAC address as the order id, and `dispatchOrder`/`refundOrder` hash it and fail with `OrderNotFound`. Only `dispatch`/`refund` events (whose `topic1` is the order id) resolve correctly, which is why a manually dispatched order appears to work.

**Recommended change**

- Resolve the id from the position the contract documents: `fields.order_id || fields.topic4`, and the buyer from `topic2`/`topic3` per event.
- Update the test fixtures, which currently inject a `fields.order_id` key the real indexer never emits for `pay`.

**Acceptance criteria**

- `eventToOrder` maps the correct id and buyer for all four events.
- Admin dispatch targets the real order id rather than the token address.
- Tests use real topic layouts and fail against the old mapping.

**Guideline** — Positional event decoding must match the contract's declared topic order.

---

## 62. `fix(stellar): stop eventToOrder falling back to the token address`

**Problem** — The `fields.topic1` fallback (line 428) silently substitutes the token contract address when an explicit id is missing, producing a plausible-looking but wrong identifier instead of an error.

**Recommended change**

- Remove the `topic1` fallback; return `null` or raise a typed error when the id cannot be resolved.

**Acceptance criteria**

- An unresolvable event never yields a token address as an order id.
- A test covers the unresolvable case.

**Guideline** — Fail loudly rather than fabricate identity.

---

## 63. `fix(stellar): format amounts from bigint instead of Number`

**Problem** — `lib/stellar/orders.ts` formats amounts with `(Number(order.amount) / Math.pow(10, decimals)).toFixed(2)` at lines 185 and 447. Amounts are `i128` raw units, so `Number()` loses integer precision above 2^53 and large orders display incorrectly. `formatAmount(raw, decimals)` in `lib/stellar/account.ts` (lines 281–289) already does this correctly but is not used here.

**Recommended change**

- Reuse `formatAmount`, or format from the decimal string.

**Acceptance criteria**

- Values above 2^53 format exactly.
- A test pins the output for a large `i128`.

**Guideline** — Never convert money-like integers through floating point.

---

## 64. `fix(stellar): remove the dead account lookup branch in readOrder`

**Problem** — `lib/stellar/orders.ts` fetches a random keypair's account (lines 91–99) and only parses the order when that lookup **fails**, because the parse block is nested under `if (!account)`; otherwise it returns `null` at line 191. The happy path is therefore unreachable, the function burns an RPC round trip on a throwaway keypair, and the account it fetched is unused.

**Recommended change**

- Drop the dummy `getAccount` call and always simulate against the deterministic source account used by `simulateContractRead`.

**Acceptance criteria**

- `readOrder` parses in every case; no random-keypair RPC call is made.
- A test covers a found order and an absent order.

**Guideline** — Deterministic simulation sources; no unreachable branches.

---

## 65. `fix(stellar): re-throw non-404 errors in getTrustline`

**Problem** — `lib/stellar/account.ts` catches every error in `getTrustline` and returns `{ hasTrustline: false, ... }` (lines 173–178). A network failure, timeout or malformed-asset error is therefore indistinguishable from a genuinely missing trustline, and `assertPaymentReady` advises the user to add a trustline that already exists (lines 231–238). `getNativeBalance` (lines 130–148) handles this correctly.

**Recommended change**

- Reuse the `isAccountMissingError` classification: re-throw non-"not found" errors as `WalletError("RPC_ERROR")`; only report `hasTrustline: false` on a confirmed missing balance entry.

**Acceptance criteria**

- Transient RPC errors surface as errors, not as "no trustline".
- Only a confirmed-missing balance reports `hasTrustline: false`.
- A test covers both a missing trustline and an RPC failure.

**Guideline** — Do not convert infrastructure failures into user action.

---

## 66. `fix(stellar): handle TRY_AGAIN_LATER when submitting a payment`

**Problem** — `lib/stellar/checkout.ts` handles `status === "ERROR"` (line 143) and `"PENDING"`/`"DUPLICATE"` (line 149) but not the SDK's `"TRY_AGAIN_LATER"`, which can carry no usable hash, so `waitForTransaction(sendResponse.hash)` (line 154) may poll `undefined`.

**Recommended change**

- Handle `TRY_AGAIN_LATER`: back off and resubmit, or surface a distinct retryable error.

**Acceptance criteria**

- `TRY_AGAIN_LATER` produces an actionable retryable error and never polls an undefined hash.
- A test covers the branch.

**Guideline** — Handle every documented submission status.

---

## 67. `fix(stellar): retry transient getTransaction failures in waitForTransaction`

**Problem** — `lib/stellar/events.ts` polls `server.getTransaction(hash)` in a bare loop with no `try`/`catch` (lines 29–56). A single transient rejection propagates out of `payWithStellar`, which then reports payment failure even though the transaction may already be in escrow, telling the buyer their funds failed while they are held.

**Recommended change**

- Wrap each `getTransaction` call in `try`/`catch`, record the error and continue until the deadline.

**Acceptance criteria**

- A transient failure mid-poll does not fail an otherwise successful payment.
- The final error, if any, includes the last RPC error.
- A test covers a failing then succeeding poll.

**Guideline** — Confirmation polling must tolerate transient RPC errors.

---

## 68. `fix(stellar): stop the indexer skipping events after any poll error`

**Problem** — `lib/stellar/indexer.ts` calls `recoverFromRetentionError()` from the catch block for **any** error (lines 184, 204–211), and that method advances `startLedger` to `latestLedger - 5`. A single network timeout therefore moves the scan window forward and permanently drops every event in between, silently losing orders from the admin table.

**Recommended change**

- Only recover when the error is specifically a retention/`startLedger` error (inspect message or code).
- Otherwise retry the same window.

**Acceptance criteria**

- A transient error does not advance the window.
- No events are skipped by a transient failure.
- A test covers a transient error followed by a successful poll.

**Guideline** — Distinguish recoverable retention errors from transient failures.

---

## 69. `fix(stellar): recover from cursor expiry in the indexer`

**Problem** — After the first successful poll the indexer clears `startLedger` (lines 155–158) and switches to `cursor`. If the cursor later falls outside RPC retention, `recoverFromRetentionError` does nothing because `startLedger` is `undefined`, so `fetchEvents` replays a dead cursor forever and the indexer never recovers.

**Recommended change**

- On cursor expiry, clear the cursor and re-derive `startLedger` from `getLatestLedger()`.

**Acceptance criteria**

- An expired cursor recovers automatically and resumes from a valid ledger.
- A test covers cursor expiry.

**Guideline** — Pagination state needs an explicit recovery path.

---

## 70. `fix(stellar): guard against overlapping indexer ticks`

**Problem** — `lib/stellar/indexer.ts` starts `setInterval(() => void this.tick(callbacks), this.pollMs)` (line 102) without waiting for the previous tick, and `EVENT_POLL_INTERVAL_MS` is 4s. On a slow RPC two ticks run concurrently and both read/write `this.cursor` and `this.seenIds`; the cursor assignment is last-writer-wins, so a stale response can move it backwards or skip events.

**Recommended change**

- Track an in-flight flag (or chain a recursive `setTimeout`) and return early if a tick is already running.

**Acceptance criteria**

- At most one tick executes at a time.
- A slow response cannot rewind the cursor.
- A test asserts no overlap.

**Guideline** — Serialize polling loop iterations.

---

## 71. `fix(stellar): bound the indexer seenIds set`

**Problem** — `private readonly seenIds = new Set<string>()` (`indexer.ts` lines 63, 167) accumulates every event id ever seen and is never trimmed. The admin orders page keeps an indexer alive for the lifetime of the tab, so memory grows without bound on a long-lived dashboard.

**Recommended change**

- Bound the set (keep the last N ids, or prune below the cursor's ledger).
- Clear it in `stop()`.

**Acceptance criteria**

- `seenIds` stays bounded over a long simulated run.
- De-duplication still works.
- A test asserts the bound.

**Guideline** — Long-lived sets need eviction.

---

## 72. `fix(stellar): derive the USDC contract from the network on mainnet`

**Problem** — `lib/stellar/config.ts` resolves `USDC_CONTRACT_ID` to the testnet USDC contract when the env var is unset (lines 39–45) and uses `TESTNET_USDC_ISSUER` unconditionally (line 85, referenced by `SUPPORTED_TOKENS`). `NATIVE_ASSET_CONTRACT_ID` has a mainnet branch (lines 53–60) but USDC does not, so a mainnet deployment with `NEXT_PUBLIC_USDC_CONTRACT_ID` unset builds `pay` calls against testnet USDC and checks trustlines against the wrong issuer.

**Recommended change**

- Add a `MAINNET_USDC_CONTRACT_ID` branch, or throw when it is unset on mainnet.
- Make the issuer network-derived or configurable.

**Acceptance criteria**

- Mainnet without explicit USDC config fails clearly instead of silently using testnet.
- A test covers both networks.

**Guideline** — Network-specific defaults must never silently cross networks.

---

## 73. `fix(stellar): validate CHECKOUT_CONTRACT_ID in the indexer`

**Problem** — `payWithStellar` validates the contract id and throws `CONTRACT_NOT_CONFIGURED` when empty (`checkout.ts` lines 83–88), but `PaymentEventIndexer` defaults `this.contractId = opts.contractId ?? CHECKOUT_CONTRACT_ID` with no check (`indexer.ts` line 80). A misconfigured deploy therefore sends `filters: [{ contractIds: [""] }]` forever and the dashboard loops on `getEvents failed`.

**Recommended change**

- Validate the id in the constructor (including `StrKey.isValidContract`) and fail fast.

**Acceptance criteria**

- An empty or invalid contract id fails at construction with a clear message.
- A test covers the invalid case.

**Guideline** — Validate configuration at construction, not per request.

---

## 74. `fix(stellar): validate CHECKOUT_CONTRACT_ID in the admin order actions`

**Problem** — `readOrder`, `dispatchOrder` and `refundOrder` build `new Contract(CHECKOUT_CONTRACT_ID)` unconditionally (`orders.ts` lines 85, 207, 280), so an unset env fails deep inside a call with a confusing error instead of failing fast.

**Recommended change**

- Validate the contract id at the top of each entry point and throw a clear error.

**Acceptance criteria**

- A clear error is raised before any RPC call when the id is missing.
- A test covers the missing-config case.

**Guideline** — Fail fast on invalid configuration.

---

## 75. `fix(stellar): pass token decimals to usdToRawUnits`

**Problem** — `lib/stellar/checkout.ts` computes `Math.round(amountUsd * 10 ** USDC_DECIMALS)` (lines 59–63) but the function is called for **every** token (line 93), including native XLM. It is correct today only because both `SUPPORTED_TOKENS` entries declare `decimals: 7`; any 6- or 8-decimal SEP-41 token added to the whitelist would be converted off by 10x.

**Recommended change**

- Accept `decimals` (or the `TokenConfig`) as a parameter and pass `token.decimals`.

**Acceptance criteria**

- Conversion uses the selected token's decimals.
- A test with a non-7-decimal token passes.

**Guideline** — Do not hardcode a unit that varies by asset.

---

## 76. `fix(stellar): remove the dead ternary in formatTokenPrice`

**Problem** — `lib/stellar/price.ts` lines 54–55 read `const decimals = symbol === "XLM" ? 2 : 2;` — both branches are identical, so the conditional is meaningless, and the value is then used as `minimumFractionDigits` while `maximumFractionDigits` is 4.

**Recommended change**

- Remove the conditional (use a literal 2) or branch meaningfully per symbol.

**Acceptance criteria**

- No no-op conditional remains.
- Formatting output is unchanged (or newly specified and tested).

**Guideline** — Dead logic obscures intent.

---

## 77. `fix(stellar): use live fee budgeting in dispatch and refund`

**Problem** — `lib/stellar/orders.ts` hardcodes `fee: "100000"` in `TransactionBuilder` (lines 214 and 287), while the buyer path derives fees from live stats via `budgetFee` (`simulate.ts` lines 201–210, used in `checkout.ts` line 129). If Soroban inclusion fees rise above the literal, merchant dispatch and refund are rejected as underfunded while buyer payments still succeed — an asymmetry that is hard to diagnose.

**Recommended change**

- Replace the literal with `budgetFee(...)` / `recommendedInclusionFee(...)`.
- Reuse `prepareAndReport` and the shared confirmation helper instead of re-implementing simulate/assemble/submit/poll.

**Acceptance criteria**

- Dispatch and refund use live fee data.
- A test simulates a raised fee base and still succeeds.

**Guideline** — Fee budgets must track network conditions.

---

## 78. `fix(stellar): remove the unused FEE_BUFFER_STROOPS import or use it`

**Problem** — `lib/stellar/orders.ts` line 25 imports `FEE_BUFFER_STROOPS` from the stellar config and never references it; the value it should inform is instead the hardcoded `"100000"` from [#529](../../issues/529).

**Recommended change**

- Use it as part of the fee calculation, or delete the import.

**Acceptance criteria**

- No unused import remains and `npm run lint` passes.

**Guideline** — Imports should reflect real dependencies.

---

## 79. `fix(stellar): reconcile the mainnet RPC default with lib/env.ts`

**Problem** — `lib/stellar/config.ts` (lines 18–24) comments that its mainnet default is "in step" with `STELLAR_DEFAULTS.mainnet` and the deployment doc, but `lib/env.ts` line 56 defines a different URL. Which endpoint an unset deploy uses therefore depends on which module reads it first.

**Recommended change**

- Choose one canonical mainnet RPC URL and reference it from both modules, or have `config.ts` import `loadStellarConfig()`.
- Correct the stale comment.

**Acceptance criteria**

- Both modules resolve the same mainnet URL.
- A test pins the resolved value.

**Guideline** — One default per setting.

---

## 80. `test(stellar): cover readOrder with a mocked RPC`

**Problem** — `readOrder` (`orders.ts` line 85) is the only export in that module with no direct test; `tests/lib/stellar/orders.test.ts` imports `dispatchOrder`, `refundOrder`, `resolveOrderIdHash` and `eventToOrder` only. Combined with the dead branch in [#516](../../issues/516), its behaviour is effectively unverified.

**Recommended change**

- Add tests for a found order, an absent order, and an RPC error using a mocked server.

**Acceptance criteria**

- All three paths are asserted.
- Returned fields (status, amount, token, buyer, timestamp) are checked.

**Guideline** — Untested read paths hide encoding bugs.

---

# Batch 5 — Stellar client robustness & tests (issues 81–100)

> ✅ **PUBLISHED — all 20 issues, GitHub [#533](../../issues/533)–[#552](../../issues/552) on 2026-09-27.** No labels applied (the Drip bot labels on campaign add).

> Draft&rarr;issue map: 81&rarr;[#533](../../issues/533), 82&rarr;[#534](../../issues/534), 83&rarr;[#535](../../issues/535), 84&rarr;[#536](../../issues/536), 85&rarr;[#537](../../issues/537), 86&rarr;[#538](../../issues/538), 87&rarr;[#539](../../issues/539), 88&rarr;[#540](../../issues/540), 89&rarr;[#541](../../issues/541), 90&rarr;[#542](../../issues/542), 91&rarr;[#543](../../issues/543), 92&rarr;[#544](../../issues/544), 93&rarr;[#545](../../issues/545), 94&rarr;[#546](../../issues/546), 95&rarr;[#547](../../issues/547), 96&rarr;[#548](../../issues/548), 97&rarr;[#549](../../issues/549), 98&rarr;[#550](../../issues/550), 99&rarr;[#551](../../issues/551), 100&rarr;[#552](../../issues/552).

> **Three drafts were corrected before publishing** rather than created as written: **94** (its "Recommended change" told the contributor to implement the fix that draft 99 already files, so it was rewritten as a test-only ask and now cross-links [#551](../../issues/551)); **100** (claimed `addressToScVal` duplicated the widening cast — it does not, it uses `new Address()`; the real defect is that `toSdkBytes` is dead code beside the cast it was written to own); **249** in Batch 13 (overlapped 100 on the same `scval.ts:42` cast, so it is now scoped to the two contract-address casts and no longer covers the `bytes32` one).

---

### Complexity

| #   | Issue                                                                             | Complexity |
| --- | --------------------------------------------------------------------------------- | ---------- |
| 81  | `test(stellar): cover eventToOrder topic mapping for all four events`             | medium     |
| 82  | `test(stellar): replace fabricated order_id fixtures with real topic layouts`     | medium     |
| 83  | `test(stellar): cover payWithStellar TRY_AGAIN_LATER handling`                    | medium     |
| 84  | `test(stellar): cover waitForTransaction retry behavior`                          | medium     |
| 85  | `test(stellar): cover indexer recovery after a transient error`                   | medium     |
| 86  | `test(stellar): cover indexer cursor expiry recovery`                             | medium     |
| 87  | `test(stellar): make the indexer tests deterministic with fake timers`            | medium     |
| 88  | `test(stellar): cover getTrustline error classification`                          | medium     |
| 89  | `test(stellar): cover resolveOrderIdHash hex passthrough`                         | medium     |
| 90  | `test(stellar): cover isOrderIdHashHex with a 64-hex human id`                    | medium     |
| 91  | `test(stellar): cover formatAmount with large i128 values`                        | trivial    |
| 92  | `test(stellar): cover scValToString for every supported type`                     | medium     |
| 93  | `test(stellar): cover decodePaymentEvent for non-pay and foreign-contract events` | medium     |
| 94  | `test(stellar): cover verifyOrderOnChain ownership`                               | medium     |
| 95  | `test(stellar): cover assertPaymentReady strict mode`                             | medium     |
| 96  | `test(stellar): cover the loadAccount friendbot funding path`                     | medium     |
| 97  | `test(stellar): cover simulateContractRead when simulation returns null`          | trivial    |
| 98  | `test(stellar): cover budgetFee and recommendedInclusionFee`                      | medium     |
| 99  | `fix(stellar): verify order ownership in verifyOrderOnChain`                      | medium     |
| 100 | `fix(stellar): use the toSdkBytes helper in bytes32ToScVal`                       | trivial    |

## 81. `test(stellar): cover eventToOrder topic mapping for all four events`

**Problem** — `mergeOrderEvents` and `eventToOrder` (`lib/stellar/orders.ts` lines 397, 478) drive the admin table, but no test asserts the id/buyer/amount mapping for `create_order`, `pay`, `dispatch` and `refund` against their **real** topic layouts. The existing tests pass because they inject a synthetic `order_id` field.

**Recommended change**

- Add a fixture per event, built from the topic order declared in `contracts/checkout/src/events.rs`, and assert the resolved order fields.

**Acceptance criteria**

- All four events are covered with real topic positions.
- The test fails if `topic1` is used as the order id.

**Guideline** — Test against the producer's declared layout, not a convenient fixture.

---

## 82. `test(stellar): replace fabricated order_id fixtures with real topic layouts`

**Problem** — `tests/lib/stellar/orders.test.ts` (lines 108–121) and `tests/app/admin-orders-dispatch-id.test.tsx` (lines 16–23) inject a `fields.order_id` key that the real indexer never emits for a `pay` event, so the suite actively masks the defect in [#513](../../issues/513).

**Recommended change**

- Rebuild the fixtures from the actual `topic1..topicN` output shape produced by `decodeEvent`.

**Acceptance criteria**

- No fixture supplies a field the indexer does not produce.
- The corrected fixtures expose the previous mis-mapping.

**Guideline** — A fixture that cannot occur in production is a false negative.

---

## 83. `test(stellar): cover payWithStellar TRY_AGAIN_LATER handling`

**Problem** — [#518](../../issues/518) adds handling for the `TRY_AGAIN_LATER` submission status; without a test the branch is unguarded.

**Recommended change**

- Mock the submission response to return `TRY_AGAIN_LATER` and assert the retryable error and that no undefined hash is polled.

**Acceptance criteria**

- The retryable path is asserted.
- `waitForTransaction` is not called with an undefined hash.

**Guideline** — Every new error branch needs a test.

---

## 84. `test(stellar): cover waitForTransaction retry behavior`

**Problem** — [#519](../../issues/519) adds retry-on-transient-error to the confirmation poll; a single mocked rejection must not fail the payment.

**Recommended change**

- Mock `getTransaction` to reject once then succeed and assert the payment resolves.

**Acceptance criteria**

- The poll survives one transient rejection.
- The final error path, when it times out, includes the last RPC error.

**Guideline** — Test the flaky path deliberately.

---

## 85. `test(stellar): cover indexer recovery after a transient error`

**Problem** — [#520](../../issues/520) restricts retention recovery to genuine retention errors. No test asserts that a transient error leaves the window unchanged and loses no events.

**Recommended change**

- Mock an error that is not retention-related, then a successful poll, and assert no events were skipped.

**Acceptance criteria**

- The scan window is unchanged after a transient error.
- Events between the error and the recovery are still emitted.

**Guideline** — Prove the data-loss path is closed.

---

## 86. `test(stellar): cover indexer cursor expiry recovery`

**Problem** — [#521](../../issues/521) adds cursor-expiry recovery; the path needs coverage so the indexer cannot silently stall.

**Recommended change**

- Simulate a cursor out of retention and assert the indexer clears it and re-derives a start ledger.

**Acceptance criteria**

- The indexer resumes polling after expiry.
- It does not replay the dead cursor indefinitely.

**Guideline** — Recovery paths are only real if tested.

---

## 87. `test(stellar): make the indexer tests deterministic with fake timers`

**Problem** — `tests/lib/stellar/indexer.test.ts` advances real time with tight margins (lines 48, 57, 89, 115, 119, 604), for example a `pollMs: 50` interval asserted inside a 15 ms sleep. On a loaded CI runner the window cannot reliably contain the first tick, so the suite is intermittently flaky.

**Recommended change**

- Use `vi.useFakeTimers()` with `vi.advanceTimersByTimeAsync()`, as the hook and Toast tests already do.
- Or replace sleeps with an await-until-predicate helper with a generous bound.

**Acceptance criteria**

- No test depends on wall-clock margins.
- The suite passes repeatedly on a loaded machine.

**Guideline** — Deterministic tests only; never race the scheduler.

---

## 88. `test(stellar): cover getTrustline error classification`

**Problem** — [#517](../../issues/517) changes `getTrustline` to distinguish a missing trustline from an RPC failure; both branches need coverage.

**Recommended change**

- Add a test for a genuinely missing balance entry and one for a rejected RPC call.

**Acceptance criteria**

- A missing trustline yields `hasTrustline: false`.
- An RPC failure throws rather than reporting no trustline.

**Guideline** — Distinguish "absent" from "unknown".

---

## 89. `test(stellar): cover resolveOrderIdHash hex passthrough`

**Problem** — `resolveOrderIdHash` (`lib/stellar/scval.ts` line 171) has two paths: hash a short pre-image, or pass a 64-hex value through unchanged. `tests/lib/resolve-order-id-hash.test.ts` exists but the passthrough must be pinned precisely, since getting it wrong re-introduces the dispatch/refund mismatch.

**Recommended change**

- Assert the returned bytes for a 64-hex input equal the raw hex bytes, and that a short id is hashed.

**Acceptance criteria**

- Both paths are asserted byte-for-byte.
- SHA-256 is applied exactly once.

**Guideline** — Pin hash semantics; they are contract ABI.

---

## 90. `test(stellar): cover isOrderIdHashHex with a 64-hex human id`

**Problem** — `isOrderIdHashHex` (`scval.ts` lines 155–159) treats **any** 64-character hex string as an already-hashed id, so a genuine human order id that happens to be 64 hex characters would be passed to the contract unhashed.

**Recommended change**

- Add a test documenting the ambiguity and decide the policy (e.g. require a prefix, or document that raw ids must not be 64-hex).

**Acceptance criteria**

- The edge case is covered by a test.
- The chosen policy is documented in code and the README.

**Guideline** — Ambiguous encodings need an explicit contract.

---

## 91. `test(stellar): cover formatAmount with large i128 values`

**Problem** — `formatAmount` (`account.ts` lines 281–289) is the correct bigint formatter but has no test at the precision boundary, which is exactly where `Number()`-based formatting breaks ([#515](../../issues/515)).

**Recommended change**

- Add tests above 2^53 raw units and at each decimal boundary.

**Acceptance criteria**

- Large values format exactly.
- The test fails if the implementation switches to `Number`.

**Guideline** — Test at the boundary where the naive implementation breaks.

---

## 92. `test(stellar): cover scValToString for every supported type`

**Problem** — `scValToString` (`scval.ts` line 67) is the decoder behind event and order fields, but tests do not cover every `xdr.ScVal` branch, so a mis-decoded type could silently produce wrong values.

**Recommended change**

- Add a table-driven test per supported type (address, bytes, symbol, map, vec, i128, u64, bool).

**Acceptance criteria**

- Each supported type is asserted.
- An unknown type degrades safely rather than throwing.

**Guideline** — Table-driven decoding tests scale with the type set.

---

## 93. `test(stellar): cover decodePaymentEvent for non-pay and foreign-contract events`

**Problem** — `decodePaymentEvent` (`events.ts` line 60) must return null for non-pay events and for events from a different contract, but only the happy path is covered.

**Recommended change**

- Add fixtures for a foreign contract id and for a non-`pay` topic, asserting null.

**Acceptance criteria**

- Both negative cases return null.
- A genuine `pay` from the checkout contract still decodes.

**Guideline** — Negative cases prevent cross-contract false positives.

---

## 94. `test(stellar): cover verifyOrderOnChain ownership`

**Problem** — `verifyOrderOnChain` (`lib/buyer-orders.ts` line 163) reports `verified: onChain.status !== "Unknown"` (line 176) and returns `buyer: onChain.buyer` (line 177) without ever comparing it with the caller, so it cannot distinguish the wallet's own order from another wallet's. No test pins the behaviour: the only coverage is indirect, through `tests/lib/buyer-orders.test.ts` exercising `readOrder`, and it never asserts the ownership outcome.

**Recommended change**

- Add tests for a matching buyer, a mismatched buyer, and an order `readOrder` cannot find.
- Assert both `verified` and the returned `buyer` in each case, not just the status string.

**Acceptance criteria**

- A mismatched buyer is not reported as verified.
- A matching buyer is.
- An absent order reports `verified: false`.
- The tests fail against the current implementation and pass once the ownership check lands.

**Guideline** — Verification must bind to the claimant.

---

## 95. `test(stellar): cover assertPaymentReady strict mode`

**Problem** — `assertPaymentReady` (`account.ts` line 185) has a `strict` option that throws `PAYMENT_NOT_READY`, and several readiness dimensions (unfunded account, low native balance, missing trustline, insufficient token balance). Not all are asserted.

**Recommended change**

- Add a test per failure dimension in strict mode, plus the non-strict report shape.

**Acceptance criteria**

- Each readiness failure is asserted in strict mode.
- Non-strict mode returns a report instead of throwing.

**Guideline** — Enumerated failure modes deserve enumerated tests.

---

## 96. `test(stellar): cover the loadAccount friendbot funding path`

**Problem** — `loadAccount` (`account.ts` line 88) auto-funds unfunded accounts when `fund` is set, calling `fundTestnetAccount` (line 121). The funding branch is untested.

**Recommended change**

- Mock a missing account and assert friendbot is called and the account is re-loaded.

**Acceptance criteria**

- The unfunded path triggers funding and succeeds.
- A failure from friendbot surfaces clearly.

**Guideline** — Testnet convenience paths still need tests.

---

## 97. `test(stellar): cover simulateContractRead when simulation returns null`

**Problem** — `simulateContractRead` (`simulate.ts` line 85) can return null (an absent order or a failed result), and callers branch on it, but the null path is not asserted.

**Recommended change**

- Add a test asserting null is returned for an empty result rather than throwing.

**Acceptance criteria**

- Null is returned and callers can distinguish "absent" from "error".
- A thrown simulation error still propagates as an error.

**Guideline** — Keep "absent" and "failed" distinct.

---

## 98. `test(stellar): cover budgetFee and recommendedInclusionFee`

**Problem** — `recommendedInclusionFee` and `budgetFee` (`simulate.ts` lines 185, 202) compute the fee string used by the buyer path, and [#529](../../issues/529) extends their use to dispatch/refund, but they have no dedicated tests.

**Recommended change**

- Add tests for the normal case, a raised fee base, and a failed `getFeeStats` fallback.

**Acceptance criteria**

- The fee string is asserted for each case.
- A stats failure falls back to a sane default rather than zero.

**Guideline** — Fee math is money; pin it.

---

## 99. `fix(stellar): verify order ownership in verifyOrderOnChain`

**Problem** — As described in [#546](../../issues/546), `verifyOrderOnChain` (`lib/buyer-orders.ts` lines 163–186) reports success purely from `status !== "Unknown"` and never compares the on-chain buyer with the expected wallet, so it verifies orders that belong to someone else.

**Recommended change**

- Accept the expected address and require `onChain.buyer` to match before returning `verified: true`.

**Acceptance criteria**

- A wallet-mismatched order is not verified.
- The caller passes the connected address.
- A test covers the mismatch.

**Guideline** — Ownership is part of verification, not an afterthought.

---

## 100. `fix(stellar): use the toSdkBytes helper in bytes32ToScVal`

**Problem** — `lib/stellar/scval.ts` defines `toSdkBytes()` (lines 30–32) with a doc comment explaining that it exists to centralize the browser-safe widening cast "at the call boundary instead of constructing a Node value", but nothing references it: `bytes32ToScVal` inlines its own `arr as any` at line 42 instead. The helper is dead code and the one cast it was written to own is still open-coded beside it.

**Recommended change**

- Route `bytes32ToScVal` through `toSdkBytes`, or delete the helper if the cast is not worth centralizing.
- Note the overlap with the `as any` sweep in Batch 13: that issue is scoped to the two _contract-address_ casts (`events.ts` line 81, `orders.ts` line 166), so this one owns the `bytes32` cast.

**Acceptance criteria**

- The widening cast for `BytesN<32>` exists in exactly one place and `toSdkBytes` is either used or gone.
- `bytes32ToScVal` still rejects non-32-byte input.

**Guideline** — Centralize type-unsafe casts behind one helper.

---

# Batch 6 — Data layer & buyer orders (issues 101–120)

> ✅ **PUBLISHED — all 20 issues, GitHub [#553](../../issues/553)–[#572](../../issues/572) on 2026-09-27.** No labels applied (the Drip bot labels on campaign add).

> Draft&rarr;issue map: 101&rarr;[#553](../../issues/553), 102&rarr;[#554](../../issues/554), 103&rarr;[#555](../../issues/555), 104&rarr;[#556](../../issues/556), 105&rarr;[#557](../../issues/557), 106&rarr;[#558](../../issues/558), 107&rarr;[#559](../../issues/559), 108&rarr;[#560](../../issues/560), 109&rarr;[#561](../../issues/561), 110&rarr;[#562](../../issues/562), 111&rarr;[#563](../../issues/563), 112&rarr;[#564](../../issues/564), 113&rarr;[#565](../../issues/565), 114&rarr;[#566](../../issues/566), 115&rarr;[#567](../../issues/567), 116&rarr;[#568](../../issues/568), 117&rarr;[#569](../../issues/569), 118&rarr;[#570](../../issues/570), 119&rarr;[#571](../../issues/571), 120&rarr;[#572](../../issues/572).

> **Six drafts were reworked before publishing.** This batch was drafted more loosely than its neighbours and the verify-before-publish pass caught it:
>
> - **109, 117, 119** rested on premises that are false in the current tree and were replaced outright. `109` claimed `updateProduct` silently no-ops on a deleted row — it uses `.select().single()` (`lib/products.js:104`), which errors on zero rows, so the caller cannot render success. `117` claimed product names reach markup unescaped — every sink is React text or attribute (`{product.name}`, `alt=`, `aria-label=`), with no `dangerouslySetInnerHTML` anywhere. `119` claimed a rejected `getSession` strands the loading spinner — `lib/AuthContext.js:39-43` already catches it and clears loading. The replacements are verified gaps in the same modules: `saveBuyerOrder` never inspects the Supabase insert's resolved error, `fetchBuyerOrders` never reads `res.error` so a failed query is indistinguishable from an empty history, and `onAuthStateChange` is the one auth callback missing the `mounted` guard its two siblings have.
> - **116 and 118** overstated their case and were corrected rather than replaced: `getCachedBuyerOrders` already try/catches `JSON.parse` and drops non-arrays, so the real gap is element-level validation; and `sanitizeForHtml` is referenced by nothing at all, not by tests as claimed.
> - **108/109 and 104/106** were overlapping pairs. `108` was retargeted to the edit form (which has its own unguarded `parseFloat` at `app/admin/EditProductForm.jsx:56`), and `104` gave up boundary testing so `106` owns it exclusively.
> - Smaller corrections: `101`/`111`/`112`/`113` line ranges were off by one or two; `107` claimed the price input had neither `min` nor `max` when `type="number"` and `step="0.01"` are already present; `104` miscounted the module as sixteen validators when it exports thirteen; `110` mis-described its own mechanism — the storage error is **discarded** from the resolved value, and the `catch` can never fire because `supabase-js` resolves rather than rejects.

---

### Complexity

| #   | Issue                                                                       | Complexity |
| --- | --------------------------------------------------------------------------- | ---------- |
| 101 | `fix(orders): save the buyer order after a successful Stellar payment`      | high       |
| 102 | `fix(orders): render newly created orders on the orders page`               | medium     |
| 103 | `fix(buyer-orders): clear the cached orders on logout`                      | trivial    |
| 104 | `test(lib): add unit tests for lib/validation.ts`                           | high       |
| 105 | `test(lib): add unit tests for lib/collections.js`                          | trivial    |
| 106 | `test(validation): cover every validator's boundary inputs`                 | medium     |
| 107 | `fix(products): validate price before create and update`                    | medium     |
| 108 | `fix(admin): reject negative and NaN prices in the edit product form`       | trivial    |
| 109 | `fix(buyer-orders): surface a failed Supabase insert in saveBuyerOrder`     | medium     |
| 110 | `fix(products): guard storage cleanup failures in deleteProduct`            | medium     |
| 111 | `fix(admin): use functional state updates when deleting a product`          | trivial    |
| 112 | `fix(admin): confirm before deleting a product`                             | trivial    |
| 113 | `fix(admin): surface delete failures to the user`                           | medium     |
| 114 | `test(products): cover uploadProductImage rejection`                        | medium     |
| 115 | `test(buyer-orders): cover the Supabase-then-cache fallback`                | medium     |
| 116 | `fix(buyer-orders): handle a corrupt localStorage payload`                  | medium     |
| 117 | `fix(buyer-orders): distinguish a failed orders query from an empty result` | medium     |
| 118 | `chore(validation): remove or use the unused sanitizeForHtml helper`        | trivial    |
| 119 | `fix(auth): guard the onAuthStateChange callback against unmounted updates` | medium     |
| 120 | `test(auth): cover mapAuthUser for missing fields`                          | trivial    |

## 101. `fix(orders): save the buyer order after a successful Stellar payment`

**Problem** — `handleStellarSuccess` in `app/checkout/page.tsx` (lines 76–85) shows a toast, advances to stage 3 and clears `localStorage`, but never calls `saveBuyerOrder`. A repository-wide search finds `saveBuyerOrder` only in `lib/buyer-orders.ts:40` and its test, so every on-chain payment produces an order the buyer cannot see. `app/orders/page.tsx` calls `fetchBuyerOrders`, which reads Supabase and the `mova_buyer_orders` cache — neither of which the checkout ever writes.

**Recommended change**

- Call `saveBuyerOrder(...)` in `handleStellarSuccess` (and/or in `payWithStellar` once the receipt decodes), populating `orderId`, `txHash`, `ledger`, `tokenSymbol`, `tokenAmount` and the cart items before clearing storage.

**Acceptance criteria**

- A successful payment creates a retrievable order.
- The order appears on `/orders` for the buyer.
- A test covers the write.

**Guideline** — If a payment produces a record, the client must persist it.

---

## 102. `fix(orders): render newly created orders on the orders page`

**Problem** — Because of [#553](../../issues/553) no orders are ever written, so `/orders` always renders empty even after a successful payment; there is also no refresh or subscription that would surface a newly created order without a reload.

**Recommended change**

- Ensure the orders page reads the freshly written record and re-reads after a successful checkout (or subscribes to changes).

**Acceptance criteria**

- A newly paid order is visible without a full page reload.
- Empty and error states remain distinct.

**Guideline** — A list view must reflect writes that just happened.

---

## 103. `fix(buyer-orders): clear the cached orders on logout`

**Problem** — The local order cache (`mova_buyer_orders`) is never cleared when a user signs out, so on a shared device the next visitor can read the previous user's order history from the cache.

**Recommended change**

- Clear or scope the cache on sign-out.

**Acceptance criteria**

- After logout, a different account cannot see the previous user's cached orders.
- A test covers the sequence.

**Guideline** — Session teardown must include client-side caches.

---

## 104. `test(lib): add unit tests for lib/validation.ts`

**Problem** — `lib/validation.ts` exports thirteen validators plus `escapeHtml`, `sanitizeText`, `sanitizeForHtml` and `validateForm` — seventeen exports in all — and is imported by checkout and the contact form, yet `tests/lib/validation.test.ts` is **0 bytes**: the file exists but contains nothing.

**Recommended change**

- Implement the test file with a valid and an invalid input per export. Baseline coverage only — the boundary tables are owned by the sibling boundary issue, so do not duplicate them here.

**Acceptance criteria**

- Every exported function in `lib/validation.ts` has at least one assertion.
- The file is no longer empty.

**Guideline** — An empty test file is worse than no file: it implies coverage that does not exist.

---

## 105. `test(lib): add unit tests for lib/collections.js`

**Problem** — `lib/collections.js` exports `PRODUCTS_TABLE` and `PRODUCTS_BUCKET` and has no test file at all; it is also the only library module with no coverage map entry.

**Recommended change**

- Add tests asserting the constants and any behaviour built on them.

**Acceptance criteria**

- The module has coverage.
- The constants match `supabase/schema.sql`.

**Guideline** — Small modules still need a guard against silent value changes.

---

## 106. `test(validation): cover every validator's boundary inputs`

**Problem** — Baseline coverage per export is owned by [#556](../../issues/556); what it will not pin down is the boundary arithmetic. Even once that lands, the validators encode specific rules (Luhn for `validateCardNumber`, MM/YY for expiry, 6-digit OTP, base32 for `validateStellarAddress`, numeric bounds for `validatePrice`) that are easy to get subtly wrong at the edges.

**Recommended change**

- Add table-driven boundary cases per validator: minimum, maximum, one-past-boundary, and malformed input.

**Acceptance criteria**

- Each numeric/format boundary is asserted explicitly.
- A regression in any validator fails a named test.

**Guideline** — Test the boundaries, not just the happy path.

---

## 107. `fix(products): validate price before create and update`

**Problem** — `createProduct` and `updateProduct` (`lib/products.js` lines 87, 98) accept whatever price the caller passes. `app/admin/AddProductForm.jsx` parses with `parseFloat(productPrice)` (line 28) and the input has no `min`/`max` (lines 64–73), so `-50`, `1e12` or `NaN` can be written to the products table. `validatePrice` exists in `lib/validation.ts` but is unused here.

**Recommended change**

- Validate with `validatePrice` (and `validateProductName`) before insert/update.
- Add the missing `min="0"` to the input — `type="number"` and `step="0.01"` are already set at lines 66 and 68.

**Acceptance criteria**

- Negative, non-numeric and absurd prices are rejected with a visible error.
- A test covers the rejection.

**Guideline** — Validate at the data layer as well as the form.

---

## 108. `fix(admin): reject negative and NaN prices in the edit product form`

**Problem** — `app/admin/EditProductForm.jsx` submits `price: parseFloat(productPrice)` (line 56) with no guard, so clearing the field or typing a malformed value yields `NaN`, and a negative value is accepted. This is the same gap the add form has, but on the edit path, which the data-layer fix in [#559](../../issues/559) covers only from below: the operator still gets no feedback, and an edit that re-saves a bad price depends entirely on the lower check to be rejected.

**Recommended change**

- Check `Number.isFinite` and `>= 0` before submission and surface a field-level error, mirroring the add form.
- Keep the price input's `min` attribute consistent between the add and edit forms.

**Acceptance criteria**

- `NaN` and negative values block submission with a visible message in the edit form.
- A valid price still submits.

**Guideline** — Guard against NaN at every form boundary, not only the create path.

---

## 109. `fix(buyer-orders): surface a failed Supabase insert in saveBuyerOrder`

**Problem** — `saveBuyerOrder` (`lib/buyer-orders.ts` line 40) caches to `localStorage` and then inserts into the `orders` table inside a `try`/`catch` (lines 58–79). The insert is awaited but its result is never inspected, and `supabase-js` reports a database error in the **resolved** `{ error }` rather than by rejecting — so the `catch` never runs for an insert failure. A rejected insert (a duplicate `id`, a constraint violation, or an RLS denial) is therefore indistinguishable from success: the function resolves normally and the caller proceeds as though the order were persisted, while it exists only in the local cache. The comment on the `catch` says it is there for the case where "the Supabase table may not exist yet in dev or offline", which the resolved-error shape means it cannot detect either. This becomes a user-facing loss path once [#553](../../issues/553) wires the call into the checkout, because the order would then be missing on any device that did not make the purchase.

**Recommended change**

- Inspect the resolved `error` from the insert and act on it: throw, or return a typed result distinguishing "cached but not persisted" from "saved".
- Keep the local cache as the continuity mechanism, but never report a persisted write that failed.

**Acceptance criteria**

- An insert that resolves with an `error` is surfaced to the caller rather than ignored.
- A caller can tell a fully persisted order from a cache-only one.
- A test covers an insert that resolves with an error.

**Guideline** — `supabase-js` resolves with its errors; a `catch` alone will not see them.

---

## 110. `fix(products): guard storage cleanup failures in deleteProduct`

**Problem** — `deleteProduct` (`lib/products.js` line 146) deletes the row and then removes the image inside `try { await supabase.storage.from(PRODUCTS_BUCKET).remove([path]) } catch {}` (lines 163–169). `supabase-js` reports a storage failure in the **resolved** `{ error }` rather than by rejecting — the code comment at line 166 states this explicitly — so the `catch` never runs and the resolved error is discarded outright. A failed cleanup is therefore not merely swallowed: it is never observed at all, nothing is logged, and orphaned images accumulate silently.

**Recommended change**

- Report cleanup failures (log with context, or return a partial-success result) without failing the row deletion.

**Acceptance criteria**

- A failing cleanup does not throw after a successful row delete.
- The failure is observable to the caller or logs.

**Guideline** — Best-effort work should still be observable.

---

## 111. `fix(admin): use functional state updates when deleting a product`

**Problem** — `app/admin/page.jsx` deletes with `setProducts(products.filter((p) => p.id !== id))` (lines 38–45). `products` is captured from the render closure, so a delete racing an add or refresh can resurrect or drop rows.

**Recommended change**

- Use the functional form: `setProducts((prev) => prev.filter(...))`.

**Acceptance criteria**

- Concurrent updates do not resurrect deleted rows.
- A test covers the stale-closure case.

**Guideline** — State updates that depend on previous state must use the updater form.

---

## 112. `fix(admin): confirm before deleting a product`

**Problem** — `handleDelete` (`app/admin/page.jsx` lines 38–45) destroys a product with no confirmation, and the action is irreversible.

**Recommended change**

- Add a confirmation dialog before deletion.

**Acceptance criteria**

- Cancelling leaves the product intact.
- Confirming deletes it once.

**Guideline** — Destructive actions require confirmation.

---

## 113. `fix(admin): surface delete failures to the user`

**Problem** — `handleDelete` only calls `console.error` on failure (lines 38–45), so an operator sees the row remain with no explanation.

**Recommended change**

- Show an error via the existing toast/notification mechanism and keep the row in place.

**Acceptance criteria**

- A failed delete shows a user-visible error.
- The row is not removed optimistically on failure.

**Guideline** — Never fail silently on an operator action.

---

## 114. `test(products): cover uploadProductImage rejection`

**Problem** — [#478](../../issues/478) adds type and size validation to `uploadProductImage` (`lib/products.js` lines 71–83); the rejection paths need tests, as does the existing success path.

**Recommended change**

- Add tests for an accepted image and for each rejection reason.

**Acceptance criteria**

- Both outcomes are asserted.
- The stored path/extension is checked.

**Guideline** — New validation needs negative tests.

---

## 115. `test(buyer-orders): cover the Supabase-then-cache fallback`

**Problem** — `fetchBuyerOrders` (`lib/buyer-orders.ts` line 103) reads Supabase then falls back to the local cache, but the fallback trigger and the merged result are not fully asserted.

**Recommended change**

- Add tests for a Supabase hit, a Supabase failure falling back to cache, and an empty result.

**Acceptance criteria**

- All three paths are asserted.
- The returned shape is checked for each.

**Guideline** — Fallback behaviour is logic and needs tests.

---

## 116. `fix(buyer-orders): handle a corrupt localStorage payload`

**Problem** — `getCachedBuyerOrders` (`lib/buyer-orders.ts` lines 88–98) already guards the parse: `JSON.parse` sits inside a `try`/`catch` that returns `[]`, and a non-array payload is dropped by `Array.isArray(parsed) ? parsed : []`. Corrupt JSON therefore does not throw. What is not validated is the **element** level: an array containing `null`, a primitive, or an object missing the fields the orders list reads passes straight through as a `BuyerOrder`, so a hand-edited or partially-written cache still surfaces malformed rows to the page.

**Recommended change**

- Validate each element's shape — at minimum the identifiers and the fields the orders list renders — and drop entries that fail, rather than trusting the contents because the container is an array.

**Acceptance criteria**

- An array containing `null`, a primitive or a malformed object yields no malformed orders.
- A valid cache is returned unchanged.

**Guideline** — Treat local storage as untrusted input.

---

## 117. `fix(buyer-orders): distinguish a failed orders query from an empty result`

**Problem** — `fetchBuyerOrders` (`lib/buyer-orders.ts` line 103) runs the Supabase query and then branches on `res.data` alone (`if (res.data && Array.isArray(res.data) && res.data.length > 0)`, line 119). The sibling `res.error` is never read, and the surrounding `catch` only sees a rejected call — which `supabase-js` does not produce for a query-level failure. A query that resolves with an error (an RLS denial, a column that does not exist, a bad filter) therefore falls straight through to the cache fallback at line 142 and returns whatever is cached as though it were current server state. Because that fallback is also the legitimate path for a genuinely empty history, the caller cannot tell "you have no orders" from "the server could not be reached and this is stale".

**Recommended change**

- Read `res.error` and distinguish three outcomes: server data, a confirmed empty history, and a failed query served from cache.
- Surface the third outcome (a non-blocking notice or a returned flag) rather than presenting the cache as authoritative.

**Acceptance criteria**

- A resolved query error is not silently indistinguishable from an empty result.
- The cache fallback still keeps the page usable when the query fails.
- A test covers a query that resolves with an error.

**Guideline** — An empty list and a failed fetch are different facts.

---

## 118. `chore(validation): remove or use the unused sanitizeForHtml helper`

**Problem** — `lib/validation.ts` exports `sanitizeForHtml` at line 58 (implemented as `escapeHtml(sanitizeText(input))`), and a repository-wide search finds it referenced **nowhere at all** — not in product code, and not in tests either, since the module's only test file is the empty `tests/lib/validation.test.ts` ([#556](../../issues/556)). The codebase therefore carries a security-looking helper that nothing applies, while its two dependencies (`escapeHtml`, `sanitizeText`) are used only inside `validation.ts` itself.

**Recommended change**

- Apply it where untrusted text is rendered, or remove it to avoid implying protection that does not exist.

**Acceptance criteria**

- The helper is either used in product code or deleted.
- No export in the module is referenced by nothing.

**Guideline** — Unused security helpers create false confidence.

---

## 119. `fix(auth): guard the onAuthStateChange callback against unmounted updates`

**Problem** — In `AuthProvider` (`lib/AuthContext.js` line 25), both `getSession` handlers guard their state updates with `if (!mounted) return;` (lines 35 and 40), but the `onAuthStateChange` subscription callback (lines 48–51) calls `setUser(mapAuthUser(session?.user))` and `setLoading(false)` with no such guard. The cleanup only sets `mounted = false` and calls `subscription.unsubscribe()` (lines 53–56), so an auth event already dispatched — or one delivered in the window before the unsubscribe takes effect — still updates state on an unmounted provider. The asymmetry is the point: the guard was plainly intended for the whole effect and was left off one of its three state-updating callbacks.

**Recommended change**

- Apply the same `if (!mounted) return;` guard to the `onAuthStateChange` callback so all three callbacks in the effect are consistent.

**Acceptance criteria**

- No auth callback updates state after the provider unmounts.
- All three state-updating callbacks in the effect share the same guard.
- A test covers an auth event delivered after unmount.

**Guideline** — A guard applied to some callbacks in an effect must be applied to all of them.

---

## 120. `test(auth): cover mapAuthUser for missing fields`

**Problem** — `mapAuthUser` (`lib/auth.js` line 6) adapts a Supabase user into the app user shape and returns null for unusable input; the null path and partially-populated users are not fully asserted.

**Recommended change**

- Add tests for a complete user, a user missing metadata, and `null`.

**Acceptance criteria**

- All three cases are asserted.
- The mapped shape is checked field by field.

**Guideline** — Adapters are where field drift hides.

---

# Batch 7 — React correctness & state (issues 121–140)

> ✅ **PUBLISHED — all 20 issues, GitHub [#573](../../issues/573)–[#592](../../issues/592) on 2026-09-27.** No labels applied (the Drip bot labels on campaign add). Community banner prepended to every body.

> Draft&rarr;issue map: 121&rarr;[#573](../../issues/573), 122&rarr;[#574](../../issues/574), 123&rarr;[#575](../../issues/575), 124&rarr;[#576](../../issues/576), 125&rarr;[#577](../../issues/577), 126&rarr;[#578](../../issues/578), 127&rarr;[#579](../../issues/579), 128&rarr;[#580](../../issues/580), 129&rarr;[#581](../../issues/581), 130&rarr;[#582](../../issues/582), 131&rarr;[#583](../../issues/583), 132&rarr;[#584](../../issues/584), 133&rarr;[#585](../../issues/585), 134&rarr;[#586](../../issues/586), 135&rarr;[#587](../../issues/587), 136&rarr;[#588](../../issues/588), 137&rarr;[#589](../../issues/589), 138&rarr;[#590](../../issues/590), 139&rarr;[#591](../../issues/591), 140&rarr;[#592](../../issues/592).

> **Two drafts were narrowed before publishing, and the rest held.** 18 of 20 were accurate as written — a far better hit rate than Batch 6.
>
> - **125 and 131** both assumed the component had _no_ Escape handling and no way to dismiss besides the toggle. `components/Modal.jsx` has handled Escape since lines 16–23 and already contains focus via `trapFocus` (line 14); `components/Navbar.jsx` handles Escape at lines 64–69 and renders an explicit "Close navigation menu" button (lines 195–202). Both issues were rewritten around what is genuinely absent — 125 is now backdrop-click only, and 131 covers the dialog role, `aria-modal`, the backdrop and focus containment.
> - Smaller corrections: `132` cited `ScrollToTop.jsx` line 27 (it is line 28); `133`'s `href` is on line 45 with `preventDefault` at lines 16 and 20, not 15 and 20; `134` now notes the same `photo-1542291026` URL appears a fourth time with a different transform in `supabase/seed.sql` line 11; `136`'s duplicate posts start at line 24 not 31; `140` gained the "30+ Countries Served" and "~4 sec" figures it had missed.
> - `125` was reclassified `medium` &rarr; `trivial`, since Escape and focus containment already worked and only the backdrop handler was left.
> - Separately, `app/layout.jsx` was found to import `SkipLink` twice and render it three times — **already tracked** as draft 4, published [#455](../../issues/455), so it was left alone.

---

### Complexity

| #   | Issue                                                                    | Complexity |
| --- | ------------------------------------------------------------------------ | ---------- |
| 121 | `fix(cart): assign a unique id to each cart line`                        | medium     |
| 122 | `fix(cart): remove the correct line when duplicates exist`               | trivial    |
| 123 | `fix(cart): compute the cart total from the previous state`              | medium     |
| 124 | `fix(cart): keep the stored cart and total in sync`                      | medium     |
| 125 | `fix(modal): close on backdrop click and Escape`                         | trivial    |
| 126 | `fix(modal): use the dialog title instead of a hardcoded label`          | trivial    |
| 127 | `fix(order-card): handle a rejected clipboard write`                     | trivial    |
| 128 | `fix(order-card): clear the copy timeout on unmount`                     | trivial    |
| 129 | `fix(order-card): key list items by identifier instead of index`         | trivial    |
| 130 | `fix(navbar): remove the button nested inside a link`                    | trivial    |
| 131 | `fix(navbar): add a backdrop and focus containment to the mobile drawer` | high       |
| 132 | `fix(navbar): raise the mobile drawer above the floating cart button`    | medium     |
| 133 | `fix(hero): point the primary call to action at a real destination`      | trivial    |
| 134 | `fix(landing): deduplicate the repeated image arrays`                    | trivial    |
| 135 | `fix(blog): add the missing article route`                               | medium     |
| 136 | `fix(blog): replace the duplicated placeholder posts`                    | trivial    |
| 137 | `fix(shop): extract the shared cart modal markup`                        | medium     |
| 138 | `fix(app): render the ErrorBoundary the layout imports`                  | trivial    |
| 139 | `fix(shop): use a single import style in the shop layout`                | trivial    |
| 140 | `fix(landing): replace the hardcoded repository statistics`              | medium     |

## 121. `fix(cart): assign a unique id to each cart line`

**Problem** — `context/CartContext.jsx` `addToCart` (lines 69–111) pushes the product object verbatim and never assigns a `cartItemId`/`lineId`. Both cart modals then fall back to index-based keys (`` `${item.id}-${index}` ``). `tests/context/CartModalDuplicateRows.test.jsx` (lines 66–82) already expects a truthy, unique `item.cartItemId` per row, so the test and the implementation disagree.

**Recommended change**

- Assign a unique `cartItemId` (e.g. `crypto.randomUUID()`) in `addToCart` and use it as the key.

**Acceptance criteria**

- Every cart line has a stable unique id.
- The duplicate-rows test passes without index fallbacks.
- Keys are stable across re-renders.

**Guideline** — Identity should come from the data, not the array position.

---

## 122. `fix(cart): remove the correct line when duplicates exist`

**Problem** — `removeFromCart` (lines 111–172) removes only the first `findIndex(item.id === product.id)` match, so with two rows of the same product the second cannot be removed.

**Recommended change**

- Remove by `cartItemId`.

**Acceptance criteria**

- Removing the second of two identical products leaves the first intact.
- A test covers duplicates.

**Guideline** — Deletion must be identity-based, not value-based.

---

## 123. `fix(cart): compute the cart total from the previous state`

**Problem** — `removeFromCart` recomputes the total from the captured `cartItems` value (`lines 157–171`): `const items = isHydratedRef.current ? cartItems : JSON.parse(...)`. Two removals within one render window therefore compute totals from stale state.

**Recommended change**

- Compute the total inside the `setState` updater using `prev`.

**Acceptance criteria**

- Two removals in one tick yield the correct total.
- A test covers the sequence.

**Guideline** — Derivations of state belong inside the updater.

---

## 124. `fix(cart): keep the stored cart and total in sync`

**Problem** — The cart persists under `cartItems` while the checkout reads a separate `totalPrice` key (`app/checkout/page.tsx` lines 147–158). The two can diverge whenever one is written without the other, and #475 shows the total is also untrusted.

**Recommended change**

- Persist a single cart object that includes the derived total, or recompute the total on read.

**Acceptance criteria**

- The stored total always matches the stored items.
- A test covers an edit-then-read cycle.

**Guideline** — Related state must not be persisted in two places.

---

## 125. `fix(modal): close on backdrop click`

**Problem** — `components/Modal.jsx` already handles the other conventional dismissal paths: Escape is wired in a `keydown` listener (lines 16–23) and focus is trapped through `trapFocus` with focus restored on close (lines 13–14, 27–28). What is missing is the backdrop. The overlay is rendered with `bg-black bg-opacity-50` (line 36) but carries no click handler, so clicking outside the panel does nothing — the one affordance users reach for first.

**Recommended change**

- Close when the overlay itself is clicked, and only when it is the overlay rather than the panel: compare `e.target` with `e.currentTarget`, or stop propagation on the panel wrapper.
- Keep the existing Escape and focus-trap behaviour untouched.

**Acceptance criteria**

- Clicking the backdrop closes the modal.
- Clicking inside the panel does not close it.
- Escape still closes it, and focus is still restored to the trigger on close.
- A test covers a backdrop click and an inside click.

**Guideline** — Add the dismissal affordance that is missing, not the ones that already work.

---

## 126. `fix(modal): use the dialog title instead of a hardcoded label`

**Problem** — `components/Modal.jsx` destructures `title = "Dialog"` (line 7) but never uses it, and hardcodes `aria-label="Modal dialog"` (line 39). Every dialog therefore exposes the same generic name, and `tests/components/Accessibility.test.tsx` (lines 11–22) expects the label to equal the `title`.

**Recommended change**

- Render `aria-label={title}`, or wire `aria-labelledby` to a heading id.

**Acceptance criteria**

- Each dialog is named by its `title`.
- The accessibility test passes.

**Guideline** — An accessible name should describe the specific dialog.

---

## 127. `fix(order-card): handle a rejected clipboard write`

**Problem** — `components/OrderCard.tsx` calls `navigator.clipboard.writeText(order.orderId)` (line 25) with no `await` and no `catch`, then immediately sets `copied` to true. The write rejects in an insecure context or without permission, producing an unhandled promise rejection and a false "copied" confirmation.

**Recommended change**

- `await` the write inside `try`/`catch` and only set `copied` on success.

**Acceptance criteria**

- A rejected write shows no success state.
- No unhandled rejection occurs.
- A test covers the failure.

**Guideline** — Clipboard access is permission-gated and can fail.

---

## 128. `fix(order-card): clear the copy timeout on unmount`

**Problem** — `components/OrderCard.tsx` sets `setTimeout(() => setCopied(false), 2000)` (line 27) and never clears it, so the timer can fire after unmount and update state on an unmounted component.

**Recommended change**

- Track the timer in a ref and clear it in a `useEffect` cleanup.

**Acceptance criteria**

- Unmounting mid-timer produces no state update or warning.
- The label still resets after the delay while mounted.

**Guideline** — Clean up timers on unmount.

---

## 129. `fix(order-card): key list items by identifier instead of index`

**Problem** — `components/OrderCard.tsx` keys items with `key={idx}` (line 116), so reordering or removing an item mis-associates React state and DOM nodes.

**Recommended change**

- Key by a stable identifier such as `item.id`.

**Acceptance criteria**

- No index keys remain in the component.
- Reordering preserves correct row content.

**Guideline** — Stable keys are required for correct reconciliation.

---

## 130. `fix(navbar): remove the button nested inside a link`

**Problem** — `components/Navbar.jsx` renders `<Link href="/profile/login"><button …>Login</button></Link>` (lines 162–171 and 263–272). Interactive content nested inside an anchor is invalid HTML and produces confusing screen-reader output and double activation.

**Recommended change**

- Style the `Link` itself as the button and delete the inner `<button>`.

**Acceptance criteria**

- No interactive element is nested inside an anchor.
- Keyboard activation fires exactly one navigation.

**Guideline** — Do not nest interactive elements.

---

## 131. `fix(navbar): give the mobile drawer a dialog role, a backdrop and focus containment`

**Problem** — The mobile menu (`Navbar.jsx` lines 193–275) is rendered as a plain `<div className="fixed inset-y-0 right-0 z-50 flex h-screen w-1/2 ...">` (line 194). It already closes on Escape (lines 64–69) and has an explicit "Close navigation menu" button (lines 195–202), so dismissal is not the gap. What is missing is everything that makes it behave as a modal surface: no `role="dialog"`, no `aria-modal="true"`, no backdrop element, and no focus containment — `trapFocus` exists in `lib/accessibility` and `Modal.jsx` uses it, but the drawer does not. Tabbing therefore walks straight out of the open drawer and into the page behind it, and a screen reader is given no indication that the rest of the document is inert.

**Recommended change**

- Add `role="dialog"` and `aria-modal="true"`, with `aria-labelledby` (or `aria-label`) naming it.
- Contain focus with the existing `trapFocus` helper, restoring focus to the toggle on close, matching how `components/Modal.jsx` already does it.
- Add a backdrop element behind the drawer that closes it on click.

**Acceptance criteria**

- Focus stays inside the open drawer under repeated Tab and Shift+Tab.
- The drawer exposes `role="dialog"` and `aria-modal="true"` with an accessible name.
- A backdrop is present and closes the drawer.
- Escape and the close button keep working as they do today.
- A test covers focus containment.

**Guideline** — A surface that behaves modally must declare itself modal and contain focus.

---

## 132. `fix(navbar): raise the mobile drawer above the floating cart button`

**Problem** — The open drawer uses `z-50` inside a container at `z-10` (`Navbar.jsx` line 100), while `components/Cart.jsx` (line 10) and `components/ScrollToTop.jsx` (line 28) use `z-40`. Because the parent stacking context caps the drawer, the floating buttons render above the open menu and intercept clicks.

**Recommended change**

- Establish a stacking context where the open drawer sits above the floating controls.

**Acceptance criteria**

- With the menu open, the floating buttons do not overlay or capture its clicks.
- Verified at mobile widths.

**Guideline** — Stacking contexts must reflect intended interaction order.

---

## 133. `fix(hero): point the primary call to action at a real destination`

**Problem** — `app/(landingpage)/Hero.jsx` sets `href={user ? "/shop" : "#"}` (line 45) while the click handler always calls `preventDefault` — in both the signed-out branch (line 16) and the signed-in one (line 20). Navigation therefore only works with JavaScript, and without it the CTA jumps to the top of the page.

**Recommended change**

- Always point `href` at the real destination (e.g. `/profile/login`) and drop `preventDefault` when the href already matches.

**Acceptance criteria**

- The CTA navigates without JavaScript.
- A test asserts the resolved `href`.

**Guideline** — Links must work as links.

---

## 134. `fix(landing): deduplicate the repeated image arrays`

**Problem** — The same Unsplash URLs are hardcoded in several arrays: `app/(landingpage)/Catalogue.jsx` (lines 4–10), `app/(landingpage)/Slider.jsx` (lines 3–9) and `app/(landingpage)/Categories.jsx` (line 20), with `photo-1542291026-7eec264c27ff` appearing in all three — and a fourth time with a different transform in `supabase/seed.sql` (line 11), so the same product image is fetched at three different sizes. Content edits must be made in three places and each reuse re-downloads a different transform.

**Recommended change**

- Extract one shared image constant (or asset module) and reference it everywhere.

**Acceptance criteria**

- Each image URL is defined once.
- All three sections still render the same visuals.

**Guideline** — Single source of truth for shared assets.

---

## 135. `fix(blog): add the missing article route`

**Problem** — `app/blog/page.jsx` links each post to `/blog/${post.id}` (line 78), but there is no `app/blog/[id]` route, so every "Read More" link lands on the not-found page.

**Recommended change**

- Add the dynamic route (or point the links at a real destination).

**Acceptance criteria**

- Every blog link resolves to a rendered article.
- No link 404s.

**Guideline** — Do not generate links without a matching route.

---

## 136. `fix(blog): replace the duplicated placeholder posts`

**Problem** — Four of the six posts in `app/blog/page.jsx` share the title "How to Care for Your Shoes" and the same excerpt and image (lines 24–52); the four entries differ only in the `id` and the `image` binding they reuse from the two real posts.

**Recommended change**

- Replace the duplicates with distinct content, or reduce the list to the real posts.

**Acceptance criteria**

- No two posts share a title, excerpt and image.
- The list has no placeholder copy.

**Guideline** — Placeholder content in a public storefront undermines credibility.

---

## 137. `fix(shop): extract the shared cart modal markup`

**Problem** — The cart modal markup is copied between `app/shop/page.jsx` and `app/shop/[id]/page.jsx`, so the duplicate-row key logic exists twice and fixes must be applied twice.

**Recommended change**

- Extract one cart modal component and reuse it.

**Acceptance criteria**

- The markup exists once.
- Both shop routes still render the cart correctly.

**Guideline** — Duplicated UI drifts; extract on the second copy.

---

## 138. `fix(app): render the ErrorBoundary the layout imports`

**Problem** — `app/layout.jsx` imports `ErrorBoundary` (line 12) but never renders it, so no route has render-error protection and the import is dead. The component exists and is tested.

**Recommended change**

- Wrap the main content (or app shell) in `<ErrorBoundary>`.

**Acceptance criteria**

- A thrown render error shows the fallback instead of a blank page.
- A test covers a route-level error.

**Guideline** — Error boundaries must actually be mounted.

---

## 139. `fix(shop): use a single import style in the shop layout`

**Problem** — `app/shop/layout.jsx` imports global CSS again (line 2, already imported by `app/layout.jsx` line 1) and imports the Sidebar via a root-absolute path (line 3) while every other file uses relative paths or the configured alias.

**Recommended change**

- Remove the duplicate stylesheet import and use the `@/` alias consistently.

**Acceptance criteria**

- Global CSS is imported once.
- Import style is consistent across the app.

**Guideline** — One import convention per project.

---

## 140. `fix(landing): replace the hardcoded repository statistics`

**Problem** — `app/(landingpage)/Aboutus.jsx` publishes literal figures such as "1,200+ Transactions", "30+ Countries Served" and "~4 sec" settlement (lines 5–10), plus "120+ GitHub Stars", "45+ Forks" and "15+ Contributors" (lines 89–111) with no data source. In a page whose pitch is "verify it on-chain", stale invented numbers undermine the message.

**Recommended change**

- Fetch stars/forks from the GitHub API and source transaction counts from the indexer, or label the figures clearly as illustrative.

**Acceptance criteria**

- No unverifiable figure is presented as fact.
- If fetched, the values update without a code change.

**Guideline** — Do not hardcode claims that data can provide.

---

# Batch 8 — Accessibility (issues 141–160)

> ✅ **PUBLISHED — all 20 issues, GitHub [#593](../../issues/593)–[#612](../../issues/612) on 2026-09-27.** No labels applied (the Drip bot labels on campaign add). Community banner prepended to every body.

> Draft&rarr;issue map: 141&rarr;[#593](../../issues/593), 142&rarr;[#594](../../issues/594), 143&rarr;[#595](../../issues/595), 144&rarr;[#596](../../issues/596), 145&rarr;[#597](../../issues/597), 146&rarr;[#598](../../issues/598), 147&rarr;[#599](../../issues/599), 148&rarr;[#600](../../issues/600), 149&rarr;[#601](../../issues/601), 150&rarr;[#602](../../issues/602), 151&rarr;[#603](../../issues/603), 152&rarr;[#604](../../issues/604), 153&rarr;[#605](../../issues/605), 154&rarr;[#606](../../issues/606), 155&rarr;[#607](../../issues/607), 156&rarr;[#608](../../issues/608), 157&rarr;[#609](../../issues/609), 158&rarr;[#610](../../issues/610), 159&rarr;[#611](../../issues/611), 160&rarr;[#612](../../issues/612).

> **Six drafts were reworked before publishing — five rested on false premises and one duplicated Batch 9.** Only 14 of 20 were accurate as written, the weakest batch alongside Batch 6.
>
> - **152** claimed error text was rendered without an id or `aria-describedby`. No error text is rendered at all: `app/checkout/page.tsx` imports `validateCardNumber`/`validateCardExpiry`/`validateCardCVV` (lines 42–44) and never calls them, and failures go through `showToast`. **Replaced** with `a11y(checkout): announce payment progress in a live region` — `components/StellarCheckoutButton.jsx` line 95 renders `{message || "Processing…"}` with no live region, while only the error span carries `role="alert"` (line 124).
> - **155** claimed the slider and catalogue images had no meaningful `alt`. `Slider.jsx` line 19 sets `alt="Mova Store footwear"` on every image and `Catalogue.jsx` line 47 uses `alt={p.name}`. **Replaced** with `a11y(faq): keep collapsed answers out of the accessibility tree` — `FAQ.jsx` clips collapsed answers with `max-h-0` (line 84), which does not remove them from the accessibility tree, and the trigger's `aria-expanded` (line 71) has no `aria-controls`.
> - **156** duplicated Batch 9's draft 161 (`perf(images): adopt next/image for product thumbnails`) — the same component and the same line cited. **Replaced** with `a11y(nav): mark the current page with aria-current`; `aria-current` appears nowhere in the codebase. Raw-`<img>` migration is left solely to Batch 9's 161.
> - **157** claimed the newsletter input had no persistent accessible name; `newsletter.jsx` line 45 already has `aria-label="Email"`. **Replaced** with `a11y(testimonials): expose the star rating as text` — `Testimonials.jsx` line 78 renders bare `FaStar` icons with no `aria-hidden` and no text equivalent.
> - **158** claimed the contact form relied on placeholders with no associated labels; all three fields already carry `aria-label` (lines 115, 126, 136). **Replaced** with `a11y(landing): give the numbered steps list semantics` — `HowItWorks.jsx` renders an ordered four-step process as `<div>`s (lines 48–50).
> - **159** was narrowed: only `app/admin/orders/page.tsx` renders a table (headers at lines 405–423, no `scope`, no `<caption>`). The buyer view renders `OrderCard` components, not a table, so the "buyer order views" claim was dropped and the title now says "admin orders table".
> - **151** gained the fact that the three validators are imported but never called, and now points at the existing `ariaInvalid`/`focusFirstError` helpers.
> - Minor corrections: `142` (`✕` is line 35, not 34), `143` (the `opacity-0` toggle is line 30), `144` (the `loader` div is line 7), `146` (added the `div.grid`/`products.map` lines 73–74), `148` (added that the error banner already has `role="alert"` at line 78), `153` (lines 277–280), `154` (lines 253–265 and the `"12345g"` case), `160` (both `h1` sites — `Hero.jsx` line 35 and `Aboutus.jsx` line 22).
>
> These premises were false when written, not outpaced by `main`: every attribute cited above was already present at `e37a8e0`, and a single commit separates that baseline from the current one.

> **Separately — the `## Guideline` section was found empty on 100 already-published issues.** Batches 3–7 ([#493](../../issues/493)–[#592](../../issues/592)) had shipped with an empty Guideline heading; the body text was dropped by the publishing script, not absent from the drafts. All 100 were restored from this file on 2026-09-27 and re-verified, so [#452](../../issues/452)–[#592](../../issues/592) now all carry a Guideline body. Batch 8 was published with the section intact.

---

### Complexity

| #   | Issue                                                                        | Complexity |
| --- | ---------------------------------------------------------------------------- | ---------- |
| 141 | `a11y(toast): add a live region for notifications`                           | trivial    |
| 142 | `a11y(toast): give the dismiss button an accessible name`                    | trivial    |
| 143 | `a11y(toast): stop the hidden toast from being focusable`                    | trivial    |
| 144 | `a11y(spinner): announce loading with role=status`                           | trivial    |
| 145 | `a11y(shop): use one h1 and demote product headings`                         | trivial    |
| 146 | `a11y(shop): label the product grid and cards`                               | medium     |
| 147 | `a11y(admin): associate edit form labels with their inputs`                  | trivial    |
| 148 | `a11y(admin): announce the success banner`                                   | trivial    |
| 149 | `a11y(footer): keep legal links reachable on mobile`                         | trivial    |
| 150 | `a11y(not-found): add a heading and message to the 404 page`                 | trivial    |
| 151 | `a11y(checkout): mark invalid fields with aria-invalid`                      | medium     |
| 152 | `a11y(checkout): announce payment progress in a live region`                 | trivial    |
| 153 | `a11y(contrast): fix the contrast helper failing open on unparseable colors` | medium     |
| 154 | `a11y(contrast): support rgb() and 8-digit hex in the colour parser`         | medium     |
| 155 | `a11y(faq): keep collapsed answers out of the accessibility tree`            | medium     |
| 156 | `a11y(nav): mark the current page with aria-current`                         | trivial    |
| 157 | `a11y(testimonials): expose the star rating as text`                         | trivial    |
| 158 | `a11y(landing): give the numbered steps list semantics`                      | medium     |
| 159 | `a11y(orders): add scope and caption to the admin orders table`              | trivial    |
| 160 | `a11y(headings): fix the heading hierarchy on the landing page`              | medium     |

## 141. `a11y(toast): add a live region for notifications`

**Problem** — `components/Toast.jsx` renders its container without `role="status"` or `aria-live` (lines 27–36), so screen readers never announce "Item added to cart" or error messages. The toast is purely visual.

**Recommended change**

- Add `role="status"`, `aria-live="polite"` and `aria-atomic="true"` (or `assertive` for errors).

**Acceptance criteria**

- A shown toast is announced by assistive technology.
- Error toasts use an appropriate politeness.

**Guideline** — WCAG 2.1 SC 4.1.3 (Status Messages).

---

## 142. `a11y(toast): give the dismiss button an accessible name`

**Problem** — The toast close control contains only `✕` (line 35) with no `aria-label`, so its purpose is announced as a symbol.

**Recommended change**

- Add `aria-label="Dismiss notification"` (and hide the glyph from assistive tech).

**Acceptance criteria**

- The button has a programmatic name.
- The visible glyph is not read verbatim.

**Guideline** — WCAG 2.1 SC 4.1.2 (Name, Role, Value).

---

## 143. `a11y(toast): stop the hidden toast from being focusable`

**Problem** — The toast element is always mounted and only hidden visually through `opacity-0 translate-x-full` (`Toast.jsx` line 30), so keyboard users can Tab onto an invisible close button.

**Recommended change**

- When hidden, unmount it or make it inert (`inert`, `pointer-events-none` plus removal from the tab order).

**Acceptance criteria**

- The close button is not reachable while the toast is hidden.
- It is reachable while visible.

**Guideline** — Hidden content must not be focusable.

---

## 144. `a11y(spinner): announce loading with role=status`

**Problem** — `components/LoadingSpinner.jsx` renders a bare `<div className="loader …">` (line 7) with no `role="status"`, no `aria-live` and no text, so loading states are silent. It is used by `app/loading.jsx`, `app/shop/loading.jsx` and `app/shop/[id]/page.jsx`.

**Recommended change**

- Wrap with `role="status" aria-live="polite"` and add a visually hidden "Loading…" label.

**Acceptance criteria**

- The loading state is announced.
- The spinner remains visually unchanged.

**Guideline** — WCAG 2.1 SC 4.1.3 (Status Messages).

---

## 145. `a11y(shop): use one h1 and demote product headings`

**Problem** — `app/shop/page.jsx` renders its actual page title as a `<span>` (line 64) while each product card uses `<h1>` for the name and `<h2>` for the price (lines 84–85), plus an `<h2>` in the modal (line 114). A single page therefore exposes many `h1` elements and no true document title.

**Recommended change**

- Make the page title the `h1` and demote product names/prices to `h2`/`p` (or card-level `h3`).

**Acceptance criteria**

- Exactly one `h1` per page.
- Heading levels descend without skipping.

**Guideline** — WCAG 2.1 SC 1.3.1 (Info and Relationships).

---

## 146. `a11y(shop): label the product grid and cards`

**Problem** — The product grid is a plain list of cards (`div.grid` with `products.map`, `app/shop/page.jsx` lines 73–74) with no list semantics and no accessible grouping, so a screen-reader user cannot tell where the results begin or how many there are.

**Recommended change**

- Use list semantics (`ul`/`li`) or a labelled region for the grid, including an item count.

**Acceptance criteria**

- The results region has an accessible name and count.
- Each card is a single navigable item.

**Guideline** — Group repeated content into a labelled landmark or list.

---

## 147. `a11y(admin): associate edit form labels with their inputs`

**Problem** — `app/admin/EditProductForm.jsx` renders `<label>` elements without `htmlFor` (lines 86, 97, 109) while the inputs carry `id`s (lines 88, 99, 111) that nothing references. Clicking a label does not focus its field and assistive tech cannot announce it. `AddProductForm.jsx` does this correctly.

**Recommended change**

- Add `htmlFor` matching each input id.

**Acceptance criteria**

- Clicking a label focuses its input.
- Both product forms behave identically.

**Guideline** — WCAG 2.1 SC 1.3.1 and 3.3.2 (Labels or Instructions).

---

## 148. `a11y(admin): announce the success banner`

**Problem** — The success banner in `app/admin/EditProductForm.jsx` (lines 74–76) has no `role="status"` or `aria-live`, so the confirmation of a save is never announced — while the adjacent error banner does carry `role="alert"` (line 78).

**Recommended change**

- Add `role="status"` (or `aria-live="polite"`).

**Acceptance criteria**

- Saving announces success to assistive technology.
- The error banner remains assertive.

**Guideline** — WCAG 2.1 SC 4.1.3 (Status Messages).

---

## 149. `a11y(footer): keep legal links reachable on mobile`

**Problem** — `components/Footer.jsx` wraps the legal and support links in `hidden … sm:flex` (line 9), hiding Terms, Privacy, About and Contact below the `sm` breakpoint, and the mobile drawer does not re-expose them: `components/Navbar.jsx` offers About Us and Contact Us but no Terms or Privacy link. On phones those two pages are unreachable by navigation.

**Recommended change**

- Remove the breakpoint gating so the links wrap and stack, or add them to the mobile drawer.

**Acceptance criteria**

- Terms and Privacy are reachable at mobile widths.
- The footer layout still holds at desktop widths.

**Guideline** — Responsive design must not remove navigation.

---

## 150. `a11y(not-found): add a heading and message to the 404 page`

**Problem** — `app/not-found.jsx` renders only a link styled with a large `mt-80` offset (lines 6–14): no heading, no explanation and no visible "404", so a dead route yields a near-blank page pushed to the bottom of the viewport.

**Recommended change**

- Add an `h1` ("Page not found"), a short explanation and a centred action.

**Acceptance criteria**

- The page has a heading and descriptive text.
- The action is visible without scrolling.

**Guideline** — Error pages should orient the user.

---

## 151. `a11y(checkout): mark invalid fields with aria-invalid`

**Problem** — Once validation is wired (#477), the checkout fields need to expose their error state; currently submission is gated only by native `required` and there is no `aria-invalid` or error text association. `app/checkout/page.tsx` imports `validateCardNumber`, `validateCardExpiry` and `validateCardCVV` (lines 42–44) without calling them, so no field-level error state exists at all.

**Recommended change**

- Set `aria-invalid` on failing fields and connect each message via `aria-describedby`, reusing `ariaInvalid` and `focusFirstError` from `lib/accessibility.ts`.

**Acceptance criteria**

- A failing field reports `aria-invalid="true"` and references its message.
- Focus moves to the first error.

**Guideline** — WCAG 2.1 SC 3.3.1 (Error Identification).

---

## 152. `a11y(checkout): announce payment progress in a live region`

**Problem** — `components/StellarCheckoutButton.jsx` reports its in-flight status in a plain `<span>` (`{message || "Processing…"}`, line 95) fed by the `onStatus` callback (line 69). Only the failure path is exposed to assistive tech — the error span carries `role="alert"` (line 124) — so the progress messages a buyer most needs while a payment is in flight are silent, and the success banner rendered from `result` is likewise an unlabelled `<div>` with no role.

**Recommended change**

- Wrap the busy status in a `role="status"`/`aria-live="polite"` region, and give the success banner a status role as well.
- Keep `role="alert"` on the error path so failures still interrupt.

**Acceptance criteria**

- Each `onStatus` message is announced once.
- Progress is polite and failures remain assertive.
- The button is visually unchanged.

**Guideline** — WCAG 2.1 SC 4.1.3 (Status Messages).

---

## 153. `a11y(contrast): fix the contrast helper failing open on unparseable colors`

**Problem** — `lib/accessibility.ts` `getRelativeLuminance` returns `0` when `parseHexColor` fails (lines 277–280), so an invalid colour is treated as black and `meetsContrastRequirement("not-a-color", "#ffffff")` returns `true` with a 21:1 ratio. A contrast checker that passes what it cannot parse gives false assurance.

**Recommended change**

- Return `NaN` (or throw) for unparseable input, and have `meetsContrastRequirement` return `false`.

**Acceptance criteria**

- An invalid colour fails the contrast check.
- Valid colours are unchanged.

**Guideline** — Fail closed on invalid input in a compliance helper.

---

## 154. `a11y(contrast): support rgb() and 8-digit hex in the colour parser`

**Problem** — `parseHexColor` (`lib/accessibility.ts` lines 253–265) uses `parseInt(cleaned, 16)`, which silently accepts trailing garbage: `"12345g"` is six characters, so it passes the length guard and parses as `0x12345` rather than being rejected. It also only handles 3- and 6-digit hex — `rgb()`, `rgba()` and `#rrggbbaa`, all of which the design system can emit, are rejected outright by the `length !== 6` check.

**Recommended change**

- Validate the full hex string with a regex before parsing, and support `rgb()`/8-digit hex.

**Acceptance criteria**

- Trailing-garbage input is rejected.
- `rgb()` and 8-digit hex are parsed correctly.
- Table-driven tests cover each accepted and rejected form.

**Guideline** — Parse leniently only where the specification allows it.

---

## 155. `a11y(faq): keep collapsed answers out of the accessibility tree`

**Problem** — `app/(landingpage)/FAQ.jsx` collapses answers with `max-h-0` (line 84) while leaving every panel mounted, and only toggles `aria-expanded` on the trigger (line 71). `max-h-0` with `overflow-hidden` is a purely visual clip: the collapsed answer stays in the accessibility tree and in the tab order, so a screen-reader user hears all answers at once and can land on controls inside collapsed panels. The trigger also has no `aria-controls`, so the disclosure is not programmatically tied to its panel.

**Recommended change**

- Give each panel an `id` and reference it from the trigger with `aria-controls`, and hide collapsed content with `hidden`/`inert` (or unmount it) instead of relying on `max-h-0` alone.

**Acceptance criteria**

- A collapsed answer is neither announced nor focusable.
- The expanded answer and its trigger are programmatically associated.
- The open/close transition is preserved.

**Guideline** — Visual clipping is not the same as hiding content from assistive tech.

---

## 156. `a11y(nav): mark the current page with aria-current`

**Problem** — `components/Navbar.jsx` gives no indication of the current destination: `aria-current` appears nowhere in the codebase, and there is no active-link styling either, so a screen-reader user moving through the link list cannot tell which one corresponds to the page they are on. The mobile drawer repeats the same list (lines 204–231) with the same omission.

**Recommended change**

- Set `aria-current="page"` on the link matching the current route (via `usePathname`).

**Acceptance criteria**

- The link for the current page exposes `aria-current="page"`.
- Exactly one link is marked current at a time.
- The behaviour applies in both the desktop nav and the mobile drawer.

**Guideline** — WCAG 2.1 SC 1.3.1 and 2.4.8 (Location).

---

## 157. `a11y(testimonials): expose the star rating as text`

**Problem** — `app/(landingpage)/Testimonials.jsx` conveys each rating as a row of `FaStar` icons built from `[...Array(testimonial.rating)]` (lines 77–78). The icons carry no accessible text and no `aria-hidden`, so assistive tech reads nothing meaningful and the rating — a review's core signal — is available only visually. The adjacent `SiStellar` icon (line 82) is decorative in the same way.

**Recommended change**

- Mark the icon row `aria-hidden="true"` and expose the value as text, for example a visually hidden "5 out of 5 stars".

**Acceptance criteria**

- Each testimonial exposes its numeric rating to assistive tech.
- Decorative icons are hidden from it.
- The visual design is unchanged.

**Guideline** — WCAG 2.1 SC 1.1.1 (Non-text Content).

---

## 158. `a11y(landing): give the numbered steps list semantics`

**Problem** — `app/(landingpage)/HowItWorks.jsx` presents a numbered, ordered four-step process as a grid of `<div>`s (lines 48–50), with each step number rendered inside a styled `<span>` (line 58). Because the sequence is not expressed as an ordered list, assistive tech announces four unrelated blocks and the ordering — the entire point of the section — is lost.

**Recommended change**

- Render the steps as an `<ol>`/`<li>` (keeping the grid classes on the list) or otherwise expose the sequence.

**Acceptance criteria**

- The steps are announced as an ordered list of four items.
- The visual layout is unchanged.

**Guideline** — WCAG 2.1 SC 1.3.1 (Info and Relationships).

---

## 159. `a11y(orders): add scope and caption to the admin orders table`

**Problem** — The admin orders table in `app/admin/orders/page.tsx` renders seven `<th>` cells (lines 405–423) with no `scope` attribute and no `<caption>`, so assistive tech cannot reliably associate each cell with its column and the table has no accessible name. (The buyer orders view is not affected: `app/orders/page.tsx` renders `OrderCard` components rather than a table.)

**Recommended change**

- Add `scope="col"` to the header cells and a `<caption>` describing the table.

**Acceptance criteria**

- Headers are associated with their columns.
- The table has a descriptive caption.

**Guideline** — WCAG 2.1 SC 1.3.1.

---

## 160. `a11y(headings): fix the heading hierarchy on the landing page`

**Problem** — The landing page is composed of sections in `app/(landingpage)/`, two of which each introduce their own `h1` — `Hero.jsx` (line 35) and `Aboutus.jsx` (line 22) — so multiple top-level headings compete, while the remaining sections supply their own `h2`/`h3` pairs. Landmark and heading navigation therefore produce a noisy, inconsistent outline.

**Recommended change**

- Define one `h1` for the page and order section headings as descending `h2`/`h3`.

**Acceptance criteria**

- One `h1` per page.
- No skipped heading levels.

**Guideline** — WCAG 2.1 SC 1.3.1 (Info and Relationships).

---

# Batch 9 — Performance & DX (issues 161–180)

> ✅ **PUBLISHED — all 20 issues, GitHub [#617](../../issues/617)–[#636](../../issues/636) on 2026-09-27.** No labels applied (the Drip bot labels on campaign add). Community banner prepended to every body.

> Draft&rarr;issue map: 161&rarr;[#617](../../issues/617), 162&rarr;[#618](../../issues/618), 163&rarr;[#619](../../issues/619), 164&rarr;[#620](../../issues/620), 165&rarr;[#621](../../issues/621), 166&rarr;[#622](../../issues/622), 167&rarr;[#623](../../issues/623), 168&rarr;[#624](../../issues/624), 169&rarr;[#625](../../issues/625), 170&rarr;[#626](../../issues/626), 171&rarr;[#627](../../issues/627), 172&rarr;[#628](../../issues/628), 173&rarr;[#629](../../issues/629), 174&rarr;[#630](../../issues/630), 175&rarr;[#631](../../issues/631), 176&rarr;[#632](../../issues/632), 177&rarr;[#633](../../issues/633), 178&rarr;[#634](../../issues/634), 179&rarr;[#635](../../issues/635), 180&rarr;[#636](../../issues/636).

> **Three drafts were replaced and five narrowed before publishing.** Thirteen of 20 were accurate as written — the best rate since Batch 7.
>
> - **163** claimed the cart "recomputes its total on every render from the items array". It does not: `totalPrice` is separate state (`context/CartContext.jsx` line 55), persisted independently to `localStorage` and updated imperatively, so no per-render derivation exists. **Rewritten** as `perf(cart): derive the cart total from the items` — the real problem is that the stored total can drift from the items it describes.
> - **165** claimed images render without intrinsic dimensions and cause cumulative layout shift on the landing and shop pages. Both use `next/image` with explicit dimensions (shop page lines 80–81 and 127–128; `Categories.jsx` uses `fill` inside an `aspect-square` container), so there is no shift. **Replaced** with `chore(repo): stop treating binary assets as text in .gitattributes` — the single `* text eol=lf` rule applies EOL normalisation to binaries, and `git status` reports the whole `public/` asset set as modified.
> - **173** claimed `.env.local.example` omits or misdescribes the USDC and admin variables. It documents both, and a diff against every `process.env` read found nothing missing except `NODE_ENV`. **Replaced** with `perf(admin): memoize the derived order list and status counts` — `app/admin/orders/page.tsx` sorts the whole collection and then makes four filter passes on every render (lines 279 and 284–287).
> - **176** claimed the shop page re-filters the catalogue on every render. There is no filtering on that page at all — it maps `products` directly (line 74). The sidebar's `?search=` parameter is indeed never read, but that flow is already tracked as a repository issue. **Replaced** with `perf(indexer): stop polls overlapping when a request outruns the interval` — `tick` guards only on the lifecycle flag `this.running` (line 115), so a slow poll overlaps the next timer.
> - **170** was narrowed to the real gap: `coverage/` is absent from `.gitignore` even though `test:coverage` and the v8/`html` reporter write it. The "every binary asset as modified" observation moved to 165 and the local scratch files to 169.
> - **171** was narrowed: `CONTRIBUTING.md` asks contributors to run the checks by hand rather than implying a hook already exists, so the issue now rests on the no-op `prepare` script alone (`package.json` line 34).
> - **174** was narrowed: `set -euo pipefail` is already present (line 18), as is a post-build wasm check, so the issue now covers only the missing upfront prerequisite validation.
> - **180** was corrected: the indexer's only consumer is `StellarOrderWatch.jsx` on the **buyer checkout page** (`app/checkout/page.tsx` line 464), not a backgrounded admin tab.
> - **164**, **166**, **178** and **179** gained the specific files and line numbers their claims depend on: `app/page.jsx` lines 2–15/21–48, the CI job list, and `CONTRIBUTING.md` lines 184–185 against the eleven `.test.jsx` files and twenty-one files in `tests/components/`.
>
> As with Batch 8, these premises were false when written rather than outpaced by `main`. 3 of the 20 required replacement, against Batch 8's 5.

---

### Complexity

| #   | Issue                                                                       | Complexity |
| --- | --------------------------------------------------------------------------- | ---------- |
| 161 | `perf(images): adopt next/image for product thumbnails`                     | medium     |
| 162 | `perf(shop): avoid refetching products on every mount`                      | medium     |
| 163 | `perf(cart): derive the cart total from the items`                          | trivial    |
| 164 | `perf(landing): defer below-the-fold landing sections`                      | medium     |
| 165 | `chore(repo): stop treating binary assets as text in .gitattributes`        | trivial    |
| 166 | `perf(bundle): audit and trim the client bundle`                            | high       |
| 167 | `chore(deps): update next to the latest patched 14.2.x`                     | medium     |
| 168 | `chore(deps): add Dependabot for npm and cargo`                             | trivial    |
| 169 | `chore(repo): remove the stray fix_orders.py and fix_scval.py scripts`      | trivial    |
| 170 | `chore(repo): ignore the coverage output produced by test:coverage`         | trivial    |
| 171 | `chore(hooks): implement the prepare hook with lint-staged`                 | medium     |
| 172 | `chore(config): fix the tailwind content glob`                              | trivial    |
| 173 | `perf(admin): memoize the derived order list and status counts`             | trivial    |
| 174 | `chore(scripts): validate prerequisites before deploying`                   | medium     |
| 175 | `chore(deps): keep next and eslint-config-next in step`                     | trivial    |
| 176 | `perf(indexer): stop polls overlapping when a request outruns the interval` | trivial    |
| 177 | `perf(context): stabilize the cart context value`                           | medium     |
| 178 | `chore(dx): add a combined verify script`                                   | trivial    |
| 179 | `chore(dx): add a working quickstart to CONTRIBUTING.md`                    | medium     |
| 180 | `perf(indexer): pause polling while the tab is hidden`                      | medium     |

## 161. `perf(images): adopt next/image for product thumbnails`

**Problem** — Product and order thumbnails render with raw `<img>` and an ESLint disable comment (for example `components/OrderCard.tsx` line 119), bypassing Next's image optimization, responsive sizing and lazy loading, while `next.config.mjs` already configures remote patterns for the hostnames involved. The same pattern appears in `app/admin/page.jsx` line 89 and `app/admin/EditProductForm.jsx` line 118.

**Recommended change**

- Migrate product and order images to `next/image` with explicit sizes.

**Acceptance criteria**

- No raw `<img>` remains in product-rendering components.
- Images lazy-load and serve optimized variants.

**Guideline** — Use the framework image pipeline for content images.

---

## 162. `perf(shop): avoid refetching products on every mount`

**Problem** — The shop page loads products in an effect on mount (`app/shop/page.jsx` lines 23–40) with no cache, so navigating between catalogue routes refetches the full list each time even when nothing changed.

**Recommended change**

- Cache the product list (a shared query store or a server component with revalidation).

**Acceptance criteria**

- Navigating back to the shop does not trigger a redundant full fetch.
- Fresh data still appears after a mutation.

**Guideline** — Cache reads; invalidate on writes.

---

## 163. `perf(cart): derive the cart total from the items`

**Problem** — `context/CartContext.jsx` keeps the cart total as its own state entry (`totalPrice`, line 55) persisted separately to `localStorage` under `"totalPrice"` (read at line 38, written at lines 79, 108, 128 and 169, cleared at line 181) and recomputed imperatively on every mutation by re-reading and re-parsing the stored string (lines 107 and 167). Because the total is stored independently of `cartItems`, the two can drift — a stored total can describe a cart that no longer exists — and each mutation re-parses the value it has just written.

**Recommended change**

- Derive the total from `cartItems` (a `useMemo` over the items, or a `reduce` at read time) and persist the items only.

**Acceptance criteria**

- The displayed total is always the sum of the current items.
- No separate `totalPrice` key is persisted.
- The value matches the current implementation for every cart state.

**Guideline** — One source of truth for derived values.

---

## 164. `perf(landing): defer below-the-fold landing sections`

**Problem** — The landing page (`app/page.jsx`) eagerly imports and renders all fourteen sections (imports at lines 2–15, rendered at lines 21–48) — hero, three catalogues, the slider, stellar, features, how-it-works, testimonials, FAQ, about, newsletter and contact — as one client component, inflating the initial payload for content the user has not scrolled to.

**Recommended change**

- Split and lazily load the below-the-fold sections (`next/dynamic`, or a `Suspense` boundary per section).

**Acceptance criteria**

- Above-the-fold content renders without waiting on below-the-fold chunks.
- Sections still appear on scroll.

**Guideline** — Defer work that is not immediately visible.

---

## 165. `chore(repo): stop treating binary assets as text in .gitattributes`

**Problem** — `.gitattributes` contains a single rule, `* text eol=lf`, which marks _every_ path as text and so applies end-of-line normalisation to binary assets as well. The working tree already shows the consequence: `git status` reports the whole `public/` asset set — `apple-icon.png`, `favicon.ico`, `icon.png`, `images/og-image.png`, `images/mova-logo.png`, `assets/welcomvid.mp4` and the rest — as modified. Binary files must be excluded from text handling so Git stores them byte-for-byte.

**Recommended change**

- Mark binary assets `-text` (or `binary`) and scope the text rule to source files.

**Acceptance criteria**

- Binary files are stored verbatim, with no EOL conversion.
- Text files still normalise to LF.
- A fresh checkout leaves `public/` clean in `git status`.

**Guideline** — Never apply text normalisation to binary assets.

---

## 166. `perf(bundle): audit and trim the client bundle`

**Problem** — There is no bundle-budget check — CI runs lint, format check, type check, tests, coverage and build (`.github/workflows/ci.yml`), but nothing measures what ships — and the app pulls icon libraries and heavy UI imports into client components without analysis, so regressions are invisible.

**Recommended change**

- Add a bundle analysis step and document a budget for the main client chunk.

**Acceptance criteria**

- A bundle report is produced in CI or on demand.
- Oversized dependencies are identified and either code-split or replaced.

**Guideline** — Measure the bundle before optimizing it.

---

## 167. `chore(deps): update next to the latest patched 14.2.x`

**Problem** — `package.json` pins `next` to exactly `14.2.5` (line 42), a release that predates the security fixes in the later 14.2.x line, while `SECURITY.md` claims dependencies are regularly updated for security patches (line 112).

**Recommended change**

- Bump `next` to the latest patched 14.2.x and verify the build and tests.

**Acceptance criteria**

- `next` is on a patched 14.2.x release.
- `npm run build`, `test` and `type-check` pass.

**Guideline** — Track security patches within the pinned major.

---

## 168. `chore(deps): add Dependabot for npm and cargo`

**Problem** — There is no `.github/dependabot.yml`, so dependency updates depend on someone noticing; `SECURITY.md` states dependencies are regularly updated for security patches (line 112).

**Recommended change**

- Add Dependabot configuration for `npm` and `cargo` on a sensible schedule.

**Acceptance criteria**

- Update pull requests are opened automatically.
- The config covers both ecosystems.

**Guideline** — Automate dependency hygiene.

---

## 169. `chore(repo): remove the stray fix_orders.py and fix_scval.py scripts`

**Problem** — `fix_orders.py` and `fix_scval.py` are throwaway string-replacement scripts hardcoded to `C:\Users\someo\Documents\Codex\bounty_work\mova-new\...` paths on one person's machine. They are referenced by no script or document, and `fix_scval.py` would duplicate an existing function if run — it appends `resolveOrderIdHash`, which already exists at `lib/stellar/scval.ts` line 171 and is already imported by `lib/stellar/orders.ts`.

**Recommended change**

- Delete both files.

**Acceptance criteria**

- Neither file exists in the repository.
- No reference to them remains.

**Guideline** — Do not commit one-off local scripts.

---

## 170. `chore(repo): ignore the coverage output produced by test:coverage`

**Problem** — `.gitignore` covers build output, dependencies and env files, but has no entry for test coverage, even though `package.json` defines `test:coverage` (`vitest run --coverage`, line 31) and `vitest.config.ts` configures the v8 provider with `text`, `json` and `html` reporters (lines 33–36). Running it writes a `coverage/` tree into the working directory, where it is untracked but not ignored and can be committed by accident.

**Recommended change**

- Add `coverage/` to `.gitignore`.

**Acceptance criteria**

- `npm run test:coverage` leaves `git status` clean.
- The threshold configuration in `vitest.config.ts` still applies.

**Guideline** — Ignore every artifact the tooling generates.

---

## 171. `chore(hooks): implement the prepare hook with lint-staged`

**Problem** — `package.json` defines `"prepare": "echo 'Mova Store ready!'"` (line 34), a no-op that runs on every install and does nothing for contributors. Prettier and ESLint are configured and `CONTRIBUTING.md` instructs contributors to run the checks by hand (line 88, and the formatting section from line 111), but nothing wires formatting or linting to the install or commit lifecycle.

**Recommended change**

- Implement a real `prepare` hook running `lint-staged` (Prettier + ESLint on staged files), or delete the script.

**Acceptance criteria**

- Staged files are formatted and linted before commit, or the script is gone.
- The behaviour is documented in `CONTRIBUTING.md`.

**Guideline** — Hooks should do something or not exist.

---

## 172. `chore(config): fix the tailwind content glob`

**Problem** — `tailwind.config.ts` includes a `pages/` glob (line 5) pointing at a directory that does not exist in an App Router project, so the glob is dead and could mask a missing path for real content.

**Recommended change**

- Remove the stale glob and confirm all real source paths are covered.

**Acceptance criteria**

- Every glob resolves to existing paths or is removed.
- No utility classes are purged incorrectly.

**Guideline** — Configuration should not reference non-existent paths.

---

## 173. `perf(admin): memoize the derived order list and status counts`

**Problem** — `app/admin/orders/page.tsx` rebuilds all of its derived data on every render: `sortedOrders` copies and sorts the entire order collection (line 279: `Array.from(orders.values()).sort(...)`), and `stats` then makes four further passes over that array to count each status (lines 284–287). Every unrelated state change — opening a dialog, toggling a filter — repeats all five passes over the full order set. The page already wraps its handlers in `useCallback` (lines 219 and 249), so the omission is inconsistent rather than deliberate.

**Recommended change**

- Compute the sorted list and the status counts inside a single `useMemo` keyed on the orders state, collapsing the four counts into one pass.

**Acceptance criteria**

- The sort and the counts run only when the orders change.
- Displayed values are unchanged.

**Guideline** — Hoist derived data out of the render body.

---

## 174. `chore(scripts): validate prerequisites before deploying`

**Problem** — `scripts/deploy-testnet.sh` already sets `set -euo pipefail` (line 18) and checks that the built wasm exists, but it never validates its prerequisites up front: it assumes `stellar`, `cargo` and the `wasm32v1-none` target are installed and that the source keypair resolves, so a missing toolchain surfaces as a failure partway through a deployment rather than before it begins.

**Recommended change**

- Add prerequisite checks (`command -v` for `stellar` and `cargo`, target presence, keypair resolution) with a clear message before the build step.

**Acceptance criteria**

- Missing prerequisites abort before any deployment step.
- The failure names the missing prerequisite.
- The existing `set -euo pipefail` behaviour is preserved.

**Guideline** — Deployment scripts must fail fast and loudly.

---

## 175. `chore(deps): keep next and eslint-config-next in step`

**Problem** — `package.json` pins both `next` (line 42) and `eslint-config-next` (line 61) to exactly `14.2.5`. Because both are exact pins, bumping one without the other (as in issue 167) silently desynchronises the lint rules from the framework version.

**Recommended change**

- Manage both as a pair, ideally through a single range or a Dependabot group.

**Acceptance criteria**

- Both packages resolve to the same version line.
- A documented process exists for bumping them together.

**Guideline** — Keep tightly coupled packages on one version.

---

## 176. `perf(indexer): stop polls overlapping when a request outruns the interval`

**Problem** — `PaymentEventIndexer.start` schedules work with a plain `setInterval` (`lib/stellar/indexer.ts` line 102), and `tick` guards only on the lifecycle flag `this.running` (line 115) — a flag that stays true for the whole run. If a poll takes longer than the 4-second interval, the next timer fires while the previous `await this.poll(callbacks)` is still unresolved, so requests overlap, the cursor can advance out of order, and the same event can be processed twice.

**Recommended change**

- Add an in-flight guard that skips a tick while the previous one is unresolved, or replace the interval with a self-scheduling `setTimeout` chain.

**Acceptance criteria**

- At most one poll is in flight at a time.
- Slow responses do not produce overlapping RPC calls.

**Guideline** — Never let an interval outrun its own work.

---

## 177. `perf(context): stabilize the cart context value`

**Problem** — `context/CartContext.jsx` provides an inline object literal (`value={{ ... }}`, lines 186–198) that is recreated on every render, so every consumer re-renders even when the cart content is unchanged.

**Recommended change**

- Memoize the context value and stabilize the callbacks with `useCallback`.

**Acceptance criteria**

- Consumers do not re-render when unrelated state changes.
- Cart behaviour is unchanged.

**Guideline** — Context values should be referentially stable.

---

## 178. `chore(dx): add a combined verify script`

**Problem** — Contributors must remember to run lint, format check, type check and tests separately, and CI runs them in its own order (`lint`, `format:check`, `type-check`, `test`, `test:coverage`, `build` in `.github/workflows/ci.yml`), so local verification does not match CI.

**Recommended change**

- Add a `verify` script that runs the same checks CI runs, in the same order.

**Acceptance criteria**

- `npm run verify` reproduces the CI result locally.
- The script is documented in `CONTRIBUTING.md`.

**Guideline** — Local verification should mirror CI.

---

## 179. `chore(dx): add a working quickstart to CONTRIBUTING.md`

**Problem** — `CONTRIBUTING.md` describes a test layout that does not match the repository: it mandates `.test.ts`/`.test.tsx` naming (line 184) while eleven `.test.jsx` files exist under `tests/`, and it tells contributors not to assume a `tests/components/` directory exists (line 185) although that directory holds twenty-one files. A newcomer following it produces inconsistent work.

**Recommended change**

- Rewrite the quickstart and testing sections from the real tree.

**Acceptance criteria**

- Every path and naming rule in the guide matches the repository.
- A newcomer can run the suite by following it exactly.

**Guideline** — Onboarding docs must be executable.

---

## 180. `perf(indexer): pause polling while the tab is hidden`

**Problem** — `PaymentEventIndexer` polls every 4 seconds (`EVENT_POLL_INTERVAL_MS = 4000`, `lib/stellar/config.ts` line 117) through an unconditional `setInterval` (`lib/stellar/indexer.ts` line 102) with no regard for page visibility. Its only consumer, `components/StellarOrderWatch.jsx`, is mounted on the buyer checkout page (`app/checkout/page.tsx` line 464), so a buyer who backgrounds the tab during a payment keeps the poll running against the RPC.

**Recommended change**

- Pause polling while the document is hidden and resume (with a catch-up) on focus.

**Acceptance criteria**

- No polls occur while the tab is hidden.
- Events are not missed on resume.

**Guideline** — Background tabs should not poll.

---

# Batch 10 — Tests, docs & repo hygiene (issues 181–200)

> ✅ **PUBLISHED — 19 issues, GitHub [#676](../../issues/676)–[#694](../../issues/694) on 2026-09-27.** Draft 197 was excluded: it shipped directly in commit `da302415`. No labels applied (the Drip bot labels on campaign add). Community banner prepended to every body.

> Draft&rarr;issue map: 181&rarr;[#676](../../issues/676), 182&rarr;[#677](../../issues/677), 183&rarr;[#678](../../issues/678), 184&rarr;[#679](../../issues/679), 185&rarr;[#680](../../issues/680), 186&rarr;[#681](../../issues/681), 187&rarr;[#682](../../issues/682), 188&rarr;[#683](../../issues/683), 189&rarr;[#684](../../issues/684), 190&rarr;[#685](../../issues/685), 191&rarr;[#686](../../issues/686), 192&rarr;[#687](../../issues/687), 193&rarr;[#688](../../issues/688), 194&rarr;[#689](../../issues/689), 195&rarr;[#690](../../issues/690), 196&rarr;[#691](../../issues/691), **197&rarr;completed in `da302415`**, 198&rarr;[#692](../../issues/692), 199&rarr;[#693](../../issues/693), 200&rarr;[#694](../../issues/694).

> **One draft was replaced, one narrowed, and three line references corrected.** Eighteen of 19 were accurate as written — the best rate of any batch so far.
>
> - **184** claimed `tests/setup.ts` "mocks the WebCrypto digest so hashing tests run against a stub". The opposite is true: lines 27–32 install the genuine `webcrypto` from `node:crypto` under the comment "Provide genuine WebCrypto for tests", and no `subtle`/`digest` stub exists anywhere in `tests/`. **Replaced** with `test(config): resolve the contradictory NODE_ENV configuration` — `vitest.config.ts` defines `process.env.NODE_ENV` as `"test"` at build time (line 7) while setting it to `"development"` at runtime (line 23), so the development guards in `lib/env.ts` line 217 and `components/ErrorBoundary.tsx` lines 49 and 91 can never be taken under test.
> - **192** claimed no document explains "how a bounty is claimed". `CONTRIBUTING.md` covers bounty claiming in detail (lines 39–53 and 264), so that half of the premise was dropped. What is genuinely absent is the wave structure layered on top: the word "wave" appears nowhere in `README.md`, `CONTRIBUTING.md` or `docs/`, although the `Stellar Wave` label is applied to wave issues. **Narrowed** to documenting the wave labels.
> - **190** was made specific: line 236 is the Rust row, and the table breaks because the install command's unescaped `|` splits the cell.
> - **195** cited line 113; `payment_received` is on line 114, and the doc contradicts itself at line 201 — both facts are now stated.
> - **196** cited "lines 153, 156"; the endpoint is set at lines 153–154, against `lib/stellar/config.ts` line 24.
> - **200** lost an unverifiable claim about "internal reviewer personas" (no such content exists) and kept the two that verify: the claim-eligibility wording and the links to the personal fork `github.com/woahwhattheheck/mova-store`.
> - **182**, **185**, **186**, **187** and **191** gained the evidence their claims rest on: the matching blob hash `8ee8119a`, the threshold values and absent `all: true`, the mixed filename styles against a silent CI, the seven enumerated scval files, and the missing `tests/`/`__tests__/`/`supabase/`/`hooks/`/`styles/` entries.
>
> **A parser note for future batches:** draft 197's heading carries a `— ✅ COMPLETED` suffix, which broke the extraction regex used to publish — with `re.S` in play, the lazy title pattern ran past the backtick and swallowed draft 198 whole, so 198's issue was silently skipped on the first pass. Titles are now matched with `[^\n]+?`. The 19 issues above were reconciled against GitHub by title afterwards.

---

### Complexity

| #   | Issue                                                                      | Complexity |
| --- | -------------------------------------------------------------------------- | ---------- |
| 181 | `test(ci): remove the duplicate __tests__ tree`                            | high       |
| 182 | `test(ci): resolve the case-colliding ContactUs test pair`                 | medium     |
| 183 | `test(ci): merge the duplicate .jsx/.tsx test twins`                       | medium     |
| 184 | `test(config): resolve the contradictory NODE_ENV configuration`           | trivial    |
| 185 | `test(coverage): enable coverage.all and raise the thresholds`             | high       |
| 186 | `test(ci): enforce a test file naming convention`                          | medium     |
| 187 | `test(lib): consolidate the seven overlapping scval test files`            | high       |
| 188 | `docs(readme): fix the broken Paying with Stellar anchor`                  | trivial    |
| 189 | `docs(readme): remove the duplicated environment sentence`                 | trivial    |
| 190 | `docs(readme): fix the malformed table row`                                | trivial    |
| 191 | `docs(readme): refresh the repository layout tree`                         | trivial    |
| 192 | `docs(contributing): document the wave labels and how to find wave issues` | trivial    |
| 193 | `docs(troubleshooting): remove the unimplemented debug switch`             | trivial    |
| 194 | `docs(troubleshooting): settle on one stellar account CLI syntax`          | trivial    |
| 195 | `docs(architecture): correct the event name referenced in the flow`        | trivial    |
| 196 | `docs(mainnet): reconcile the mainnet RPC endpoint with code`              | trivial    |
| 198 | `chore(github): add CODEOWNERS for critical paths`                         | trivial    |
| 199 | `docs(repo): add a docs index`                                             | trivial    |
| 200 | `docs(repo): move the internal process notes out of docs/`                 | trivial    |

## 181. `test(ci): remove the duplicate __tests__ tree`

**Problem** — The repository carries two parallel test trees. `__tests__/` contains `env.test.ts`, `errors.test.ts`, `events.test.ts`, `products.test.ts`, `scval.test.ts` and `useToast.test.ts`, each targeting the same modules as its counterpart under `tests/lib/` or `tests/hooks/`, but with diverging assertions. `vitest.config.ts` includes `**/*.{test,spec}.{js,jsx,ts,tsx}`, so both run, `CONTRIBUTING.md` documents only `tests/`, and a fix in one tree does not protect the other.

**Recommended change**

- Adopt `tests/` as canonical, merge any unique assertions from `__tests__/`, and delete the duplicate tree.

**Acceptance criteria**

- One canonical tree exists.
- No module has two divergent test files.
- `npm run test` passes and `CONTRIBUTING.md` matches.

**Guideline** — One home per test.

---

## 182. `test(ci): resolve the case-colliding ContactUs test pair`

**Problem** — `tests/components/ContactUs.test.tsx` and `tests/components/contactus.test.tsx` are two index entries pointing at the **same blob** (`8ee8119a`) — byte-identical content under names differing only in case. On Linux (CI) Git materialises two files and Vitest runs the identical suite twice with duplicate `describe` names; on macOS the two index entries collapse into one file, so edits touch only one name and produce perpetual phantom diffs.

**Recommended change**

- Keep one canonical filename, delete the twin, and add a naming convention.

**Acceptance criteria**

- Only one ContactUs test file is tracked.
- The suite reports each test name once.

**Guideline** — Case-only duplicates break cross-platform checkouts.

---

## 183. `test(ci): merge the duplicate .jsx/.tsx test twins`

**Problem** — Several subjects are covered by two files differing only in extension: `tests/components/Footer.test.jsx` and `Footer.test.tsx`, `tests/context/CartContext.test.jsx` and `.tsx`, `tests/components/StellarOrderWatch.test.jsx` and `.tsx`, and `tests/lib/AuthContext.test.tsx` and `tests/lib/auth-context.test.tsx`. The pairs overlap, doubling runtime and leaving it unclear which is authoritative.

**Recommended change**

- Merge each pair into one typed file.

**Acceptance criteria**

- One file per subject.
- No assertion is lost in the merge.

**Guideline** — Collapse duplicate suites on sight.

---

## 184. `test(config): resolve the contradictory NODE_ENV configuration`

**Problem** — `vitest.config.ts` declares two different values for the same variable. Line 7 defines `"process.env.NODE_ENV": JSON.stringify("test")`, a build-time literal replacement applied to every source file, while line 23 sets the runtime `env: { NODE_ENV: "development" }`. Because `define` rewrites the references statically, the guard `process.env.NODE_ENV === "development"` in `lib/env.ts` line 217 and `components/ErrorBoundary.tsx` lines 49 and 91 can never be true under test, so the development-only branches those guards protect are unreachable however the suite is written.

**Recommended change**

- Pick one value and express it once — either drop the `define` and rely on `test.env`, or align both on a single environment name.

**Acceptance criteria**

- `process.env.NODE_ENV` resolves to the same value whether read at build time or runtime.
- A test can exercise the development branches in `lib/env.ts` and `components/ErrorBoundary.tsx`.

**Guideline** — A variable declared twice will eventually disagree with itself.

---

## 185. `test(coverage): enable coverage.all and raise the thresholds`

**Problem** — `vitest.config.ts` sets thresholds of `lines: 4`, `statements: 4`, `functions: 10`, `branches: 40` (lines 33–49) and does not enable `coverage.all`, so the v8 provider only counts files a test happens to import. Entirely untested modules are excluded from the denominator and `test:coverage` can never fail on a real regression.

**Recommended change**

- Add `all: true` with an explicit `include` covering `app/`, `components/`, `lib/`, `context/` and `hooks/`, then raise the thresholds to a realistic floor.

**Acceptance criteria**

- Untested modules count toward coverage.
- A coverage regression fails the job.

**Guideline** — A threshold that cannot be missed is not a gate.

---

## 186. `test(ci): enforce a test file naming convention`

**Problem** — Test filenames are inconsistent — `Accessibility.test.tsx` and `EditProductForm.test.tsx` sit beside `accessibility.test.ts`, `auth.test.js` and `auth-context.test.tsx`, with `.jsx` and `.ts` variants throughout — and there is no lint or CI rule, so naming drift is what allowed the case collision in issue 182.

**Recommended change**

- Define one convention in `CONTRIBUTING.md` and enforce it in CI.

**Acceptance criteria**

- A file violating the convention fails CI.
- The existing suite conforms after renames.

**Guideline** — Encode conventions in tooling, not prose.

---

## 187. `test(lib): consolidate the seven overlapping scval test files`

**Problem** — `lib/stellar/scval.ts` is covered by seven files: `tests/lib/scval.test.ts`, `tests/lib/stellar/scval.test.ts`, `tests/lib/bytes32-scval.test.ts`, `tests/lib/stellar/bytes32ToScVal.test.ts`, `tests/lib/hash-order-id.test.ts`, `tests/lib/resolve-order-id-hash.test.ts` and `__tests__/scval.test.ts`. Seven files for one module fragment coverage, overlap in scope and make it unclear which is authoritative.

**Recommended change**

- Consolidate into a small set organized by exported function.

**Acceptance criteria**

- Every export is covered in one obvious place.
- No assertions are lost.

**Guideline** — Group tests by module, not by authoring session.

---

## 188. `docs(readme): fix the broken Paying with Stellar anchor`

**Problem** — `README.md` line 85 links to `#paying-with-usdc-testnet`, but the section heading is `## Paying with Stellar (testnet)` (line 442), whose anchor is `#paying-with-stellar-testnet`. The link is dead on GitHub, while `CONTRIBUTING.md` line 222 already points at the correct anchor.

**Recommended change**

- Update the TOC entry to match the heading.

**Acceptance criteria**

- The anchor resolves.
- A link checker in CI would pass.

**Guideline** — Anchors must match headings exactly.

---

## 189. `docs(readme): remove the duplicated environment sentence`

**Problem** — `README.md` lines 272–273 both begin "A minimal Stellar-only configuration"; line 272 ends mid-clause with an unbalanced parenthesis and line 273 reads as its replacement. It is a botched merge in the setup section a newcomer reads first.

**Recommended change**

- Delete the truncated line.

**Acceptance criteria**

- One coherent sentence remains.
- No unbalanced parentheses in the section.

**Guideline** — Proofread the setup path.

---

## 190. `docs(readme): fix the malformed table row`

**Problem** — `README.md` line 236 is the **Rust** row of the prerequisites table, and its install command contains an unescaped `|` (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`) which splits the cell and breaks the table's column structure on GitHub.

**Recommended change**

- Escape the pipe (or use `<code>` / a fenced block) so the row keeps its column count.

**Acceptance criteria**

- The table renders as intended.
- Column counts are consistent.

**Guideline** — Markdown tables must be well-formed.

---

## 191. `docs(readme): refresh the repository layout tree`

**Problem** — The layout tree in `README.md` (lines 171–216) names `lib/AuthContext.jsx` (line 195; the real file is `lib/AuthContext.js`) and omits whole directories a contributor needs, including `tests/`, `__tests__/`, `supabase/`, `hooks/` and `styles/`.

**Recommended change**

- Regenerate the tree from `git ls-files`, or replace it with a link to the repository browser.

**Acceptance criteria**

- Every listed path exists.
- The main directories are represented.

**Guideline** — Generated documentation must be regenerated.

---

## 192. `docs(contributing): document the wave labels and how to find wave issues`

**Problem** — Work is organised into numbered waves carrying campaign labels — `Stellar Wave` is applied to wave issues — but the word "wave" appears nowhere in `README.md`, `CONTRIBUTING.md` or `docs/`. A contributor arriving at the tracker sees the label with no explanation of what it marks, how waves are sequenced, or where to find the issues belonging to the current one. (`CONTRIBUTING.md` does cover bounty claiming itself, at lines 39–53 and 264; the wave structure layered on top of it is what is undocumented.)

**Recommended change**

- Add a short section naming the wave labels and explaining how to find the current wave's issues.

**Acceptance criteria**

- Ineligible issues can be identified as such without reading a wave label's description elsewhere.
- Every campaign label in active use is explained.

**Guideline** — Program mechanics belong in the contributor guide.

---

## 193. `docs(troubleshooting): remove the unimplemented debug switch`

**Problem** — `docs/TROUBLESHOOTING.md` (lines 330–337) tells users to run `localStorage.setItem("debug", "mova-store:*")` to "enable verbose logging". A repository-wide search finds that string only in this document; no application code reads a `debug` key, so the advice does nothing and sends bug reporters down a dead end.

**Recommended change**

- Remove the section, or implement the logger it implies.

**Acceptance criteria**

- Documented debugging steps have an effect, or are gone.
- No dead instructions remain.

**Guideline** — Do not document unimplemented behaviour.

---

## 194. `docs(troubleshooting): settle on one stellar account CLI syntax`

**Problem** — `stellar account info` appears with different call shapes across the docs: `docs/TROUBLESHOOTING.md` line 112 passes the key positionally with no `--source-account` (`stellar account info --network testnet <YOUR_PUBLIC_KEY>`), while line 258 uses `--source-account alice` and `docs/MAINNET_DEPLOYMENT.md` line 35 uses `--source-account merchant-mainnet`. At most one is correct; the others fail with an argument error.

**Recommended change**

- Verify against the pinned CLI version and use one canonical invocation everywhere.

**Acceptance criteria**

- Every documented command runs successfully.
- One syntax is used repo-wide.

**Guideline** — Verify commands before documenting them.

---

## 195. `docs(architecture): correct the event name referenced in the flow`

**Problem** — `docs/ARCHITECTURE.md` line 114 states that `pay` "Emits `payment_received`", but the contract emits a single `pay` topic with no alias (`docs/ARCHITECTURE.md` line 201 itself lists the decoded topics as `pay`, `create_order`, `dispatch` and `refund`). The architecture doc therefore describes an event that does not exist. The same inaccurate alias claim appears in `contracts/checkout/src/lib.rs` line 133 and is tracked as [#506](../../issues/506).

**Recommended change**

- Use the canonical event names from `events.rs`.

**Acceptance criteria**

- The doc names only events that exist.
- Names match the contract exactly.

**Guideline** — Documentation must match the ABI.

---

## 196. `docs(mainnet): reconcile the mainnet RPC endpoint with code`

**Problem** — `docs/MAINNET_DEPLOYMENT.md` lines 153–154 set `NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-rpc.stellar.org`, while `lib/stellar/config.ts` line 24 defaults the mainnet endpoint to `https://soroban-rpc.mainnet.stellar.gateway.fm`. An operator following the deployment guide and an operator relying on the code default therefore end up on different endpoints, and `lib/env.ts` reads the same variable again.

**Recommended change**

- Pick one canonical endpoint, update the doc and both config modules, and reference a single source.

**Acceptance criteria**

- Code and docs agree on one endpoint.
- A test pins the resolved default.

**Guideline** — One endpoint, one truth.

---

## 197. `chore(github): add issue and PR templates` — ✅ COMPLETED

> **Done in commit `da302415`** (`.github/ISSUE_TEMPLATE/{wave-task,bug_report,feature_request}.md`, `config.yml`, and `.github/pull_request_template.md`). Exclude this item when Batch 10 is approved — 19 issues remain in this batch. Numbering below is left unchanged so references stay valid.

**Problem** — `.github/` contains only `workflows/`. There is no issue template and no pull request template, even though `CONTRIBUTING.md` defines a PR checklist and `docs/TROUBLESHOOTING.md` asks for reproduction details. Every external PR therefore arrives in a different shape.

**Recommended change**

- Add bug and feature issue templates requesting the reproduction fields, plus a PR template mirroring the checklist.

**Acceptance criteria**

- New issues and PRs are created from templates.
- Templates request the fields the docs already specify.

**Guideline** — Templates encode the contribution contract.

---

## 198. `chore(github): add CODEOWNERS for critical paths`

**Problem** — There is no `CODEOWNERS` file anywhere (`.github/`, root or `docs/`), so review routing is manual. Contract and CI changes — the highest-risk paths — can be merged without a domain reviewer.

**Recommended change**

- Add `CODEOWNERS` covering `contracts/`, `.github/` and `supabase/`.

**Acceptance criteria**

- Changes to those paths request the designated reviewers.
- The file is valid and recognised by GitHub.

**Guideline** — Route review by risk.

---

## 199. `docs(repo): add a docs index`

**Problem** — `docs/` holds `ARCHITECTURE.md`, `MAINNET_DEPLOYMENT.md`, `PRODUCT_IMAGE_CLEANUP.md`, `TROUBLESHOOTING.md` and `reviews/` with no index, and `README.md` links only some of them, so contributors cannot discover the rest.

**Recommended change**

- Add `docs/README.md` listing each document with a one-line purpose, and link it from the root README.

**Acceptance criteria**

- Every document under `docs/` is listed.
- The index is linked from `README.md`.

**Guideline** — Documentation needs an entry point.

---

## 200. `docs(repo): move the internal process notes out of docs/`

**Problem** — `docs/PRODUCT_IMAGE_CLEANUP.md` and `docs/reviews/pr-364-validation.md` are internal process receipts rather than product documentation. They discuss claim and award eligibility ("this is not a separate bounty claim", line 59 of the former; "does not establish GrantFox eligibility, an award, or payment", line 46 of the latter) and link to a personal fork — `github.com/woahwhattheheck/mova-store` — rather than the canonical repository (lines 48 and 21–22). A new contributor cannot act on any of it.

**Recommended change**

- Move them out of `docs/`, or reduce each to its technical content.

**Acceptance criteria**

- `docs/` contains only contributor-facing documentation.
- No claim-eligibility content remains.
- No links point at a personal fork.

**Guideline** — Keep internal process records out of product docs.

---

# Batch 11 — Mainnet safety & payment correctness (issues 201–220)

> **✅ PUBLISHED** as [#704](../../issues/704)–[#723](../../issues/723) on 2026-09-27. All 20 verified with the community banner and all four sections. Issue numbers skip `#695`–`#703`, taken by contributor pull requests against earlier waves.
>
> Draft&rarr;issue map: 201&rarr;[#704](../../issues/704), 202&rarr;[#705](../../issues/705), 203&rarr;[#706](../../issues/706), 204&rarr;[#707](../../issues/707), 205&rarr;[#708](../../issues/708), 206&rarr;[#709](../../issues/709), 207&rarr;[#710](../../issues/710), 208&rarr;[#711](../../issues/711), 209&rarr;[#712](../../issues/712), 210&rarr;[#713](../../issues/713), 211&rarr;[#714](../../issues/714), 212&rarr;[#715](../../issues/715), 213&rarr;[#716](../../issues/716), 214&rarr;[#717](../../issues/717), 215&rarr;[#718](../../issues/718), 216&rarr;[#719](../../issues/719), 217&rarr;[#720](../../issues/720), 218&rarr;[#721](../../issues/721), 219&rarr;[#722](../../issues/722), 220&rarr;[#723](../../issues/723).

> **⚠️ RENUMBERED — 20 issues, complete again.** Drafts 201, 202, 209 and 210 originally duplicated Batch 4 ([#524](../../issues/524), [#520](../../issues/520), [#521](../../issues/521)) and were replaced in place on 2026-09-27 with four different mainnet payment-correctness issues; the withdrawn premises are recorded at the end of this batch. Same treatment as drafts 43, 50 and 60 in Batch 3 — the slot is reused, so the numbering and per-batch totals stay intact.

---

### Complexity

| #   | Issue                                                                                  | Complexity |
| --- | -------------------------------------------------------------------------------------- | ---------- |
| 201 | `fix(stellar): stop pricing XLM payments at a hardcoded $0.12 rate`                    | high       |
| 202 | `chore(stellar): validate the SUPPORTED_TOKENS registry`                               | medium     |
| 203 | `fix(stellar): reject an unrecognised network value instead of silently using testnet` | medium     |
| 204 | `fix(stellar): build the explorer link from the configured network`                    | trivial    |
| 205 | `fix(stellar): generate order ids with a cryptographically secure random source`       | medium     |
| 206 | `fix(stellar): detect when the Freighter account changes or disconnects`               | medium     |
| 207 | `fix(stellar): validate the network passphrase and not just the network name`          | medium     |
| 208 | `fix(stellar): guard hashOrderId against a missing crypto.subtle`                      | medium     |
| 209 | `fix(stellar): verify the decoded payment against the amount that was quoted`          | high       |
| 210 | `fix(stellar): account for the contract footprint in the native reserve check`         | medium     |
| 211 | `perf(stellar): push the watched event symbols into the RPC topic filter`              | medium     |
| 212 | `fix(stellar): scan the admin order history from a durable start ledger`               | medium     |
| 213 | `fix(stellar): decode the watched order through the shared event decoder`              | medium     |
| 214 | `fix(stellar): remove the stale-closure suppression in StellarOrderWatch`              | medium     |
| 215 | `fix(stellar): stop logging every payment status to the browser console`               | trivial    |
| 216 | `fix(admin): confirm before releasing escrow on dispatch or refund`                    | medium     |
| 217 | `fix(admin): refresh the order list without reloading the page`                        | trivial    |
| 218 | `fix(admin): attribute a dispatch or refund failure to the order that failed`          | medium     |
| 219 | `test(stellar): cover the mainnet branches of the token configuration`                 | medium     |
| 220 | `test(stellar): cover the indexer retention and cursor-reset paths`                    | medium     |

## 201. `fix(stellar): stop pricing XLM payments at a hardcoded $0.12 rate`

**Problem** — `lib/stellar/price.ts` ships a fixed reference rate, `DEFAULT_XLM_USD_PRICE = 0.12` (line 12), and uses it as the default when no price is supplied (line 23). Every XLM quote in the app therefore falls back to it: `payWithStellar` converts with `convertUsdToXlm(amountUsd)` and no rate argument (`lib/stellar/checkout.ts` line 91), the payment button does the same (`components/StellarCheckoutButton.jsx` line 31), and the checkout displays it to the buyer as fact — `Rate: 1 XLM ≈ ${DEFAULT_XLM_USD_PRICE} USD` alongside `≈ {convertUsdToXlm(totalPrice)} XLM` (`app/checkout/page.tsx` lines 450–451). Nothing consults a market rate. On mainnet the buyer is charged XLM at $0.12 regardless of the real price, so a higher market price overcharges them by the ratio and a lower one underpays the merchant, with the discrepancy invisible because the confirmation renders the USD figure the app itself supplied. Because `convertUsdToXlm` silently substitutes the fallback whenever the supplied price is not `> 0` (line 28), a caller that passes a bad rate is also silently reverted to it.

**Recommended change**

- Source the XLM rate from a live oracle or explicit configuration and pass it through every quote.
- Refuse to quote an XLM payment when no rate is available, rather than defaulting to a fixed number.
- Where a reference rate is retained, label it unambiguously as a fallback in the UI.

**Acceptance criteria**

- No XLM payment is priced from a hardcoded constant on mainnet.
- A missing or invalid rate produces a clear refusal, not a silent fallback.
- The rate used to display the quote is the same value used to build the transaction.
- A test covers a supplied rate and the no-rate case.

**Guideline** — A price is external, time-varying data; never bake one into the payment path.

---

---

## 202. `chore(stellar): validate the SUPPORTED_TOKENS registry`

**Problem** — `SUPPORTED_TOKENS` (`lib/stellar/config.ts` lines 78–94) is built from resolved contract ids with no check that the entries are distinct or non-empty, and lookups assume uniqueness: `defaultToken()` returns `SUPPORTED_TOKENS[0]` (line 98) while `tokenForContract` uses `.find` (line 102), which returns the first entry whose `contractId` matches. A configuration error that makes two tokens share an id — for example setting `NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID` to the USDC contract, or leaving both unset so a shared fallback applies — is accepted silently. `tokenForContract` then resolves an address to whichever entry comes first, so an XLM payment can be labelled, formatted and trustline-checked as USDC, and the buyer is shown the wrong symbol and decimals for the asset actually moving.

**Recommended change**

- Validate the registry at module load: every `contractId` non-empty, valid `C...` StrKey, and unique; throw with the offending entry named.
- Keep the uniqueness guarantee explicit so `tokenForContract` cannot become ambiguous.

**Acceptance criteria**

- A duplicate or empty contract id fails at load with a message naming the entry.
- `tokenForContract` cannot return two different configs for one id.
- A test covers the duplicate-id and empty-id cases.

**Guideline** — A lookup table keyed by identifier must be unique by construction.

---

---

## 203. `fix(stellar): reject an unrecognised network value instead of silently using testnet`

**Problem** — `NETWORK` is read as `process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet"` and `IS_MAINNET` is `NETWORK === "mainnet"` (lines 15–16). Any other value — `"Mainnet"`, `"main"`, `"production"`, a stray space — silently selects the testnet RPC, the testnet passphrase and the testnet token contracts. A typo in a production environment therefore produces a store that looks configured and transacts on testnet.

**Recommended change**

- Accept only the documented values (`testnet`, `mainnet`) and throw at module load or in `validateEnv` for anything else.
- Keep the unset case defaulting to testnet for local development.

**Acceptance criteria**

- An unrecognised value raises a clear error naming the variable and the accepted values.
- Unset still defaults to testnet.

**Guideline** — Configuration enums fail closed, never open.

---

## 204. `fix(stellar): build the explorer link from the configured network`

**Problem** — `components/StellarCheckoutButton.jsx` hardcodes the testnet explorer in the payment receipt link: `href={\`https://stellar.expert/explorer/testnet/tx/${result.hash}\`}` (line 133). On a mainnet checkout the buyer is sent to a testnet explorer page that will never resolve, while `app/admin/orders/page.tsx` correctly interpolates `NETWORK` (line 120) for the same link.

**Recommended change**

- Interpolate the configured `NETWORK` as the admin page already does, or expose one shared `explorerTxUrl(hash)` helper.

**Acceptance criteria**

- The receipt link on a mainnet build points at the mainnet explorer.
- Both the checkout and admin links come from the same helper.

**Guideline** — Derive environment-specific URLs from configuration, not literals.

---

## 205. `fix(stellar): generate order ids with a cryptographically secure random source`

**Problem** — Order ids are built from `Math.random()` in two places: the checkout (`app/checkout/page.tsx` line 74) and the payment button (`components/StellarCheckoutButton.jsx` line 26), both as `SS-${Date.now()}-${Math.floor(Math.random() * 1e6)}`. `Math.random()` is not a CSPRNG, and the id is hashed to the 32-byte `order_id` that the contract treats as unique. Because the id is guessable and the contract rejects a second `create_order` for an existing id with `OrderAlreadyPaid` (line 96), an observer can pre-register a buyer's likely order id and permanently block that checkout.

**Recommended change**

- Generate the id with `crypto.randomUUID()` (or `crypto.getRandomValues`) and keep one shared helper.
- Route both call sites through that helper.

**Acceptance criteria**

- Order ids are generated from a CSPRNG.
- One implementation exists, used by the checkout and the payment button.
- A test asserts the id source is not `Math.random`.

**Guideline** — Identifiers that gate on-chain uniqueness need unpredictable entropy.

---

## 206. `fix(stellar): detect when the Freighter account changes or disconnects`

**Problem** — `lib/stellar/freighter.ts` reads the address once per action and keeps it in component state (`components/StellarCheckoutButton.jsx` lines 34–42), with no subscription to wallet changes anywhere in the repo. If the user switches accounts or disconnects in Freighter after connecting, the app keeps signing with the stale address in state, so the payment is attempted from an address the user no longer controls and fails deep inside the simulation with an opaque error.

**Recommended change**

- Subscribe to Freighter's account/network change notifications (or re-read the address before submitting) and reset the stored key when it changes.
- Surface a clear message when the active account changes mid-checkout.

**Acceptance criteria**

- Switching accounts in Freighter invalidates the cached address.
- The next payment attempt re-reads the live address or asks the user to reconnect.

**Guideline** — Wallet state is external and mutable; never cache it without invalidation.

---

## 207. `fix(stellar): validate the network passphrase and not just the network name`

**Problem** — `ensureNetwork` (lines 55–71) compares `getNetwork()`'s display name against `"TESTNET"`/`"PUBLIC"`. Two problems: the mapping misses any other configured network (neither branch applies, so `ensureNetwork` returns without validating), and the name is a label — the value that actually signs the transaction is the passphrase from `getNetworkDetails()`. A wallet whose passphrase does not match `NETWORK_PASSPHRASE` is accepted, and the mismatch only surfaces when the signed envelope is rejected.

**Recommended change**

- Compare the wallet's network passphrase against `NETWORK_PASSPHRASE`.
- Treat an unexpected network value as a rejection instead of a pass.

**Acceptance criteria**

- A wallet on the wrong passphrase is rejected before signing.
- Networks other than testnet/mainnet are either supported explicitly or rejected.

**Guideline** — Validate the value that determines signature validity, not its label.

---

## 208. `fix(stellar): guard hashOrderId against a missing crypto.subtle`

**Problem** — `lib/stellar/scval.ts` implements `hashOrderId` as `await crypto.subtle.digest("SHA-256", data)` (lines 146–148) with no capability check. `crypto.subtle` is only exposed in secure contexts, so on any non-localhost HTTP origin it is `undefined` and the call throws `TypeError: Cannot read properties of undefined`. Both `resolveOrderIdHash` (line 171) and `components/StellarOrderWatch.jsx` (line 28) depend on it, so checkout and order monitoring break entirely on such an origin with an error that names neither the cause nor the fix.

**Recommended change**

- Detect a missing `crypto.subtle` and throw a typed, actionable error, or fall back to a bundled SHA-256 implementation.
- Document the secure-context requirement.

**Acceptance criteria**

- A missing `crypto.subtle` produces a clear error rather than a `TypeError`.
- Checkout either works or explains precisely why it cannot.

**Guideline** — Feature-detect platform APIs before depending on them.

---

## 209. `fix(stellar): verify the decoded payment against the amount that was quoted`

**Problem** — `payWithStellar` returns the numbers it was called with rather than the numbers the chain recorded: `amountUsd`, `tokenAmount` and `amountRaw` all come from the function's own inputs (`lib/stellar/checkout.ts` lines 161–164), while the decoded `receipt` from `decodePaymentEvent` (line 155) is passed through untouched. Nothing compares the receipt with the request, so `receipt.amount`, `receipt.orderId`, `receipt.buyer` and `receipt.token` are never checked against `amountRaw`, the hashed order id, the signer's public key or the selected token. The success UI then reports the requested figure — `Payment confirmed ✓` with `$${Number(result.amountUsd).toFixed(2)}` (`components/StellarCheckoutButton.jsx` line 104) — so a payment that escrowed a different amount, or landed under a different order id, still reads as a complete success. This is distinct from [#513](../../issues/513) and [#514](../../issues/514), which fix how the _indexer_ resolves an order id from event topics; this is the buyer's own flow never checking what it received.

**Recommended change**

- Assert the receipt against the request before reporting success: order id equals the hash of the submitted order id, buyer equals the signing key, token equals the selected contract, and amount equals `amountRaw`.
- Report the escrowed amount from the receipt, not from the inputs.
- Treat a mismatch as a failure that names which field disagreed.

**Acceptance criteria**

- A receipt whose amount, order id, buyer or token differs from the request surfaces as an error, not a success.
- The confirmation displays the amount read from the on-chain event.
- Tests cover a matching receipt and a mismatched one.

**Guideline** — Never confirm a payment from the request; confirm it from the chain.

---

---

## 210. `fix(stellar): account for the contract footprint in the native reserve check`

**Problem** — `MIN_NATIVE_RESERVE` is a hardcoded `BigInt(10000000)` — one whole XLM (`lib/stellar/account.ts` line 19) — and it is the entire headroom `assertPaymentReady` requires for an account that must also keep the base reserve, hold the token trustline entry and pay for the Soroban contract footprint. The check adds it to the payment for native XLM (`lines 249–259`) and requires it alone for other tokens, but the message it produces claims the amount covers "network fees and the contract footprint", which a single XLM does not: the base reserve, the trustline entry and the contract data/code entries the invocation touches all draw on the same balance. An account that passes this check can therefore still fail at submission for insufficient reserve — the exact failure the check exists to prevent — and the message tells the user a number the constant cannot justify.

**Recommended change**

- Derive the requirement from the network's actual base reserve plus the entries the payment touches, or raise the constant to cover them and state what it includes.
- Make the message match the value actually enforced.

**Acceptance criteria**

- A native payment that would drop the account below the reserve required by the operations it performs is rejected before submission.
- The message and the enforced value agree.
- A test pins the threshold for a native payment.

**Guideline** — A hardcoded threshold must match the network rule it stands in for.

---

## 211. `perf(stellar): push the watched event symbols into the RPC topic filter`

**Problem** — The indexer builds its filter as `{ type: "contract", contractIds: [this.contractId] }` (line 190) and then discards unwanted events client-side by checking `watchedSymbols` inside `decodeEvent` (line 217). The RPC returns every event the checkout contract emits, and the contract also emits `create_order`, so every poll transfers and decodes payloads that are immediately thrown away — on the admin page this repeats every 4 seconds (`EVENT_POLL_INTERVAL_MS`, config line 117).

**Recommended change**

- Add a `topics` constraint matching the watched symbols to the `EventFilter`.

**Acceptance criteria**

- The request narrows events at the RPC rather than in the decoder.
- The indexer still receives all four watched symbols.
- A test asserts the filter includes the topic constraint.

**Guideline** — Filter at the source when the API supports it.

---

## 212. `fix(stellar): scan the admin order history from a durable start ledger`

**Problem** — `app/admin/orders/page.tsx` constructs `new PaymentEventIndexer()` with no options (line 175), so the scan window is `latestLedger - EVENT_START_LEDGER_BACKFILL`, i.e. 100 ledgers (config line 119) — roughly eight minutes on testnet. Every page load re-scans only that window and never persists the cursor, so an order paid yesterday is absent from the admin table, and its Ship/Refund buttons are gone even though the escrow is still held on-chain.

**Recommended change**

- Let the admin view scan from a durable point (a configured start ledger, or the ledger recorded when the contract was deployed).
- Persist the cursor so a reload resumes instead of restarting the window.

**Acceptance criteria**

- Orders older than the backfill window remain visible after a reload.
- The scan position survives navigation.

**Guideline** — An operations view must not lose history to a polling heuristic.

---

## 213. `fix(stellar): decode the watched order through the shared event decoder`

**Problem** — `components/StellarOrderWatch.jsx` re-derives the order id positionally with `event.fields.topic4` (line 46) and reads `fields.topic1` as the token (line 86), duplicating the layout knowledge that `eventToOrder` in `lib/stellar/orders.ts` already encodes. The contract's `pay` event topics are `pay, token, buyer, merchant, order_id` (`contracts/checkout/src/events.rs` lines 3–20), so inserting a topic in a future contract revision silently changes what `topic4` means and the watch stops matching without an error.

**Recommended change**

- Resolve the order id through the shared decoder rather than a positional field name.
- Remove the duplicated positional reads.

**Acceptance criteria**

- The watch and `eventToOrder` agree on the order id by construction.
- A test changes the decoded fields and asserts the watch still matches.

**Guideline** — One decoder per event layout.

---

## 214. `fix(stellar): remove the stale-closure suppression in StellarOrderWatch`

**Problem** — The effect in `components/StellarOrderWatch.jsx` disables the exhaustive-deps rule (line 63) while its dependency list is only `[enabled, orderId]` (line 64), even though the indexer callback closes over the `onEvent` prop (lines 45–52). If a parent passes a new `onEvent` after mount, the running indexer keeps calling the first one, so the parent misses the match it is waiting for.

**Recommended change**

- Hold the callback in a ref, or include it in the dependency list, so the running indexer always calls the current prop.
- Remove the suppression comment.

**Acceptance criteria**

- A changed `onEvent` prop is invoked by the running indexer.
- No `eslint-disable` remains in the file.

**Guideline** — Fix the dependency, do not silence the rule.

---

## 215. `fix(stellar): stop logging every payment status to the browser console`

**Problem** — `lib/stellar/checkout.ts` defines `status()` as an unconditional `console.log(\`[stellar] ${s}\`)` (lines 51–53) and calls it for every step of the payment flow. Every buyer's console fills with internal payment state, and the logging cannot be turned off in production.

**Recommended change**

- Remove the logging, or gate it behind an explicit debug flag.

**Acceptance criteria**

- A production payment logs nothing to the console.
- No unconditional `console.log` remains in the payment path.

**Guideline** — Ship no unconditional console output from library code.

---

## 216. `fix(admin): confirm before releasing escrow on dispatch or refund`

**Problem** — The Ship and Refund buttons call their handlers directly on click (`app/admin/orders/page.tsx` lines 130–154 wiring into `onDispatch`/`onRefund`, defined at lines 218–274). Both move real value — `dispatch` releases the escrow to the merchant and `refund` returns it to the buyer — and neither can be undone on-chain. A single misclick on a dense admin table permanently moves funds. The add-product flow already treats a destructive action as confirmation-worthy (see [#564](../../issues/564)), so the asymmetry is a gap, not a style choice.

**Recommended change**

- Require an explicit confirmation naming the order and the amount before submitting either transaction.

**Acceptance criteria**

- No dispatch or refund is submitted without a confirmation.
- The confirmation identifies the order and the amount at stake.
- A test asserts the transaction is not submitted when confirmation is declined.

**Guideline** — Confirm irreversible value transfers.

---

## 217. `fix(admin): refresh the order list without reloading the page`

**Problem** — The Refresh button in `app/admin/orders/page.tsx` is `onClick={() => window.location.reload()}` (lines 379–384). A full reload tears down and re-creates the indexer, discards the in-memory order map, and re-scans only the 100-ledger backfill window — so "refresh" can actually make orders disappear from the table.

**Recommended change**

- Trigger a fresh poll on the existing indexer, or re-run the scan, without a document reload.

**Acceptance criteria**

- Refresh does not reload the document.
- Orders already loaded remain visible after a refresh.

**Guideline** — Refresh should re-fetch data, not restart the page.

---

## 218. `fix(admin): attribute a dispatch or refund failure to the order that failed`

**Problem** — `handleDispatch` and `handleRefund` write failures to one page-level `error` banner (rendered at lines 331–336) while the row that failed is only tracked through `processingOrderId`. With several rows on screen, an operator sees "Failed to dispatch order" with no indication of which order, and the two actions share the same banner and `successMessage` slot, so a failure on one row is overwritten by the next action on another.

**Recommended change**

- Keep errors per order id and render them on the failing row.
- Clear a row's error when its action is retried.

**Acceptance criteria**

- A failed action identifies its order in the UI.
- Failures on separate rows do not overwrite each other.

**Guideline** — Errors belong at the scope of the action that produced them.

---

## 219. `test(stellar): cover the mainnet branches of the token configuration`

**Problem** — `tests/lib/stellar/config.test.ts` exists but the mainnet paths are the least exercised and the most consequential: `IS_MAINNET` selection for the RPC URL (lines 21–24), the passphrase (lines 27–28), the native asset contract (lines 56–61) and `SUPPORTED_TOKENS` construction (lines 79–98). The USDC fallback defect in [#524](../../issues/524) is invisible to the current suite precisely because no test asserts what a mainnet build resolves to.

**Recommended change**

- Add cases that load the module with `NEXT_PUBLIC_STELLAR_NETWORK=mainnet` and assert each resolved value.
- Include the missing-USDC-id case as a regression test for [#524](../../issues/524).

**Acceptance criteria**

- Mainnet and testnet resolutions are both asserted.
- A wrong-network fallback fails the suite.

**Guideline** — Test the configuration branch you deploy, not just the one you develop on.

---

## 220. `test(stellar): cover the indexer retention and cursor-reset paths`

**Problem** — `tests/lib/stellar/indexer.test.ts` covers polling and decoding, but the recovery paths added for transient and retention failures are untested: `recoverFromRetentionError` (lines 204–211) and the `startLedger`/`cursor` handoff in `poll` (lines 157–161). Those paths contain both the silent-skip defect in [#520](../../issues/520) and the permanently-stuck state in [#521](../../issues/521), so the suite currently cannot tell a correct recovery from data loss.

**Recommended change**

- Add tests for a retention error, a transient error on the first poll, and a response sequence without a cursor.
- Assert the scan position in each case.

**Acceptance criteria**

- Each recovery path is exercised with an assertion on the resulting position.
- The suite fails if a transient error moves the window.

**Guideline** — Recovery code deserves the storage-level tests that mutation demands.

### Withdrawn before publishing

The following Batch 11 drafts were written from real defects but were dropped as duplicates of issues published earlier in Batch 4. The slot numbers were reused for the four replacement issues above.

- **201.** `fix(stellar): stop falling back to the testnet USDC contract on mainnet` — the defect is real but already published as [#524](../../issues/524). Not created.
- **202.** `fix(stellar): resolve the USDC issuer from the configured network` — the defect is real but already published as [#524](../../issues/524). Not created.
- **209.** `fix(stellar): only roll the indexer window forward on a real retention error` — the defect is real but already published as [#520](../../issues/520). Not created.
- **210.** `fix(stellar): keep the indexer pollable when a response carries no cursor` — the defect is real but already published as [#521](../../issues/521). Not created.

---

# Batch 12 — App shell, resilience & hardening (issues 221–240)

---

### Complexity

| #   | Issue                                                                          | Complexity |
| --- | ------------------------------------------------------------------------------ | ---------- |
| 221 | `fix(errors): use the shared error helper at the checkout and auth boundaries` | high       |
| 222 | `fix(errors): stop broad substring matching from misclassifying errors`        | medium     |
| 223 | `feat(app): add a route-level error boundary that can reset`                   | medium     |
| 224 | `feat(app): add a global error boundary for root layout failures`              | trivial    |
| 225 | `fix(layout): replace next/head with the App Router metadata API`              | medium     |
| 226 | `fix(layout): remove the duplicate and invalid favicon link tags`              | trivial    |
| 227 | `fix(checkout): stop labelling the escrow notice as testnet on mainnet`        | trivial    |
| 228 | `chore(seo): set metadataBase and canonical URLs`                              | trivial    |
| 229 | `chore(seo): add sitemap.ts and robots.ts`                                     | trivial    |
| 230 | `fix(config): pin the Supabase project host in the image allow-list`           | medium     |
| 231 | `security(headers): add HSTS and Permissions-Policy`                           | medium     |
| 232 | `chore(deps): remove the three unused dependencies`                            | trivial    |
| 233 | `chore(env): correct the stale flags in .env.local.example`                    | trivial    |
| 234 | `fix(shop): call notFound() for a missing product`                             | medium     |
| 235 | `fix(shop): navigate to checkout with the router instead of a full page load`  | trivial    |
| 236 | `fix(profile): wrap the login page in a Suspense boundary for useSearchParams` | medium     |
| 237 | `fix(profile): validate the password before submitting the signup form`        | medium     |
| 238 | `fix(profile): add autocomplete hints to the auth inputs`                      | trivial    |
| 239 | `fix(orders): distinguish a failed fetch from an empty order list`             | medium     |
| 240 | `test(components): cover the Navbar drawer and modal state`                    | medium     |

## 221. `fix(errors): use the shared error helper at the checkout and auth boundaries`

**Problem** — `lib/errors.ts` is 429 lines of classifier and message mapping — `parseError`, `getUserMessage`, `isRecoverable`, `createError`, plus `STELLAR_ERRORS`, `AUTH_ERRORS` and `GENERAL_ERRORS` — and it is imported by **no application file**. A repo-wide search finds it only in `__tests__/errors.test.ts` and `tests/lib/errors.test.ts`. Every user-facing failure therefore shows a raw provider string instead: the checkout surfaces `err.message` directly (`components/StellarCheckoutButton.jsx` lines 73, 82) and the login page passes Supabase's text straight to a toast (`app/profile/login/page.jsx` lines 47, 70, 82). The friendly messages that were written for exactly these cases are dead code.

**Recommended change**

- Route checkout, wallet and auth failures through `parseError`/`getUserMessage` before display.
- Remove any helper that ends up genuinely unused rather than leaving it tested-but-unreachable.

**Acceptance criteria**

- A wallet rejection shows the mapped message, not the raw provider string.
- `lib/errors.ts` is reachable from at least one shipped code path, or unused exports are deleted.

**Guideline** — Tested code that nothing calls is dead code.

---

## 222. `fix(errors): stop broad substring matching from misclassifying errors`

**Problem** — `parseErrorMessage` (lines 335–389) classifies by substring, and several patterns are broad enough to swallow unrelated failures: `includes("balance")` maps anything mentioning a balance to `INSUFFICIENT_BALANCE` (line 366), `includes("rejected")` maps any rejection to `USER_REJECTED` (line 369) even when the wallet rejected the transaction for a network reason, and the `STELLAR_ERRORS` loop matches on both raw keys and `appError.message`, so a message like "Network error" can match the `WRONG_NETWORK` entry. A legitimate failure can therefore be reported to the user as the wrong, unfixable category.

**Recommended change**

- Match on exact error codes first, and keep substring matching only as a last-resort fallback.
- Narrow the fallback patterns so they cannot capture a different category.

**Acceptance criteria**

- A test asserts each error code maps to its own entry.
- A message that is not an insufficient-balance error is not classified as one.

**Guideline** — Classify on identifiers; use loose text matching only when nothing else exists.

---

## 223. `feat(app): add a route-level error boundary that can reset`

**Problem** — The app has `app/loading.jsx` and `app/not-found.jsx` but no `app/error.tsx` and no `app/global-error.jsx`. `components/ErrorBoundary.tsx` exists and is imported by the layout (see [#455](../../issues/455)), but it is a class component with no route-level reset, so a render error in any page leaves the user with a static fallback and no way to retry without a manual reload.

**Recommended change**

- Add `app/error.tsx` as a client component receiving `error` and `reset`, with a retry control.

**Acceptance criteria**

- A thrown error in any route renders the boundary with a working retry.
- Retrying re-renders the segment instead of reloading the document.

**Guideline** — App Router segments expect `error.tsx` for recovery, not just a wrapper component.

---

## 224. `feat(app): add a global error boundary for root layout failures`

**Problem** — There is no `app/global-error.tsx`. A `error.tsx` boundary does not catch failures in the root layout itself, so an exception thrown by the layout's providers leaves an unstyled, unrecoverable blank page, and the layout is exactly where third-party providers are mounted.

**Recommended change**

- Add `app/global-error.tsx` rendering its own `html`/`body`.

**Acceptance criteria**

- A root layout failure renders the global error UI.
- The global boundary does not depend on the layout that failed.

**Guideline** — The root layout needs a boundary outside its own render tree.

---

## 225. `fix(layout): replace next/head with the App Router metadata API`

**Problem** — `app/layout.jsx` imports `next/head` (line 10) and renders a `<Head>` block inside the App Router root layout (lines 51–66). `next/head` is a Pages Router API; in the App Router, head tags are owned by the metadata API, so these tags are not reliably applied and the block duplicates what the exported `metadata` object (lines 29–47) is supposed to control. The two mechanisms disagree about the page title and icons.

**Recommended change**

- Delete the `<Head>` block and `next/head` import.
- Express icons and any remaining head tags through the `metadata` export.

**Acceptance criteria**

- `next/head` is not imported anywhere under `app/`.
- Icons and title render from metadata alone.

**Guideline** — In the App Router, metadata is declared, not rendered.

---

## 226. `fix(layout): remove the duplicate and invalid favicon link tags`

**Problem** — `app/layout.jsx` emits four competing icon declarations: `href={logo}` with `width="300px"` (line 52), `/favicon.ico` with `sizes="any"` (line 53), a `/icon?<generated>` entry (lines 54–59) and an `/apple-icon?<generated>` entry (lines 60–65). `width` is not a valid attribute on `<link rel="icon">`, the `<generated>` values are literal placeholders from a scaffolding template rather than real values, and `logo` is imported from `public/` (line 11) instead of referenced by URL. Browsers pick whichever entry they prefer, so the actual favicon is unpredictable.

**Recommended change**

- Keep one icon declaration per purpose, expressed through metadata.
- Remove the invalid `width` attribute and the `<generated>` literal entries.

**Acceptance criteria**

- One icon entry per purpose remains.
- No literal `<generated>` string exists in the layout.
- No asset is imported from `public/` in application code.

**Guideline** — Icons are metadata, not hand-written link tags.

---

## 227. `fix(checkout): stop labelling the escrow notice as testnet on mainnet`

**Problem** — The checkout escrow notice is a hardcoded literal: `Order #{orderId} · {selectedToken.symbol} (testnet) is escrowed by a Soroban smart ...` (`app/checkout/page.tsx` line 466). A mainnet buyer is told their real funds are held on testnet, which is both wrong and alarming at the exact moment they are asked to trust the flow.

**Recommended change**

- Interpolate the configured `NETWORK` instead of the literal.

**Acceptance criteria**

- A mainnet build does not display "testnet" in the checkout copy.
- No hardcoded network name remains in the checkout.

**Guideline** — Never hardcode an environment name into user-facing copy.

---

## 228. `chore(seo): set metadataBase and canonical URLs`

**Problem** — The `metadata` export in `app/layout.jsx` (lines 29–47) hardcodes the deployment origin in `openGraph.url` and the image URL, with no `metadataBase`. Every other route inherits the root title and description, so all pages share one canonical identity and the Open Graph URL goes stale the moment the deployment host changes.

**Recommended change**

- Set `metadataBase` from an environment variable.
- Use relative Open Graph paths and add per-route titles/descriptions.

**Acceptance criteria**

- Social and canonical URLs derive from `metadataBase`.
- Key routes have distinct titles and descriptions.

**Guideline** — Set `metadataBase` once; express everything else relatively.

---

## 229. `chore(seo): add sitemap.ts and robots.ts`

**Problem** — There is no `app/sitemap.ts` or `app/robots.ts`; the only files under `app/` matching those conventions are `loading.jsx` and `not-found.jsx`. The store's public routes (`/`, `/shop`, `/collections`, `/blog`, product pages) are not advertised to crawlers and there is no robots policy, so indexing depends entirely on external discovery.

**Recommended change**

- Add generated `sitemap.ts` and `robots.ts` covering the public routes.
- Exclude admin, checkout and profile routes from the sitemap.

**Acceptance criteria**

- `/sitemap.xml` and `/robots.txt` resolve.
- Private routes are excluded and disallowed.

**Guideline** — Declare crawl policy explicitly.

---

## 230. `fix(config): pin the Supabase project host in the image allow-list`

**Problem** — `next.config.mjs` allows the image optimizer to fetch from `hostname: "**.supabase.co"` with `pathname: "/storage/v1/object/public/**"` (lines 9–13). The wildcard matches **any** Supabase project, so the deployment becomes an open optimizer for every public Supabase storage object on the internet, consuming the project's image-optimization quota and bandwidth on third-party content. The project's own host is known at build time.

**Recommended change**

- Replace the wildcard with the configured Supabase host, read from the project URL.

**Acceptance criteria**

- Only the project's own storage host is allowed.
- Product images from the configured bucket still optimize.

**Guideline** — Allow-list the exact host, not an entire shared domain.

---

## 231. `security(headers): add HSTS and Permissions-Policy`

**Problem** — The `headers()` block in `next.config.mjs` (lines 30–54) sets only `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection` and `Referrer-Policy`. There is no `Strict-Transport-Security`, so a first visit over plain HTTP can be intercepted before the upgrade, and no `Permissions-Policy`, so camera, microphone, geolocation and payment APIs remain available to any injected script. CSP is tracked separately in #484.

**Recommended change**

- Add `Strict-Transport-Security` with a long `max-age` (and preload once verified).
- Add a `Permissions-Policy` denying the features the store does not use.

**Acceptance criteria**

- Responses carry HSTS and Permissions-Policy headers.
- The store's own flows (wallet, RPC, images) still work.

**Guideline** — Transport security and feature lockdown are baseline hardening, not extras.

---

## 232. `chore(deps): remove the three unused dependencies`

**Problem** — Three runtime dependencies in `package.json` are referenced nowhere in the codebase: `@vercel/og` (line 41), `next-auth` (line 43) and `react-transition-group` (line 48). Each appears only in `package.json` and the lockfile. `next-auth` in particular pulls an authentication stack that this app does not use — auth runs through Supabase — so it inflates the install and the audit surface for no benefit.

**Recommended change**

- Remove all three from `dependencies`.
- Confirm the build, tests and lint still pass without them.

**Acceptance criteria**

- The three packages are gone from `package.json` and the lockfile.
- No import of them remains.
- `npm run build`, `test` and `type-check` pass.

**Guideline** — An unused dependency is untriaged attack surface.

---

## 233. `chore(env): correct the stale flags in .env.local.example`

**Problem** — `.env.local.example` marks `NEXT_PUBLIC_STELLAR_NETWORK` as `[REQUIRED]` (line 9) although `lib/stellar/config.ts` line 15 defaults it to `testnet`. It marks `NEXT_PUBLIC_ADMIN_EMAILS` `[REQUIRED for production]` (lines 59–61), which directly conflicts with removing that variable for security (#474) and with the server-side `admin_users` model. It also lists `NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL` as optional (line 40) while the mail path treats the recipient as security-relevant (#479). An operator following this file configures the wrong things.

**Recommended change**

- Align every `[REQUIRED]` flag with what the code actually enforces.
- Mark the admin-email variable deprecated or remove it alongside #474.
- State the trust assumptions for the recipient variable.

**Acceptance criteria**

- Flags match the code's real requirements.
- No variable contradicts the server-side admin model.

**Guideline** — The example env file is documentation and must not drift from the loader.

---

## 234. `fix(shop): call notFound() for a missing product`

**Problem** — `app/shop/[id]/page.jsx` converts a missing product into a generic error heading: `setError("Product not found")` (line 29) renders as `<h1>Error: {error}</h1>` (lines 60–64). The response status is still 200, so search engines index a dead product URL as a valid page, and the user gets an error message with no way back to the catalogue. A fetch failure and a nonexistent product are also collapsed into the same state, so a transient RPC error and a deleted product look identical.

**Recommended change**

- Call `notFound()` when the product does not exist so the route returns the real 404 page.
- Keep a distinct rendered error for genuine fetch failures.

**Acceptance criteria**

- A nonexistent product id produces the not-found page, not an error heading.
- A fetch failure still renders an error with a retry.
- The two paths are distinguishable in tests.

**Guideline** — Missing resources are 404s, not 200s with an error message.

---

## 235. `fix(shop): navigate to checkout with the router instead of a full page load`

**Problem** — The product page navigates with `window.location.href = "/checkout"` (`app/shop/[id]/page.jsx` line 45). That discards the client-side React tree, re-runs the root layout, providers and fonts, and leaves the app's own prefetching and transition machinery unused — on the most latency-sensitive action in the store.

**Recommended change**

- Use `useRouter().push("/checkout")`, keeping the cart handoff state as it is.

**Acceptance criteria**

- Checkout navigation does not reload the document.
- The cart still reaches the checkout page intact.

**Guideline** — Internal navigation stays inside the router.

---

## 236. `fix(profile): wrap the login page in a Suspense boundary for useSearchParams`

**Problem** — `app/profile/login/page.jsx` calls `useSearchParams()` (line 26) in a client component that is not wrapped in a `Suspense` boundary anywhere in the app. Next.js requires that boundary because the hook opts the route out of static rendering; without it the build warns or errors and the page is forced into client-side rendering with a blank shell until hydration.

**Recommended change**

- Wrap the component that reads search params in `<Suspense>` with a meaningful fallback.

**Acceptance criteria**

- The build reports no `useSearchParams` boundary warning.
- The login page renders a fallback rather than blank content.

**Guideline** — `useSearchParams` requires a Suspense boundary by contract.

---

## 237. `fix(profile): validate the password before submitting the signup form`

**Problem** — `handleSignup` (`app/profile/login/page.jsx` lines 53–72) checks only that the two password fields match and then submits to Supabase, relying on the backend to reject a short password. The user's only feedback is the raw provider message surfaced through the toast, and a rejected attempt is indistinguishable from a network failure. The repo already ships password rules in `lib/validation.ts` that this path never calls.

**Recommended change**

- Validate length and strength with the existing validators before submitting.
- Report the specific rule that failed, and mark the field with `aria-invalid`.

**Acceptance criteria**

- A short password is rejected client-side with a specific message.
- No request is made for an invalid password.
- A test covers the rejection.

**Guideline** — Validate before the round trip and state the rule that failed.

---

## 238. `fix(profile): add autocomplete hints to the auth inputs`

**Problem** — The email and password inputs in `app/profile/login/page.jsx` (lines 118–140 and 161–170) carry no `autoComplete` attributes. Password managers and browsers therefore cannot distinguish the sign-in fields from the sign-up fields on a form that switches between both modes, so credential autofill and password generation behave inconsistently.

**Recommended change**

- Set `autoComplete="email"`, and `current-password` or `new-password` according to the active mode.

**Acceptance criteria**

- Each input declares the correct autocomplete purpose.
- The attribute follows the mode toggle rather than being fixed.

**Guideline** — Autocomplete hints are part of correct form semantics.

---

## 239. `fix(orders): distinguish a failed fetch from an empty order list`

**Problem** — `loadOrders` in `app/orders/page.tsx` catches a failure, logs it, and sets `orders` to an empty array (lines 16–27). The rendered result is the same empty state a buyer with no orders sees, so a Supabase outage or a failed RLS check is presented to the user as "you have no orders" — and the error is only visible in the developer console.

**Recommended change**

- Track an error state and render it distinctly from the empty state.
- Offer a retry that reuses the existing refresh control.

**Acceptance criteria**

- A failed fetch shows an error with a retry, not an empty list.
- A successful fetch with no orders still shows the empty state.

**Guideline** — Absence of data and failure to load data are different states.

---

## 240. `test(components): cover the Navbar drawer and modal state`

**Problem** — `components/Navbar.jsx` is one of the largest components in the repo (10.9 KB) and holds the mobile drawer and modal interaction logic, yet it has no test: no file under `tests/` or `__tests__/` references it. Issues 130–132 all modify this component's interactive behaviour, so every one of those changes currently lands unverified.

**Recommended change**

- Add a test covering open/close of the drawer and any modal state, including keyboard dismissal.

**Acceptance criteria**

- Opening and closing the drawer and modal are asserted.
- Escape/backdrop dismissal is covered where supported.
- The new file follows the naming convention enforced by issue 186.

**Guideline** — Stateful interaction needs a test before it needs a revision.

---

# Batch 13 — Contract semantics, data & coverage (issues 241–250)

> Half batch: 10 issues, completing 250 drafted.

---

### Complexity

| #   | Issue                                                                          | Complexity |
| --- | ------------------------------------------------------------------------------ | ---------- |
| 241 | `fix(contracts): emit events for initialize, set_merchant and token changes`   | medium     |
| 242 | `fix(contracts): return a distinct error when an order id already exists`      | medium     |
| 243 | `test(contracts): cover the merchant handover and its authorization`           | medium     |
| 244 | `chore(supabase): move schema.sql and seed.sql into versioned migrations`      | medium     |
| 245 | `fix(supabase): add the admin read policy the orders comment promises`         | medium     |
| 246 | `test(supabase): add RLS tests for the orders and products policies`           | high       |
| 247 | `docs(contracts): record the deployed testnet contract id and token whitelist` | trivial    |
| 248 | `docs(mainnet): add verification and rollback steps to the deployment guide`   | trivial    |
| 249 | `chore(types): replace the as any casts in the Stellar decoders`               | medium     |
| 250 | `chore(ci): enforce the supported Node range`                                  | trivial    |

## 241. `fix(contracts): emit events for initialize, set_merchant and token changes`

**Problem** — `contracts/checkout/src/events.rs` defines exactly four events: `pay`, `create_order`, `dispatch` and `refund`. The four privileged configuration entry points emit nothing: `initialize` (line 26), `set_merchant` (line 37), `add_token` (line 52) and `remove_token` (line 60). A merchant handover or a token delisting therefore leaves no on-chain trace an indexer can follow, so the frontend's accepted-token registry can diverge from the contract's whitelist with no way to detect it from events.

**Recommended change**

- Emit an event for each privileged mutation, carrying the actor and the new value.
- Document the topics alongside the existing four in the contract README.

**Acceptance criteria**

- Each of the four entry points emits a distinct event.
- Events appear in `getEvents` output and the topic layout is documented.
- A test asserts an event is emitted on each mutation.

**Guideline** — State changes that affect value flow belong in the event log.

---

## 242. `fix(contracts): return a distinct error when an order id already exists`

**Problem** — `create_order` rejects a duplicate order id with `Error::OrderAlreadyPaid` (line 96), the same variant returned by the `pay` path when a payment is attempted twice (line 156). A buyer who submits the same order id twice without ever paying receives "already paid" even though no funds moved, and no client can distinguish an id collision from a genuine duplicate payment using the error code alone.

**Recommended change**

- Add a distinct variant (for example `OrderAlreadyExists`) for the duplicate-id case.
- Keep `OrderAlreadyPaid` for the payment path only.

**Acceptance criteria**

- The duplicate-id path returns the new variant.
- `pay` still returns `OrderAlreadyPaid` for a second payment.
- Tests pin both codes.

**Guideline** — Error codes are ABI; each condition gets its own.

---

## 243. `test(contracts): cover the merchant handover and its authorization`

**Problem** — `set_merchant` (lines 37–43) transfers control of the contract's escrow: after it succeeds, only the new merchant can dispatch or refund. The only existing coverage asserts a successful change ([#495](../../issues/495)). Nothing verifies that the previous merchant loses authority, that a third party cannot call it, or that `merchant()` (lines 45–47) reflects the change — the three properties that make the handover safe.

**Recommended change**

- Add tests for a successful handover, a rejected unauthorized handover, and the loss of the old merchant's authority.

**Acceptance criteria**

- After a handover the old merchant cannot dispatch or refund.
- An unauthorized caller cannot change the merchant.
- `merchant()` returns the new address.

**Guideline** — A privileged transfer is only correct if the old authority is gone.

---

## 244. `chore(supabase): move schema.sql and seed.sql into versioned migrations`

**Problem** — The database lives in two hand-run files, `supabase/schema.sql` and `supabase/seed.sql`, applied manually via the dashboard SQL editor as their headers instruct. There is no `supabase/migrations/` directory and no migration history, so there is no record of what a given environment actually has, no way to apply changes incrementally, and no way to verify that two environments match. The order-dependent `alter table ... enable row level security` statements make partial application especially hazardous.

**Recommended change**

- Convert the schema into ordered, timestamped migrations.
- Keep a seed that can be applied independently and idempotently.

**Acceptance criteria**

- `supabase/migrations/` contains the schema as ordered migrations.
- Applying from empty reproduces the current schema.
- The README documents the migration workflow instead of manual SQL.

**Guideline** — Version the schema the same way you version the code that depends on it.

---

## 245. `fix(supabase): add the admin read policy the orders comment promises`

**Problem** — `supabase/schema.sql` line 150 documents the intent as "Users can view their own orders; admins can view all orders", but the policy it creates grants only `auth.uid() = user_id or auth.email() = user_email` (lines 151–157). No admin branch and no reference to `public.is_admin()` exists on this table, so any screen that reads `orders` as an admin gets only the admin's own rows. The comment and the deployed control disagree.

**Recommended change**

- Add the admin read branch to the policy, or correct the comment if admin reads are deliberately served elsewhere.

**Acceptance criteria**

- An admin can read all orders, or the comment no longer claims it.
- A non-admin still reads only their own orders.
- The choice is documented in `supabase/README.md`.

**Guideline** — A comment describing a control that does not exist is a security defect.

---

## 246. `test(supabase): add RLS tests for the orders and products policies`

**Problem** — The RLS policies are the primary authorization boundary for buyer data, and nothing tests them. The suite covers `lib/` and components only; there is no SQL or pgTAP test anywhere in the repo. This is why the `with check (true)` insert policy ([#473](../../issues/473)), the unpinned `search_path` ([#476](../../issues/476)) and the unstated order-documentation mismatch (issue 245) all shipped without detection.

**Recommended change**

- Add policy tests that exercise the tables as anonymous, buyer and admin roles.
- Cover at minimum: order insert, own-order read, admin read, and product mutation.

**Acceptance criteria**

- Tests run against a database with the migrations applied.
- A regression that widens a policy fails the suite.
- The suite distinguishes the three roles.

**Guideline** — An untested authorization boundary is an assumption, not a control.

---

## 247. `docs(contracts): record the deployed testnet contract id and token whitelist`

**Problem** — `contracts/checkout/README.md` documents the contract but does not record which contract id is deployed, which tokens are whitelisted on it, or which merchant address owns it. Those facts live only in environment variables and on-chain state, so a contributor cannot tell which deployment the frontend is expected to talk to, and a redeploy has no "before" to compare against.

**Recommended change**

- Record the deployed ids per network, the whitelisted tokens, and the merchant address.
- Note the date and the ledger of deployment.

**Acceptance criteria**

- The README lists a contract id and whitelist per network.
- A redeploy has a documented place to update.

**Guideline** — Deployed addresses are configuration of record, not tribal knowledge.

---

## 248. `docs(mainnet): add verification and rollback steps to the deployment guide`

**Problem** — `docs/MAINNET_DEPLOYMENT.md` covers configuration and launch but the checklist has no explicit post-deploy verification and no rollback. Given that issues 201 and [#474](../../issues/474) describe ways a mainnet deployment can silently transact against testnet assets, the verification step is the control that catches exactly those failures, and with no rollback section an operator facing a bad deploy has no documented path.

**Recommended change**

- Add concrete verification commands — contract id, whitelist, RPC, network passphrase, a small end-to-end payment.
- Add a rollback section covering both the frontend and the contract.

**Acceptance criteria**

- Verification is a checklist an operator can execute and paste results from.
- Rollback states what can and cannot be reversed on-chain.

**Guideline** — A deployment guide without verification and rollback is only half the procedure.

---

## 249. `chore(types): replace the as any casts in the Stellar decoders`

**Problem** — The decoder layer asserts away its own types at the boundary where correctness matters most: the event decoder casts the contract id with `contractId as any` (`lib/stellar/events.ts` line 81) and the order reducer does the same for a token address (`lib/stellar/orders.ts` line 166). Because `type-check` does not cover the test tree (#465), these casts are precisely the places where a wrong assumption about an SDK union type survives to runtime as a silent misdecode.

> **Scope note.** The `arr as any` cast in `bytes32ToScVal` (`scval.ts` line 42) was originally listed here too. It is owned by the Batch 5 issue that deals with the unused `toSdkBytes` helper, so this issue no longer covers it — do not fix it twice.

**Recommended change**

- Narrow each value with a proper SDK type guard or the correct overload instead of `as any`.
- Fail explicitly on an unexpected variant.

**Acceptance criteria**

- No `as any` remains in the event decoder or the order reducer.
- Decoding an unexpected variant raises a typed error.
- `type-check` still passes.

**Guideline** — `as any` at a decode boundary is an unverified assumption about untrusted input.

---

## 250. `chore(ci): enforce the supported Node range`

**Problem** — `package.json` declares `engines.node: ">=18.18.0"` (lines 69–71), but nothing enforces it: there is no `.nvmrc`, no `packageManager` field, and the workflows pin no Node version for this check. A contributor on an older runtime therefore gets failures whose cause is the environment rather than their change, and CI and local runs can differ without either side noticing.

**Recommended change**

- Pin the Node version once, in a form CI and local tooling both read.
- Make CI assert the running version against `engines`.

**Acceptance criteria**

- The pinned version satisfies `engines.node`.
- CI fails clearly when the runtime is outside the range.
- The version is documented in `CONTRIBUTING.md`.

**Guideline** — A declared engine range is only useful when something checks it.

---

# Approval checklist

| Batch | Theme                                | Issues  | Publish as                                                                                  |
| ----- | ------------------------------------ | ------- | ------------------------------------------------------------------------------------------- |
| 1     | Restore green `main`                 | 1–20    | ✅ Wave 9 — [#452](../../issues/452)–[#471](../../issues/471)                               |
| 2     | Security & data integrity            | 21–40   | ✅ Wave 10 — [#473](../../issues/473)–[#492](../../issues/492)                              |
| 3     | Soroban contract correctness & tests | 41–60   | ✅ Wave 11 — [#493](../../issues/493)–[#512](../../issues/512)                              |
| 4     | Stellar client correctness           | 61–80   | ✅ Wave 11 — [#513](../../issues/513)–[#532](../../issues/532)                              |
| 5     | Stellar client robustness & tests    | 81–100  | ✅ Wave 12 — [#533](../../issues/533)–[#552](../../issues/552)                              |
| 6     | Data layer & buyer orders            | 101–120 | ✅ Wave 12 — [#553](../../issues/553)–[#572](../../issues/572)                              |
| 7     | React correctness & state            | 121–140 | ✅ Wave 13 — [#573](../../issues/573)–[#592](../../issues/592)                              |
| 8     | Accessibility                        | 141–160 | ✅ Wave 13 — [#593](../../issues/593)–[#612](../../issues/612)                              |
| 9     | Performance & DX                     | 161–180 | ✅ Wave 14 — [#617](../../issues/617)–[#636](../../issues/636)                              |
| 10    | Tests, docs & repo hygiene           | 181–200 | ✅ Wave 14 — [#676](../../issues/676)–[#694](../../issues/694) (19; 197 done in `da302415`) |
| 11    | Mainnet safety & payment correctness | 201–220 | Wave 15                                                                                     |
| 12    | App shell, resilience & hardening    | 221–240 | Wave 16                                                                                     |
| 13    | Contract semantics, data & coverage  | 241–250 | Wave 17                                                                                     |

**250 drafted. 219 published — Wave 9 [#452](../../issues/452)–[#471](../../issues/471), Wave 10 [#473](../../issues/473)–[#492](../../issues/492), Wave 11 [#493](../../issues/493)–[#532](../../issues/532), Wave 12 [#533](../../issues/533)–[#572](../../issues/572), Wave 13 [#573](../../issues/573)–[#612](../../issues/612) (Batches 7 and 8), Wave 14 [#617](../../issues/617)–[#636](../../issues/636) and [#676](../../issues/676)–[#694](../../issues/694) (Batches 9 and 10), Wave 15 [#704](../../issues/704)–[#723](../../issues/723) (Batch 11). 1 completed directly (197, commit `da302415`). 30 awaiting approval across Batches 12–13.**

<!-- END-OF-DRAFTS -->
