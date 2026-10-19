# Product image cleanup

This note records the implementation submitted in
[PR 377](https://github.com/Movalabs-crew/mova-store/pull/377), using source commit
`9d1c7ab0a869241ccc9e72cbbdb0e1a44a8edc46`.

## Deletion ordering

[`deleteProduct`](../../lib/products.js) first reads the product row's `img`, because
the stored public URL contains the storage object path. It then awaits the
**database-row deletion** and propagates a returned database error or rejected
request. Only after that succeeds does it attempt storage cleanup. A failed or
pending database deletion therefore cannot remove the image.

A failed image lookup does not block the requested row deletion. A missing image
or a URL outside the configured project's public bucket does not trigger storage
removal. Storage failures after row deletion are tolerated as best-effort
cleanup and reported on `console.warn` with the product id, object path, and
underlying message. This is required because `supabase-js` returns storage
failures in the resolved value rather than rejecting, so a `try`/`catch` alone
would discard them silently. The failure is logged, never thrown: the row
deletion the caller requested has already succeeded.
This is not an atomic database/storage transaction or an affected-row-count
guarantee.

## Object-path handling

`storageObjectPathFromPublicUrl` uses the configured `NEXT_PUBLIC_SUPABASE_URL`
and products bucket to match the image URL's origin and public-storage path.
It preserves a custom Supabase base path, ignores query and fragment components,
and decodes the object path. Invalid configuration, relative or unrelated URLs,
empty object paths, and malformed percent-encoding return `null` rather than
attempting cleanup.

The parser does not simply split an arbitrary URL on the public-bucket marker.
Externally hosted product images must not be interpreted as objects in the
configured project's storage.

## Regression coverage in the submitted branch

[`tests/lib/products-delete-order.test.ts`](../../tests/lib/products-delete-order.test.ts)
contains cases for database errors and rejections preserving the image, a pending
deletion delaying cleanup, successful deletion preceding cleanup, tolerated
storage errors, and a rejected lookup allowing row deletion without cleanup.

[`tests/lib/products.test.ts`](../../tests/lib/products.test.ts) covers public-bucket
path parsing, project-origin and custom-base-path behavior, normalization,
malformed or missing inputs, and deletion success/error paths. The product-update
fixture uses a fixed clock and asserts the existing timestamp-bearing payload.

Historical focused execution is recorded in the original support pull request.
That record is tied to its tested source; it is not a new execution of the later
`9d1c7ab0` source. No new test run, full-project CI result, or deployment is
reported by this note.
