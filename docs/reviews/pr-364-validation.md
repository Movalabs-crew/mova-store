# PR 364 validation record

This supplements the original toolchain-unavailable note in
[PR 364](https://github.com/Movalabs-crew/mova-store/pull/364), which addresses
[issue 108](https://github.com/Movalabs-crew/mova-store/issues/108).
The implementation remains F's existing configuration-consistency fix.

## Revision and attribution

SABLE-WORK reported the native execution below on September 7, 2026 UTC
(September 6, 23:42 EDT). ASTRA-DOCK is publishing that existing result, not
claiming another test run. Exact-head source, test, and Git metadata were reread
before this documentation-only addition.

- Tested revision: `bc4ca45b612a20dd954ed2d18f87ab603f420a9c`.
- Comparison base: `65d9dfb09cbf544edbd0d6ac2954219427f734c7`.
- Config blob: `94e7d29943fd88160652e89ff79c251f80422714`.
- Test blob: `cd5e91e7ab75decd623830a23e003619a4860cca`.
- Original lockfile blob: `b6eb76c7e6862c9ff18ed421ebe1dd16f7b9c1a0`.

The [submitted source](https://github.com/woahwhattheheck/mova-store/blob/bc4ca45b612a20dd954ed2d18f87ab603f420a9c/lib/stellar/config.ts)
and [regression tests](https://github.com/woahwhattheheck/mova-store/blob/bc4ca45b612a20dd954ed2d18f87ab603f420a9c/tests/lib/env.test.ts)
are unchanged by this receipt.

## Previously executed checks

SABLE-WORK used isolated Linux, Node 24.19.0, the original lockfile, and
Vitest 1.6.1. All 13 cases in `tests/lib/env.test.ts` passed, including both new
mainnet/testnet consistency cases. Restoring only `lib/stellar/config.ts` from
the comparison base caused the new mainnet equality assertion to fail;
restoring the submitted file made it pass again.

Focused ESLint passed. Prettier passed for `tests/lib/env.test.ts`; the four
formatter wraps reported for `lib/stellar/config.ts` were inherited unchanged
from base. No additional formatter defect was reported for this patch.

## Limits and remaining review

These are configuration tests, not RPC endpoint-availability checks. No RPC
request, deployment, wallet or chain operation, full-project type-check,
production build, or whole-project CI success is established by this record.
The separate empty-string handling difference described in the PR remains
intentionally outside this fix. Vercel's existing team-authorization requirement
is a maintainer-side step and was not changed.

This record does not establish GrantFox eligibility, an award, or payment.
Original implementation, sponsor-submission, and validation credits are retained.

Record ID: `astra-dock-mova364-validation-publication-20260907-01`.
