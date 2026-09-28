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
 */
export async function saveBuyerOrder(order: BuyerOrder): Promise<BuyerOrder> {
  // 1. Cache to localStorage first so the order survives even if persistence fails.
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
 * Fetches past orders for an authenticated user.
 */
export async function fetchBuyerOrders(userEmailOrId?: string): Promise<BuyerOrder[]> {
  let orders: BuyerOrder[] = [];

  // Try querying Supabase first
  try {
    if (supabase && userEmailOrId) {
      const isEmail = userEmailOrId.includes("@");
      const query = supabase.from("orders").select("*").order("created_at", { ascending: false });

      const res = isEmail
        ? await query.eq("user_email", userEmailOrId)
        : await query.eq("user_id", userEmailOrId);

      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        orders = res.data.map((row: any) => ({
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
        }));
      }
    }
  } catch (err) {
    console.warn("Supabase query failed, falling back to cached orders:", err);
  }

  // Fallback to localStorage cached orders. The cache is shared by every account
  // that has ever used this browser, so matching is strict: an order is only
  // surfaced when the identifier matches exactly, and a caller without an
  // identifier only ever sees the anonymous (guest) entries.
  if (orders.length === 0) {
    const cached = getCachedBuyerOrders();
    if (userEmailOrId) {
      orders = cached.filter((o) => o.userEmail === userEmailOrId || o.userId === userEmailOrId);
    } else {
      orders = cached.filter((o) => !o.userEmail && !o.userId);
    }
  }

  return orders;
}

/**
 * Cross-references an order with the Soroban smart contract to verify on-chain
 * status **and ownership**.
 *
 * Verification binds to the claimant: `expectedAddress` is the connected
 * wallet's public key. The order is only reported as `verified` when the
 * on-chain buyer equals it, so an order that belongs to another wallet can
 * never be presented as this wallet's. A caller that cannot supply the
 * connected address (empty string) gets `verified: false` rather than a
 * status-only success.
 */
export async function verifyOrderOnChain(
  orderId: string,
  expectedAddress: string
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


      onChainStatus: onChain.status,
      buyer: onChain.buyer,
      amountDisplay: onChain.amountDisplay,
      tokenSymbol: onChain.tokenSymbol,
    };
  } catch {
    return { verified: false };
  }
}
