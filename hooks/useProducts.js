"use client";
import { useEffect, useSyncExternalStore } from "react";
import { listProducts } from "../lib/products";
import {
  clearProductCacheError,
  ensureProducts,
  getProductCacheSnapshot,
  subscribeProductCache,
} from "../lib/productCache";

/**
 * Subscribe to the shared product list cache.
 *
 * The list is fetched once per page visit and served from the cache on
 * remounts (e.g. navigating away from and back to /shop); mutations in
 * lib/products invalidate the cache, which makes mounted consumers refetch.
 */
export function useProducts() {
  const snapshot = useSyncExternalStore(
    subscribeProductCache,
    getProductCacheSnapshot,
    getProductCacheSnapshot
  );

  useEffect(() => {
    if (snapshot.status === "idle") {
      ensureProducts(listProducts);
    }
  }, [snapshot, listProducts, ensureProducts]);

  // A failed read is retried when the next consumer mounts instead of
  // looping here, where repeated failures would hammer the network.
  useEffect(() => () => clearProductCacheError(), [clearProductCacheError]);

  return {
    products: snapshot.products ?? [],
    loading: snapshot.products === null && snapshot.status !== "error",
    error: snapshot.error,
  };
}

export default useProducts;
