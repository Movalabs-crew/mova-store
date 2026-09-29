/**
 * Shared, module-level cache for the product list.
 *
 * Reads go through `ensureProducts`, which serves the cached list while it is
 * valid and de-duplicates concurrent fetches. Writes call
 * `invalidateProductCache` so the next read refetches fresh data.
 *
 * The store is deliberately dependency-free (no React, no Supabase) so it can
 * be imported from client hooks, lib mutations and tests alike.
 */

const listeners = new Set();

// Bumped only by invalidation/reset. Readers use it to notice that cached data
// was invalidated while they were mounted; it must not change on ordinary
// fetch transitions or effects keyed on it would refetch after every response.
let version = 0;

// Bumped on every invalidation so responses started before a write can be
// recognised and dropped instead of repopulating the cache with stale rows.
let epoch = 0;

let pending = null;

let state = { status: "idle", products: null, error: null };
let snapshot = { version, ...state };

function publish() {
  snapshot = { version, ...state };
  listeners.forEach((listener) => listener());
}

function toErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function subscribeProductCache(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getProductCacheSnapshot() {
  return snapshot;
}

/**
 * Resolve with the cached product list, fetching it first when there is no
 * usable data. Never rejects: failures land in the snapshot's `error`.
 *
 * Fetches only start from the `idle` state (first read or after
 * `invalidateProductCache`); an `error` state is retried on the next mount
 * rather than in a loop, so a flapping network cannot cause a retry storm.
 */
export function ensureProducts(fetchProducts) {
  if (pending) return pending;
  if (state.status === "success") return Promise.resolve(state.products);
  if (state.status !== "idle") return Promise.resolve(state.products);

  const requestEpoch = epoch;

  let request;
  try {
    request = Promise.resolve(fetchProducts());
  } catch (error) {
    state = { status: "error", products: state.products, error: toErrorMessage(error) };
    publish();
    return Promise.resolve(null);
  }

  state = { status: "loading", products: state.products, error: null };

  const result = request.then(
    (products) => {
      if (requestEpoch !== epoch) return null;
      state = {
        status: "success",
        products: Array.isArray(products) ? products : [],
        error: null,
      };
      publish();
      return state.products;
    },
    (error) => {
      if (requestEpoch !== epoch) return null;
      state = { status: "error", products: state.products, error: toErrorMessage(error) };
      publish();
      return null;
    }
  );

  pending = result;
  result.then(() => {
    if (pending === result) pending = null;
  });
  publish();
  return result;
}

/**
 * Drop the cached list after a mutation. Previously loaded rows are kept for
 * stale-while-revalidate rendering, but the state returns to `idle` so the
 * next read refetches, and any in-flight response started before this point
 * is discarded.
 */
export function invalidateProductCache() {
  epoch += 1;
  version += 1;
  pending = null;
  state = { status: "idle", products: state.products, error: null };
  publish();
}

/**
 * Forget a failed read so the next mount retries it. Called when the last
 * consumer unmounts, which turns "sticky until reload" errors into
 * "retried on the next visit".
 */
export function clearProductCacheError() {
  if (state.status !== "error") return;
  // The status is only "error" once the request has settled, so any pending
  // handle is already resolved; drop it so the retry below cannot join it.
  pending = null;
  state = { status: "idle", products: state.products, error: null };
  publish();
}

/**
 * Restore the store to its initial empty state. Used by tests to keep the
 * module-level cache from leaking between test cases.
 */
export function resetProductCache() {
  epoch += 1;
  version += 1;
  pending = null;
  state = { status: "idle", products: null, error: null };
  publish();
}
