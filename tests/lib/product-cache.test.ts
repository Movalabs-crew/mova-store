import { describe, it, expect, vi } from "vitest";
import {
  clearProductCacheError,
  ensureProducts,
  getProductCacheSnapshot,
  invalidateProductCache,
  resetProductCache,
  subscribeProductCache,
} from "../../lib/productCache";

describe("lib/productCache", () => {
  it("fetches on the first read and serves later reads from the cache", async () => {
    const fetchProducts = vi.fn().mockResolvedValue([{ id: "p1" }]);

    await expect(ensureProducts(fetchProducts)).resolves.toEqual([{ id: "p1" }]);
    expect(fetchProducts).toHaveBeenCalledTimes(1);
    expect(getProductCacheSnapshot()).toMatchObject({
      status: "success",
      products: [{ id: "p1" }],
      error: null,
    });

    await expect(ensureProducts(fetchProducts)).resolves.toEqual([{ id: "p1" }]);
    expect(fetchProducts).toHaveBeenCalledTimes(1);
  });

  it("de-duplicates concurrent reads into a single fetch", async () => {
    let resolve!: (products: { id: string }[]) => void;
    const fetchProducts = vi.fn(() => new Promise<{ id: string }[]>((res) => (resolve = res)));

    const first = ensureProducts(fetchProducts);
    const second = ensureProducts(fetchProducts);

    expect(fetchProducts).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    resolve([{ id: "p1" }]);
    await expect(first).resolves.toEqual([{ id: "p1" }]);
  });

  it("records failures without rejecting and retries only after the error is cleared", async () => {
    const fetchProducts = vi.fn().mockRejectedValue(new Error("Network is down"));

    await expect(ensureProducts(fetchProducts)).resolves.toBeNull();
    expect(getProductCacheSnapshot()).toMatchObject({
      status: "error",
      error: "Network is down",
    });

    await ensureProducts(fetchProducts);
    expect(fetchProducts).toHaveBeenCalledTimes(1);

    clearProductCacheError();
    expect(getProductCacheSnapshot().status).toBe("idle");

    await ensureProducts(fetchProducts);
    expect(fetchProducts).toHaveBeenCalledTimes(2);
  });

  it("records a synchronous throw from the fetcher", async () => {
    const fetchProducts = vi.fn(() => {
      throw new Error("sync failure");
    });

    await expect(ensureProducts(fetchProducts)).resolves.toBeNull();
    expect(getProductCacheSnapshot()).toMatchObject({
      status: "error",
      error: "sync failure",
    });
  });

  it("keeps the previously loaded rows visible while marking the cache for refetch", async () => {
    const fetchProducts = vi
      .fn()
      .mockResolvedValueOnce([{ id: "old" }])
      .mockResolvedValueOnce([{ id: "new" }]);

    await ensureProducts(fetchProducts);
    invalidateProductCache();

    expect(getProductCacheSnapshot()).toMatchObject({
      status: "idle",
      products: [{ id: "old" }],
    });

    await ensureProducts(fetchProducts);
    expect(getProductCacheSnapshot()).toMatchObject({
      status: "success",
      products: [{ id: "new" }],
    });
    expect(fetchProducts).toHaveBeenCalledTimes(2);
  });

  it("discards an in-flight response that started before an invalidation", async () => {
    let resolveStale!: (products: { id: string }[]) => void;
    const fetchProducts = vi
      .fn()
      .mockImplementationOnce(() => new Promise<{ id: string }[]>((res) => (resolveStale = res)))
      .mockResolvedValueOnce([{ id: "fresh" }]);

    const staleRequest = ensureProducts(fetchProducts);
    invalidateProductCache();
    const freshRequest = ensureProducts(fetchProducts);

    expect(fetchProducts).toHaveBeenCalledTimes(2);

    resolveStale([{ id: "stale" }]);
    await expect(staleRequest).resolves.toBeNull();
    await expect(freshRequest).resolves.toEqual([{ id: "fresh" }]);
    expect(getProductCacheSnapshot()).toMatchObject({
      status: "success",
      products: [{ id: "fresh" }],
    });
  });

  it("normalises a non-array response to an empty list", async () => {
    await ensureProducts(vi.fn().mockResolvedValue(undefined));
    expect(getProductCacheSnapshot()).toMatchObject({
      status: "success",
      products: [],
    });
  });

  it("stringifies a rejection that is not an Error", async () => {
    await expect(ensureProducts(vi.fn().mockRejectedValue("plain failure"))).resolves.toBeNull();
    expect(getProductCacheSnapshot()).toMatchObject({
      status: "error",
      error: "plain failure",
    });
  });

  it("discards an in-flight failure that started before an invalidation", async () => {
    let rejectStale!: (error: Error) => void;
    const fetchProducts = vi
      .fn()
      .mockImplementationOnce(() => new Promise<never>((_, reject) => (rejectStale = reject)))
      .mockResolvedValueOnce([{ id: "fresh" }]);

    const staleRequest = ensureProducts(fetchProducts);
    invalidateProductCache();
    const freshRequest = ensureProducts(fetchProducts);

    rejectStale(new Error("stale network error"));
    await expect(staleRequest).resolves.toBeNull();
    await expect(freshRequest).resolves.toEqual([{ id: "fresh" }]);
    expect(getProductCacheSnapshot()).toMatchObject({
      status: "success",
      products: [{ id: "fresh" }],
      error: null,
    });
  });

  it("notifies subscribers once per change and exposes a stable snapshot otherwise", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeProductCache(listener);
    const before = getProductCacheSnapshot();

    expect(getProductCacheSnapshot()).toBe(before);
    invalidateProductCache();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getProductCacheSnapshot()).not.toBe(before);

    unsubscribe();
    invalidateProductCache();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("resetProductCache restores the initial empty state", async () => {
    await ensureProducts(vi.fn().mockResolvedValue([{ id: "p1" }]));
    resetProductCache();

    expect(getProductCacheSnapshot()).toMatchObject({
      status: "idle",
      products: null,
      error: null,
    });
  });
});
