"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/AuthContext";
import { BuyerOrder, fetchBuyerOrders } from "../../lib/buyer-orders";
import OrderCard from "../../components/OrderCard";
import { MdShoppingBag, MdRefresh, MdLockOutline } from "react-icons/md";
import { SiStellar } from "react-icons/si";

export default function BuyerOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const userIdentifier = user?.email || user?.uid;
      const data = await fetchBuyerOrders(userIdentifier);
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadOrders();
    }
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

      {/* Guest Notice if unauthenticated */}
      {!authLoading && !user && (
        <div className="mb-6 p-4 rounded-xl bg-purple-50 border border-purple-200 flex flex-wrap items-center justify-between gap-3 text-sm text-purple-900">
          <div className="flex items-center gap-2">
            <MdLockOutline size={20} className="text-purple-600 flex-shrink-0" />
            <span>
              You are viewing guest orders stored on this device. Sign in to view your complete
              multi-device history.
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
      ) : orders.length > 0 ? (
        /* Orders List */
        <div className="space-y-5">
          {orders.map((order) => (
            <OrderCard key={order.orderId || order.id} order={order} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-purple-100 shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-4">
            <MdShoppingBag size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No orders found</h2>
          <p className="text-gray-500 max-w-sm mx-auto text-sm mb-6">
            You haven&apos;t placed any orders yet. Browse our curated footwear collection and pay
            with card or Stellar.
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
