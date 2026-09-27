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
 * Saves an order to Supabase and syncs to local storage cache.
 */
export async function saveBuyerOrder(order: BuyerOrder): Promise<BuyerOrder> {
  // 1. Cache to localStorage
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

  // 2. Try persisting to Supabase if table exists
  try {
    if (supabase) {
      await supabase.from("orders").insert([
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
    }
  } catch (err) {
    // Supabase table may not exist yet in dev or offline; local cache ensures continuity
    console.warn("Could not insert order into Supabase, kept in local cache:", err);
  }

  return order;
}

/**
 * Retrieves all cached orders from localStorage.
 */
export function getCachedBuyerOrders(): BuyerOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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

  // Fallback to localStorage cached orders
  if (orders.length === 0) {
    const cached = getCachedBuyerOrders();
    if (userEmailOrId) {
      orders = cached.filter(
        (o) =>
          !o.userEmail || !o.userId || o.userEmail === userEmailOrId || o.userId === userEmailOrId
      );
    } else {
      orders = cached;
    }
  }

  return orders;
}

/**
 * Cross-references an order with the Soroban smart contract to verify on-chain status.
 */
export async function verifyOrderOnChain(orderId: string): Promise<{
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
    return {
      verified: onChain.status !== "Unknown",
      onChainStatus: onChain.status,
      buyer: onChain.buyer,
      amountDisplay: onChain.amountDisplay,
      tokenSymbol: onChain.tokenSymbol,
    };
  } catch {
    return { verified: false };
  }
}
