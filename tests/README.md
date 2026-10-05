# Test layout and naming

Vitest discovers every `*.{test,spec}.{js,jsx,ts,tsx}` file in the repository
(see `vitest.config.ts`). This directory holds the suite for the Next.js app.

## Naming conventions

- Name a test file after the module it exercises:
  - Components use the component's PascalCase name, for example
    `ContactUs.test.tsx` for `components/ContactUs`.
  - Library and hook modules use their file name, for example `env.test.ts` for
    `lib/env.ts`.
- Prefer `.test.tsx` / `.test.ts` for new files. The existing `.test.jsx` files
  are kept for compatibility; rename them when you are already editing them.
- Never add a second file whose path differs from an existing tracked path only
  by case. Linux checks both entries out as two files and runs the suite twice,
  while macOS collapses them into one, so edits silently land on "the other"
  file. `npm run check:case` fails the build for such a pair.

## Locations

- `tests/components/` — component tests
- `tests/context/` — React context tests
- `tests/hooks/` — hook tests
- `tests/lib/` — library and utility tests
- `tests/app/` — route-level tests, mirroring the `app/` tree

## Running

```bash
npm run test           # vitest run (single pass)
npm run test:watch     # watch mode
npm run test:coverage  # coverage report
```
