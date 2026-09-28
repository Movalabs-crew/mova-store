"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";

const CART_ITEMS_KEY = "cartItems";
const CART_COUNT_KEY = "itemCount";
const CART_TOTAL_KEY = "totalPrice";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

/**
 * Stable per-line identifier for a cart row. Duplicate products must stay
 * independently removable, so every row gets its own id even when the
 * underlying product object (and its `id`) is identical.
 */
let cartItemSeq = 0;
const nextCartItemId = () => `cart-item-${Date.now().toString(36)}-${(cartItemSeq += 1)}`;

const withLineIds = (items) =>
  items.map((item) => (item && item.cartItemId ? item : { ...item, cartItemId: nextCartItemId() }));

/**
 * Reads and parses a localStorage value, returning `fallback` for missing
 * values and for anything that fails to parse. Number keys are validated so a
 * corrupt value cannot poison the derived totals.
 */
const readNumber = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export const readStoredCart = () => {
  let storedCartItems = [];

  try {
    const rawItems = localStorage.getItem(CART_ITEMS_KEY);
    if (rawItems) {
      const parsed = JSON.parse(rawItems);
      if (Array.isArray(parsed)) {
        // Legacy rows persisted before line identities existed are assigned
        // one here; already-identified rows keep the id they were saved with
        // so a remove-after-reload targets the same row.
        storedCartItems = withLineIds(parsed.filter((item) => item && typeof item === "object"));
      }
    }
  } catch {
    storedCartItems = [];
  }

  return {
    storedCartItems,
    storedItemCount: readNumber(CART_COUNT_KEY, storedCartItems.length),
    storedTotalPrice: readNumber(CART_TOTAL_KEY, 0),
  };
};

/**
 * Persists the cart rows and the count/total mirror keys. Count and total are
 * derived from the rows themselves, so storage can never disagree with the
 * cart contents (no negative counts, no phantom totals).
 */
const persistCart = (items) => {
  try {
    localStorage.setItem(CART_ITEMS_KEY, JSON.stringify(items));
    localStorage.setItem(CART_COUNT_KEY, String(items.length));
    const total = items.reduce((sum, item) => sum + (Number(item?.price) || 0), 0);
    localStorage.setItem(CART_TOTAL_KEY, String(total));
  } catch {}
  return items;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const isHydratedRef = useRef(false);
  // Mirror of the authoritative rows. Mutations are computed from this ref and
  // applied synchronously (state updaters can be re-invoked by React, so
  // read-modify-write must not live inside them).
  const itemsRef = useRef([]);

  const commit = (items) => {
    itemsRef.current = items;
    setCartItems(items);
  };

  useEffect(() => {
    isHydratedRef.current = true;
    const { storedCartItems } = readStoredCart();
    // Storage already includes any items added before this effect ran: those
    // adds were persisted synchronously, so this keeps them.
    commit(storedCartItems);
    setHydrated(true);
  }, []);

  const addToCart = (product) => {
    if (!product || typeof product !== "object") return;
    const line = { ...product, cartItemId: nextCartItemId() };
    const current = isHydratedRef.current ? itemsRef.current : readStoredCart().storedCartItems;
    commit(persistCart([...current, line]));
  };

  /**
   * Accepts a product object, a full cart line (with `cartItemId`), or a raw
   * `cartItemId` string. Passing a line removes exactly that row, which is
   * what makes duplicate lines independently removable. Removing something
   * that is not in the cart is a no-op.
   */
  const removeFromCart = (item) => {
    const targetId =
      typeof item === "string"
        ? item
        : typeof item?.cartItemId === "string"
          ? item.cartItemId
          : null;

    const current = isHydratedRef.current ? itemsRef.current : readStoredCart().storedCartItems;
    let index = -1;
    if (targetId) {
      index = current.findIndex((line) => line.cartItemId === targetId);
    } else if (item && typeof item === "object") {
      index = current.findIndex((line) => line.id === item.id);
    }
    if (index === -1) return;

    commit(persistCart(current.slice(0, index).concat(current.slice(index + 1))));
  };

  const clearCart = () => {
    commit([]);
    try {
      localStorage.removeItem(CART_ITEMS_KEY);
      localStorage.removeItem(CART_COUNT_KEY);
      localStorage.removeItem(CART_TOTAL_KEY);
    } catch {}
  };

  // Count and total are always derived from the rows themselves, so they can
  // never fall out of step with the cart contents.
  const itemCount = cartItems.length;
  const totalPrice = cartItems.reduce((sum, item) => sum + (Number(item?.price) || 0), 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        itemCount,
        totalPrice,
        hydrated,
        isHydrated: hydrated,
        addToCart,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
