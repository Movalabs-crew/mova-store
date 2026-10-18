# Contributing to Mova Store

First off — thank you for considering a contribution. Mova Store is an
open-source, reference-architecture storefront on the Stellar network, and the
project lives or dies by community contributions like yours.

This project is **actively tracked for milestones and bounties on the GrantFox
platform**. That means your work can be scoped, reviewed, and rewarded through
GrantFox's native issue and milestone tracking — not just merged silently.

Please take a minute to read this guide. It keeps contributions fast to review,
easy to test, and consistent across the frontend and the Rust contract.

---

## Table of Contents

- [Quickstart](#quickstart)
- [How Milestones & Issues Work on GrantFox](#how-milestones--issues-work-on-grantfox)
- [Campaign Waves](#campaign-waves)
- [The 5-Step Contribution Pipeline](#the-5-step-contribution-pipeline)
- [Code Formatting](#code-formatting)
- [Testing Guidelines](#testing-guidelines)
- [Dependency Management](#dependency-management)
- [Commit Message Style](#commit-message-style)
- [Pull Request Checklist](#pull-request-checklist)
- [Code of Conduct](#code-of-conduct)

---

## Quickstart

Prerequisites: Node 18.18+ (Node 20 is recommended; see `.nvmrc`) and npm. The
Rust toolchain is only needed if you change `contracts/checkout`.

```bash
git clone https://github.com/Movalabs-crew/mova-store.git
cd mova-store
npm install

# Copy the environment template and fill in the required keys.
cp .env.local.example .env.local

npm run dev          # storefront on http://localhost:3000
```

`npm run dev` starts the Next.js storefront. Until you deploy the checkout
contract and set `NEXT_PUBLIC_CHECKOUT_CONTRACT_ID`, the on-chain checkout stays
disabled; the catalog, cart and contact form still work. The full variable list
lives in the [README](README.md#environment-variables-reference).

Run the checks a pull request is expected to pass before you push:

```bash
npm run lint         # ESLint (next lint)
npm run type-check   # tsc --noEmit
npm run test         # Vitest, single pass
npm run build        # production build
```

If your change touches the Rust contract, also run:

```bash
cd contracts/checkout && cargo test
```

---

## How Milestones & Issues Work on GrantFox

We track the roadmap, open issues, and funded bounties natively on the GrantFox
platform:

- **Issues** — scoped, actionable work items (bugs, improvements, new features).
- **Milestones / Bounties** — funded deliverables tied to one or more issues,
  with defined acceptance criteria and reward amounts.
- **Proposals** — larger architectural ideas. Post one in the discussions if you
  want to shape the roadmap before writing code.

A common misconception: bounty work is not "first to merge wins." It is
**reviewed on quality**, so a well-tested, well-documented PR that satisfies the
acceptance criteria wins over a faster, sloppier one.

## Campaign Waves

Some contribution campaigns are organized into numbered **waves**. A wave is a
time-boxed group of issues that share a campaign label; the label identifies the
issues included in that campaign and makes the current worklist easy to find.

### Active campaign labels

| Label | What it means |
| ----- | ------------- |
| `Stellar Wave` | An issue in the active Stellar Wave campaign. |

To see the current Stellar Wave worklist, open the
[open issues labeled `Stellar Wave`](https://github.com/Movalabs-crew/mova-store/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22Stellar%20Wave%22).
When a later wave begins, its campaign label and worklist will be documented in
this table.

Only issues carrying the label for the campaign you are joining are part of
that campaign. An issue with no campaign label, or one labeled for another
wave, is not eligible for the current wave even if it is otherwise open. Check
the issue's labels before applying for a related bounty or starting work.

## The 5-Step Contribution Pipeline

### Step 1 — Find an open issue in the repository

Browse the open issues on GitHub (and cross-referenced GrantFox milestones).
Good first issues are usually labeled `good first issue`. If an issue is already
assigned, respect the assignee — ask before picking it up.

### Step 2 — Apply for the corresponding bounty / milestone on GrantFox

If the issue belongs to a funded milestone or bounty, **apply for it on
GrantFox first**. Applying signals intent, links your identity to the work, and
unlocks reward tracking. Don't start the implementation before your application
is acknowledged for funded work.

### Step 3 — Create a feature branch

Branch from the latest `main`. Use a short, descriptive name that matches the
work:

```bash
git checkout main
git pull origin main
git checkout -b feat/payment-retry          # a new feature
# or
git checkout -b fix/order-already-paid-race  # a bug fix
# or
git checkout -b docs/stellar-contract-readme # documentation
```

Branch naming conventions:

| Prefix      | Use for                              | Example                        |
| ----------- | ------------------------------------ | ------------------------------ |
| `feat/`     | New features                         | `feat/payment-retry`           |
| `fix/`      | Bug fixes                            | `fix/wrong-total-on-mobile`    |
| `docs/`     | Documentation only                   | `docs/soroban-deploy-guide`    |
| `refactor/` | Code changes with no behavior change | `refactor/stellar-lib-modules` |
| `test/`     | Adding or updating tests             | `test/pay-dup-order-cases`     |

### Step 4 — Write clean code with testing

- Follow the style and structure of the surrounding code.
- Add tests that cover the behavior you changed — see
  [Testing Guidelines](#testing-guidelines).
- Run the local checks below before committing. If they pass, commit.
- Never commit secrets, `.env` files, or `node_modules`.

### Step 5 — Open a Pull Request (PR) for review

```bash
git push -u origin feat/payment-retry
```

Then open a PR against `main`:

- **Title:** a short summary using a Conventional Commit prefix, e.g.
  `feat: add payment success alert`.
- **Description:** link the issue/bounty, summarize the change, list how it was
  tested, and note any acceptance criteria you satisfied.
- Reference the GrantFox milestone/bounty id in the description so reviewers can
  tie the PR back to the funded work.

Once reviewers approve, maintainers merge. For funded milestones, completion is
confirmed against the acceptance criteria on GrantFox.

---

## Code Formatting

Formatting is enforced to keep review diffs clean. Both frontend and contract
code must be formatted before pushing.

### JavaScript / TypeScript (frontend)

- **Prettier** via the repo script: `npm run format` (verify with `npm run format:check`).
- **ESLint** via the Next.js lint script for correctness:

```bash
npm run lint
```

- TypeScript must typecheck with zero errors:

```bash
npx tsc --noEmit
```

### Git hooks (installed automatically)

The root `prepare` script installs a `pre-commit` hook, so the formatting and
lint checks above run on exactly the files you are committing:

```bash
npm install          # installs the hook via `prepare`
git commit -m "..."  # formats and lints the staged files first
```

`scripts/pre-commit-checks.mjs` runs Prettier and ESLint (`--fix`) over the
staged files, re-stages anything it rewrites, and aborts the commit when ESLint
still reports errors. The hook is not committed: it lives in
`.git/hooks/pre-commit`, and `scripts/setup-git-hooks.mjs` (re)installs it on
every `npm install` from the root `prepare` script. Both scripts are no-ops
outside a git checkout (CI, tarballs). Use `git commit --no-verify` to bypass
the hook for a single commit.

### Rust (contract)

- **rustfmt** for formatting:

```bash
cd contracts/checkout && cargo fmt -- --check
```

- **clippy** for lints:

```bash
cd contracts/checkout && cargo clippy --all-targets -- -D warnings
```

> `-- -D warnings` promotes every warning to an error — fix or justify each one.

## Testing Guidelines

### Smart Contract Tests (Rust)

**The contract must be tested.** The Rust contract ships with a mock-token test
suite in `contracts/checkout/src/test.rs`. Run it before every PR that touches
`contracts/`:

```bash
cd contracts/checkout && cargo test
```

- Add a test for every new contract function and every new error path.
- When behavior changes, update existing tests — don't delete coverage.
- Tests run offline against a mock token; no network or funded account needed.

### Frontend Tests (TypeScript/JavaScript)

**The frontend uses Vitest** for unit and integration tests. Run tests before every PR:

```bash
# Run all tests once
npm run test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with interactive UI
npm run test:ui
```

**Test file locations:**
- Unit tests: `tests/lib/` for library functions (for example `tests/lib/env.test.ts` and `tests/lib/validation.test.ts`)
- Shared Vitest setup: `tests/setup.ts`
- Tests must be named `<kebab-case-stem>.test.ts` or `<kebab-case-stem>.test.tsx`,
  where the stem is the kebab-case name of the module under test. Dotted
  qualifiers are allowed for a second concern in the same module, for example
  `tests/context/cart-context.hydration.test.tsx`.
- `.js` / `.jsx` test files are not allowed, and two test files in the same
  directory may not share a stem (case-insensitively) — that is the case-only
  collision that caused the mix-ups this convention replaces.
- The rule is enforced in CI and locally with `npm run test:naming`.
- Put new component tests under `tests/` only when you add them; do not assume a `tests/components/` directory exists yet

**What to test:**

- Utility functions (validation, formatting, etc.)
- Custom hooks
- Component behavior (user interactions, state changes)
- Error handling paths

**Example test:**

```typescript
import { describe, it, expect } from "vitest";
import { validateEmail } from "../../lib/validation";

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("test@example.com").isValid).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(validateEmail("not-an-email").isValid).toBe(false);
  });
});
```

### Type Safety and Build

```bash
npm run type-check   # TypeScript type checking
npm run lint         # ESLint checks
npm run build        # Production build must succeed
```

### Local verification (`npm run verify`)

`npm run verify` runs the same checks as CI, in the same order, so a
contributor can reproduce a green (or red) build locally before pushing:

```bash
npm run verify
```

It expands to:

1. `npm run lint` — ESLint
2. `npm run type-check` — `tsc --noEmit`
3. `npm run test` — Vitest, single run
4. `npm run test:coverage` — Vitest with the coverage thresholds
5. `npm run build` — production Next.js build
6. `npm run format:check` — Prettier drift report

The build step reads the `NEXT_PUBLIC_*` variables, so copy
`.env.local.example` to `.env.local` (or export the values) before running
`verify`; CI injects throwaway values into `npm run build` for the same reason.
Formatting is checked last on purpose, exactly as in CI, so repo-wide style
drift cannot hide a failing type check, test, or build.

### Manual QA for Payment Changes

If your PR touches the Stellar payment flow, describe in the PR how you tested
it against testnet (Freighter + USDC faucet account). Follow the flow in the
root [README](README.md#paying-with-stellar-testnet).

## Dependency Management

Some packages are tightly coupled and must be bumped together:

- **`next` and `eslint-config-next`** are pinned to the same version.
  `eslint-config-next` depends on `@next/eslint-plugin-next` at that exact
  version, so bumping `next` without `eslint-config-next` (or vice versa)
  silently desynchronises the lint rules from the framework version.
- **`@next/*` packages** track the `next` version.

Bump them as one unit:

- Dependabot (`.github/dependabot.yml`) is configured to open a single grouped
  PR for `next`, `eslint-config-next`, `@next/*` and `eslint-plugin-next`.
  Merge that group as one change.
- For a manual bump, set **both** entries in `package.json` to the same
  version, run `npm install` so `package-lock.json` is regenerated, and commit
  all three files together.

CI fails when the two `package.json` entries drift, so a half-finished bump
cannot land unnoticed.

## Commit Message Style

Use **Conventional Commits**. This keeps the changelog readable and lets
tooling detect releases automatically.

```
<type>(<optional scope>): <short summary>
```

| Type       | Meaning                             |
| ---------- | ----------------------------------- |
| `feat`     | A new user-facing feature           |
| `fix`      | A bug fix                           |
| `docs`     | Documentation only                  |
| `refactor` | Code change with no behavior change |
| `test`     | Adding or updating tests            |
| `chore`    | Build tooling, deps, config         |

Examples:

```bash
feat: add payment success alert
fix(checkout): reject duplicate order ids before transfer
docs: add soroban contract deployment guide
test: cover invalid-amount rejection in pay
chore: bump @stellar/stellar-sdk to 16.2.0
```

Rules:

- Imperative mood, lowercase after the type, no trailing period.
- Summary under ~72 characters. Add a body explaining _why_ when it's not
  obvious.
- One logical change per commit. Prefer several focused commits over one large
  one.

## Pull Request Checklist

Before opening a PR, verify:

- [ ] Linked to the GitHub issue and GrantFox milestone/bounty id.
- [ ] Branch name follows the naming convention.
- [ ] Code formatted (`npm run format` / `cargo fmt`).
- [ ] Lints pass (`npm run lint`, `cargo clippy -- -D warnings`).
- [ ] Typecheck passes (`npm run type-check`).
- [ ] Frontend tests pass (`npm run test`).
- [ ] Contract tests pass (`cd contracts/checkout && cargo test`).
- [ ] Build succeeds (`npm run build`).
- [ ] Combined local check passes (`npm run verify`)
- [ ] New behavior has tests; existing tests updated where needed.
- [ ] No secrets, `.env` files, or build artifacts in the diff.
- [ ] README/docs updated if behavior or config changed.

## Code of Conduct

We are committed to providing a welcoming, collaborative environment for
everyone — regardless of experience, background, or identity.

**Our expectations:**

- **Be respectful.** Disagreement on code is normal; keep it about the code.
- **Be constructive.** In reviews, explain _why_; in replies, be open to
  alternatives.
- **Be patient.** Maintainers and contributors volunteer their time; reviews may
  take a few days.
- **Give credit.** Acknowledge prior art and the work of others.

**Unacceptable behavior** includes harassment, personal attacks, trolling,
doxxing, and any form of discrimination. Maintainers may remove comments, close
PRs, or ban individuals who violate these standards.

**Reporting:** contact the maintainers via a GitHub issue (labeled
`report`/private) or through GrantFox. All reports are taken seriously and
reviewed confidentially.

---

_Happy building — and see you on GrantFox._
