"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/AuthContext";
import { BuyerOrder, fetchBuyerOrders } from "../../lib/buyer-orders";
import OrderCard from "../../components/OrderCard";
import { MdShoppingBag, MdRefresh, MdLockOutline, MdErrorOutline } from "react-icons/md";
import { SiStellar } from "react-icons/si";

export default function BuyerOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // A failed read must not be rendered as "you have no orders": keep the failure
  // in its own state so the empty and error states stay distinct.
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userIdentifier = user?.email || user?.uid;
      const result = await fetchBuyerOrders(userIdentifier);
      setOrders(result.orders);
      // A failed query is served from the cache; `error` is set so the page can
      // say the list may be incomplete instead of presenting it as current.
      setLoadError(result.error);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrders([]);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading your orders."
      );
      setLoadError(err instanceof Error ? err.message : "Orders could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadOrders();
    }
  }, [authLoading, loadOrders]);

  // Orders are written by the checkout flow, often moments after this page was
  // last read, and sometimes from another tab. Re-read when the tab becomes
  // visible again and when another tab writes the shared cache (the `storage`
  // event never fires in the tab that performed the write), so a newly paid
  // order appears without a full page reload.
  useEffect(() => {
    if (authLoading) return;

    const refresh = () => {
      void loadOrders();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === "mova_buyer_orders") refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [authLoading, loadOrders]);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-purple-100">
        <div>
          <h1 className="text-3xl font-display font-bold text-mova-ink flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-mova">
              <MdShoppingBag size={22} />
            </span>
            My Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and verify your footwear orders and Stellar smart contract transactions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            aria-label="Refresh orders list"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <MdRefresh size={18} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <Link
            href="/shop"
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            Shop Shoes
          </Link>
        </div>
      </div>

      {/* Stale Cache Notice if the query failed */}
      {!loading && loadError && (
        <div
          role="status"
          className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900"
        >
          We couldn&apos;t load your orders from the server ({loadError}). Showing orders cached on
          this device, which may be incomplete.
        </div>
      )}

      {/* Guest Notice if unauthenticated */}
      {!authLoading && !user && (
        <div className="mb-6 p-4 rounded-xl bg-purple-50 border border-purple-200 flex flex-wrap items-center justify-between gap-3 text-sm text-purple-900">
          <div className="flex items-center gap-2">
            <MdLockOutline size={20} className="text-purple-600 flex-shrink-0" />
            <span>
              You are viewing guest orders stored on this device. Sign in to view your complete multi-device history.
            </span>
          </div>
          <Link
            href="/profile/login"
            className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 text-xs transition-colors"
          >
            Log In
          </Link>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        /* Loading Skeletons */
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-xl border border-purple-100 p-6 shadow-sm animate-pulse space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-40 bg-purple-100 rounded" />
                <div className="h-6 w-20 bg-purple-100 rounded-full" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-12 w-full bg-purple-50 rounded-lg" />
              </div>
              <div className="pt-2 flex justify-between">
                <div className="h-4 w-28 bg-purple-100 rounded" />
                <div className="h-4 w-24 bg-purple-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State — kept distinct from the empty state below so a failed
           read is never presented as "you have no orders". */
        <div
          role="alert"
          data-testid="orders-error"
          className="text-center py-16 px-4 bg-white rounded-2xl border border-rose-200 shadow-sm"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-4">
            <MdErrorOutline size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            We couldn&apos;t load your orders
          </h2>
          <p className="text-gray-500 max-w-sm mx-auto text-sm mb-6">{error}</p>
          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-mova transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <MdRefresh size={18} className={loading ? "animate-spin" : ""} />
            <span>Try again</span>
          </button>
        </div>
      ) : orders.length > 0 ? (
        /* Orders List */
        <div className="space-y-5">
          {orders.map((order) => (
            <OrderCard key={order.orderId || order.id} order={order} />
          ))}
        </div>
      ) : loadError ? (
        /* Failed Load State — the list is unknown, not empty */
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-purple-100 shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
            <MdShoppingBag size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Orders unavailable right now</h2>
          <p className="text-gray-500 max-w-sm mx-auto text-sm mb-6">
            We couldn&apos;t reach the order service, and no orders are cached on this device. This
            is not the same as having no orders — try again in a moment.
          </p>
          <button
            type="button"
            onClick={loadOrders}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-mova transition-transform hover:-translate-y-0.5"
          >
            <MdRefresh size={18} />
            <span>Try again</span>
          </button>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-purple-100 shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-4">
            <MdShoppingBag size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No orders found</h2>
          <p className="text-gray-500 max-w-sm mx-auto text-sm mb-6">
            You haven&apos;t placed any orders yet. Browse our curated footwear collection and pay with card or Stellar.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-mova transition-transform hover:-translate-y-0.5"
          >
            <span>Explore Shop</span>
          </Link>
        </div>
      )}
    </div>
  );
}
