/**
 * Buyer Order Management
 *
 * Provides utilities for storing, querying, and verifying past buyer orders
 * via Supabase and local storage, with on-chain Stellar verification.
 */

import { supabase } from "./supabase";
import { readOrder } from "./stellar/orders";

export interface OrderItem {
  id?: string | number;
  name: string;
  price: number;
  quantity?: number;
  img?: string;
}

export interface BuyerOrder {
  id: string;
  orderId: string;
  userId?: string;
  userEmail?: string;
  createdAt: string;
  total: number;
  status: "Pending" | "Paid" | "Shipped" | "Refunded" | "Completed";
  paymentMethod: "stellar" | "card";
  tokenSymbol?: string;
  tokenAmount?: number;
  txHash?: string;
  ledger?: number;
  items: OrderItem[];
}

const STORAGE_KEY = "mova_buyer_orders";

/**
 * Local storage is untrusted input: a cache entry can be hand-edited, truncated
 * by a partial write, or left behind by an older schema. The orders list renders
 * `total` through `Number.prototype.toFixed`, maps over `items`, and reads
 * `orderId`/`createdAt`/`status` directly, so an entry whose *container* is a
 * well-formed array can still crash the page.
 *
 * These guards validate each entry's shape and drop the ones that fail, rather
 * than trusting the contents because the container is an array.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Optional fields may be omitted, but must not be the wrong type when present. */
function isOptionalString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalFiniteNumber(value: unknown): boolean {
  return value === undefined || value === null || isFiniteNumber(value);
}

/**
 * Validates one entry of an order's `items` array.
 *
 * Returns the original item on success so a valid cache is handed back by
 * reference, untouched.
 */
function validateOrderItem(value: unknown): OrderItem | null {
  if (!isPlainObject(value)) return null;

  // The card renders `item.name?.slice(...)` and `Number(item.price).toFixed(2)`.
  if (typeof value.name !== "string") return null;
  if (!isFiniteNumber(value.price)) return null;

  if (!isOptionalFiniteNumber(value.quantity)) return null;
  if (value.id !== undefined && value.id !== null) {
    if (typeof value.id !== "string" && !isFiniteNumber(value.id)) return null;
  }
  if (!isOptionalString(value.img)) return null;

  return value as unknown as OrderItem;
}

/**
 * Validates one cached order.
 *
 * Returns the original order on success so a valid cache is handed back by
 * reference, untouched.
 */
function validateBuyerOrder(value: unknown): BuyerOrder | null {
  if (!isPlainObject(value)) return null;

  // Rendered identifiers and values: `order.orderId` is shown and copied,
  // `order.total` goes through `.toFixed`, `order.createdAt` through `new Date`.
  if (!isNonEmptyString(value.orderId)) return null;
  if (!isFiniteNumber(value.total)) return null;
  if (typeof value.createdAt !== "string") return null;
  if (typeof value.status !== "string") return null;
  if (typeof value.paymentMethod !== "string") return null;

  // Optional display fields must be the right type when present.
  if (!isOptionalString(value.id)) return null;
  if (!isOptionalString(value.userId)) return null;
  if (!isOptionalString(value.userEmail)) return null;
  if (!isOptionalString(value.tokenSymbol)) return null;
  if (!isOptionalString(value.txHash)) return null;
  // `order.tokenAmount.toFixed(2)` runs whenever `tokenAmount` is truthy.
  if (!isOptionalFiniteNumber(value.tokenAmount)) return null;
  if (!isOptionalFiniteNumber(value.ledger)) return null;

  // `items` is only skipped when absent; a truthy non-array would reach `.map`.
  if (value.items !== undefined && value.items !== null) {
    if (!Array.isArray(value.items)) return null;
    for (const item of value.items) {
      if (validateOrderItem(item) === null) return null;
    }
  }

  return value as unknown as BuyerOrder;
}

/**
 * Raised when an order could not be written to Supabase.
 *
 * ``saveBuyerOrder`` caches locally first, so ``order`` is still usable; the
 * error only signals that the row was **not** persisted. ``supabase-js``
 * reports database failures by resolving with ``{ error }`` (it does not
 * reject), so this is thrown explicitly to surface the failure to the caller.
 */
export class BuyerOrderPersistenceError extends Error {
  readonly order: BuyerOrder;

  constructor(message: string, order: BuyerOrder) {
    super(message);
    this.name = "BuyerOrderPersistenceError";
    this.order = order;
  }
}

/**
 * Write an order into the local cache, replacing any entry with the same
 * `orderId`. The cache is the continuity mechanism: it is written before (and
 * independently of) any server call so the order stays visible on this browser
 * even if persistence fails.
 */
function cacheBuyerOrder(order: BuyerOrder): void {
  try {
    const cached = getCachedBuyerOrders();
    const existingIndex = cached.findIndex((o) => o.orderId === order.orderId);
    if (existingIndex >= 0) {
      cached[existingIndex] = order;
    } else {
      cached.unshift(order);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
    }
  } catch (err) {
    console.warn("Failed to cache order to localStorage:", err);
  }
}

/**
 * Saves an order to Supabase and syncs to local storage cache.
 *
 * The local cache is the continuity mechanism and is written first. The
 * Supabase insert result is inspected: a duplicate id, a constraint violation,
 * or an RLS denial resolves with ``{ error }`` and is surfaced as a
 * :class:`BuyerOrderPersistenceError` rather than being reported as a
 * successful write.
 *
 * @throws {BuyerOrderPersistenceError} when the row was not persisted (the
 *   order is still available on the error as ``error.order`` and in the cache).
 *
 * Note: this writes directly to Supabase from the browser. New order writes
 * should use {@link recordBuyerOrder}, which verifies the on-chain payment
 * server-side before the row is created (issue #491).
 */
export async function saveBuyerOrder(order: BuyerOrder): Promise<BuyerOrder> {
  // 1. Cache to localStorage first so the order survives even if persistence fails.
  cacheBuyerOrder(order);

  // 2. Persist to Supabase, inspecting the resolved result (see the docstring).
  if (!supabase) {
    return order;
  }
  try {
    const { error } = await supabase.from("orders").insert([
      {
        id: order.id,
        order_id: order.orderId,
        user_id: order.userId || null,
        user_email: order.userEmail || null,
        total: order.total,
        status: order.status,
        payment_method: order.paymentMethod,
        token_symbol: order.tokenSymbol || null,
        token_amount: order.tokenAmount || null,
        tx_hash: order.txHash || null,
        items: order.items,
        created_at: order.createdAt,
      },
    ]);
    if (error) {
      console.warn("Could not insert order into Supabase, kept in local cache:", error.message);
      throw new BuyerOrderPersistenceError(error.message, order);
    }
    return order;
  } catch (err) {
    if (err instanceof BuyerOrderPersistenceError) {
      throw err;
    }
    // A thrown error (e.g. offline / network failure) also leaves the order cache-only.
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Could not insert order into Supabase, kept in local cache:", message);
    throw new BuyerOrderPersistenceError(message, order);
  }
}

/**
 * Records a paid order through the server route.
 *
 * Unlike {@link saveBuyerOrder} (which inserts straight into Supabase from the
 * browser), this is the checked write path: `/api/orders` re-verifies the
 * on-chain payment against the checkout contract and only then writes the row
 * with the service-role client. The browser therefore cannot record a "Paid"
 * order for a payment that never happened.
 *
 * The local cache is still written first so the order is visible on this
 * browser even if the server rejects or cannot be reached.
 *
 * @throws {BuyerOrderPersistenceError} when the server rejected or could not
 *   persist the order (the order stays on the error and in the cache).
 */
export async function recordBuyerOrder(order: BuyerOrder): Promise<BuyerOrder> {
  cacheBuyerOrder(order);

  let response: Response;
  try {
    response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Could not reach the orders API, kept in local cache:", message);
    throw new BuyerOrderPersistenceError(message, order);
  }

  if (!response.ok) {
    let message = `Order was not recorded (HTTP ${response.status}).`;
    try {
      const payload = (await response.json()) as { error?: unknown; reason?: unknown };
      if (typeof payload?.error === "string") {
        message =
          typeof payload.reason === "string"
            ? `${payload.error}: ${payload.reason}`
            : payload.error;
      }
    } catch {
      // Keep the HTTP-status message when the body is not JSON.
    }
    console.warn("Orders API rejected the order, kept in local cache:", message);
    throw new BuyerOrderPersistenceError(message, order);
  }

  return order;
}

/**
 * Retrieves all cached orders from localStorage.
 *
 * The payload is treated as untrusted: non-JSON, non-array and malformed
 * entries are dropped so the orders page only ever receives renderable orders.
 */
export function getCachedBuyerOrders(): BuyerOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const orders: BuyerOrder[] = [];
    for (const entry of parsed) {
      const order = validateBuyerOrder(entry);
      if (order !== null) orders.push(order);
    }
    return orders;
  } catch {
    return [];
  }
}

/**
* Removes every cached buyer order from localStorage.
 *
 * Sign-out must not leave a previous buyer's order history behind on a shared
 * browser: `getCachedBuyerOrders()` is a public read used by the orders pages,
 * so the entries have to be dropped rather than only filtered per caller.
 */
export function clearCachedBuyerOrders(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear cached buyer orders:", err);
  }
}

/**
 * Which source the returned orders came from.
 *
 * `server` is the Supabase query; `cache` is localStorage, which is the only
 * source for a guest and the fallback when the query failed.
 */
export type BuyerOrdersSource = "server" | "cache";

export interface BuyerOrdersResult {
  /** The rows the caller should render. */
  orders: BuyerOrder[];
  /** Where those rows came from. */
  source: BuyerOrdersSource;
  /**
   * True only when `orders` is cache content served because the query failed:
   * the list may be incomplete and the cache is not current server state.
   */
  stale: boolean;
  /** The failure reported by the server; set only on a stale result. */
  error: string | null;
}

/** Maps one Supabase `orders` row onto the shape the orders page renders. */
function mapOrderRow(row: any): BuyerOrder {
  return {
    id: row.id || row.order_id,
    orderId: row.order_id || row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    createdAt: row.created_at || new Date().toISOString(),
    total: Number(row.total) || 0,
    status: row.status || "Paid",
    paymentMethod: row.payment_method || "stellar",
    tokenSymbol: row.token_symbol || "USDC",
    tokenAmount: row.token_amount ? Number(row.token_amount) : undefined,
    txHash: row.tx_hash,
    ledger: row.ledger,
    items: Array.isArray(row.items) ? row.items : [],
  };
}

/**
 * Reads the cached orders a caller is allowed to see.
 *
 * The cache is shared by every account that has ever used this browser, so
 * matching is strict: an order is only surfaced when the identifier matches
 * exactly, and a caller without an identifier only ever sees the anonymous
 * (guest) entries.
 */
function readCachedOrders(userEmailOrId?: string): BuyerOrder[] {
  const cached = getCachedBuyerOrders();
  if (userEmailOrId) {
    return cached.filter((o) => o.userEmail === userEmailOrId || o.userId === userEmailOrId);
  }
  return cached.filter((o) => !o.userEmail && !o.userId);
}

/**
 * Fetches past orders for an authenticated user.
 *
 * Three outcomes are distinguished, because they are three different facts:
 * rows returned by the server, a query that failed (cache content, flagged
 * `stale`), and an empty history (not flagged). The cache keeps the page usable
 * in the failure case without being presented as current server state.
 */
export async function fetchBuyerOrders(userEmailOrId?: string): Promise<BuyerOrdersResult> {
  const fromCache = (error: string | null): BuyerOrdersResult => ({
    orders: readCachedOrders(userEmailOrId),
    source: "cache",
    stale: error !== null,
    error,
  });

  // A guest has no identifier to query for and a deployment without Supabase
  // configured has no client to query with: no query was attempted, so nothing
  // that comes back from the cache is stale.
  if (!supabase || !userEmailOrId) return fromCache(null);

  try {
    const isEmail = userEmailOrId.includes("@");
    const query = supabase.from("orders").select("*").order("created_at", { ascending: false });

    const res = isEmail
      ? await query.eq("user_email", userEmailOrId)
      : await query.eq("user_id", userEmailOrId);

    // supabase-js reports a query-level failure (an RLS denial, a column that
    // does not exist, a bad filter) in the resolved value rather than by
    // rejecting, so `res.error` has to be read before `res.data` is trusted.
    // Ignoring it made a failed query indistinguishable from an empty history:
    // the cache was returned as though it were current server state.
    if (res.error) {
      console.warn("Supabase query failed, falling back to cached orders:", res.error.message);
      return fromCache(res.error.message || "Orders query failed");
    }

    const rows = Array.isArray(res.data) ? res.data : [];
    if (rows.length === 0) {
      // The server answered and had no rows, so this is a confirmed empty
      // history; the cache can still fill the gap with an order saved on this
      // browser, and `stale: false` records that the server was reached.
      return fromCache(null);
    }

    return { orders: rows.map(mapOrderRow), source: "server", stale: false, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Orders query failed";
    console.warn("Supabase query threw, falling back to cached orders:", message);
    return fromCache(message);
  }
}

/**
 * Cross-references an order with the Soroban smart contract to verify on-chain status.
 *
 * Verification binds to the claimant: the on-chain buyer must match the
 * caller's address before the order is reported as verified. Without this
 * comparison the function cannot distinguish the wallet's own order from
 * another wallet's.
 */
export async function verifyOrderOnChain(
  orderId: string,
  claimant?: string,
): Promise<{
  verified: boolean;
  onChainStatus?: string;
  buyer?: string;
  amountDisplay?: string;
  tokenSymbol?: string;
}> {
  try {
    const onChain = await readOrder(orderId);
    if (!onChain) {
      return { verified: false };
    }

    // An order whose buyer is not the claimant belongs to someone else and
    // must not be reported as verified for this caller.
    const ownershipMatches =
      claimant === undefined || onChain.buyer === claimant;

    return {
      verified: ownershipMatches && onChain.status !== "Unknown",
      onChainStatus: onChain.status,
      buyer: onChain.buyer,
      amountDisplay: onChain.amountDisplay,
      tokenSymbol: onChain.tokenSymbol,
    };
  } catch {
    return { verified: false };
  }
}
