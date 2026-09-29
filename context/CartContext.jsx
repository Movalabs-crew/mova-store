"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

/**
 * Create a stable, unique identifier for a single cart line.
 *
 * `crypto.randomUUID()` is used when available (browsers on a secure context,
 * Node >= 16.7 via webcrypto). The fallback keeps the cart usable in older
 * runtimes without silently falling back to array indexes.
 */
export const createCartItemId = () => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to the deterministic-ish fallback below
  }

  return `cart-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Give every cart line a unique `cartItemId`.
 *
 * Lines already carrying an id are returned untouched so re-hydrating an
 * already-normalised cart does not churn identities (keys must stay stable
 * across re-renders). Legacy lines persisted before line identities existed
 * are upgraded in place.
 */
export const ensureCartItemIds = (items) => {
  if (!Array.isArray(items)) {
    return { items: [], changed: false };
  }

  let changed = false;
  const nextItems = items.map((item) => {
    if (item && typeof item === "object" && item.cartItemId) {
      return item;
    }

    changed = true;
    return { ...(item || {}), cartItemId: createCartItemId() };
  });

  return { items: nextItems, changed };
};

export const readStoredCart = () => {
  let storedCartItems = [];
  let storedItemCount = 0;
  let storedTotalPrice = 0;

  try {
    const rawItems = localStorage.getItem("cartItems");
    if (rawItems) {
      const parsed = JSON.parse(rawItems);
      if (Array.isArray(parsed)) {
        storedCartItems = parsed;
      }
    }
  } catch {
    storedCartItems = [];
  }

  try {
    const rawCount = localStorage.getItem("itemCount");
    if (rawCount) {
      const parsedCount = parseInt(rawCount, 10);
      if (Number.isFinite(parsedCount) && parsedCount >= 0) {
        storedItemCount = parsedCount;
      }
    }
  } catch {
    storedItemCount = 0;
  }

  try {
    const rawPrice = localStorage.getItem("totalPrice");
    if (rawPrice) {
      const parsedPrice = parseFloat(rawPrice);
      if (Number.isFinite(parsedPrice) && parsedPrice >= 0) {
        storedTotalPrice = parsedPrice;
      }
    }
  } catch {
    storedTotalPrice = 0;
  }

  return { storedCartItems, storedItemCount, storedTotalPrice };
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const isHydratedRef = useRef(false);

  useEffect(() => {
    isHydratedRef.current = true;
    setHydrated(true);
    const { storedCartItems, storedItemCount, storedTotalPrice } = readStoredCart();

    // Upgrade legacy rows (persisted before line identities existed) so every
    // line has a unique id, and persist the normalised form once.
    const { items: hydratedCartItems, changed } = ensureCartItemIds(storedCartItems);
    if (changed) {
      try {
        localStorage.setItem("cartItems", JSON.stringify(hydratedCartItems));
      } catch {}
    }

    setCartItems(hydratedCartItems);
    setItemCount(storedItemCount);
    setTotalPrice(storedTotalPrice);
  }, []);

  const addToCart = useCallback((product) => {
    // Each call adds a *new line*, even for a product already in the cart, so
    // the line gets its own identity rather than reusing the product id.
    const cartLine = { ...(product || {}), cartItemId: createCartItemId() };

    if (!isHydratedRef.current) {
      // Pre-hydration: read once, then compute and persist all three keys in a
      // single pass. Splitting this into three independent updaters that each
      // re-read localStorage lets one add see a half-written cart, so the item
      // count and total drift out of step with the items.
      const stored = readStoredCart();
      const updatedCartItems = [...stored.storedCartItems, cartLine];
      const newItemCount = stored.storedItemCount + 1;
      const newTotalPrice = stored.storedTotalPrice + (product?.price || 0);

      try {
        localStorage.setItem("cartItems", JSON.stringify(updatedCartItems));
        localStorage.setItem("itemCount", newItemCount.toString());
        localStorage.setItem("totalPrice", newTotalPrice.toString());
      } catch {}

      setCartItems(updatedCartItems);
      setItemCount(newItemCount);
      setTotalPrice(newTotalPrice);
      return;
    }

    setCartItems((prevCartItems) => {
      const merged = [...prevCartItems, cartLine];
      try {
        localStorage.setItem("cartItems", JSON.stringify(merged));
      } catch {}
      return merged;
    });

    setItemCount((prevItemCount) => {
      const newItemCount = prevItemCount + 1;
      try {
        localStorage.setItem("itemCount", newItemCount.toString());
      } catch {}
      return newItemCount;
    });

    setTotalPrice((prevTotalPrice) => {
      const newTotalPrice = prevTotalPrice + (product?.price || 0);
      try {
        localStorage.setItem("totalPrice", newTotalPrice.toString());
      } catch {}
      return newTotalPrice;
    });
  }, []);

  /**
   * Remove a single cart line.
   *
   * `target` may be the line object itself or a `cartItemId` string. Lines are
   * matched by `cartItemId` when one is supplied so that duplicate products are
   * removed by identity instead of by array position (or by the shared product
   * id, which would always drop the first duplicate).
   */
  const removeFromCart = useCallback(
    (target) => {
      const targetCartItemId = typeof target === "string" ? target : target?.cartItemId || null;
      const targetProductId = typeof target === "object" && target !== null ? target.id : null;

      const matchesLine = (item) => {
        if (!item) return false;
        if (targetCartItemId) {
          return item.cartItemId === targetCartItemId;
        }
        // Legacy callers pass a bare product without a line id: fall back to the
        // product id (first match) exactly as before.
        return item.id === targetProductId;
      };

      const stored = isHydratedRef.current ? null : readStoredCart();
      const source = isHydratedRef.current ? cartItems : stored.storedCartItems;
      const currentItemCount = isHydratedRef.current ? itemCount : stored.storedItemCount;
      const currentTotalPrice = isHydratedRef.current ? totalPrice : stored.storedTotalPrice;

      const index = source.findIndex(matchesLine);
      if (index === -1) return;

      const removedItem = source[index];
      const nextCartItems = [...source];
      nextCartItems.splice(index, 1);

      const removedPrice = removedItem?.price || 0;
      const nextItemCount = Math.max(0, currentItemCount - 1);
      const nextTotalPrice = Math.max(0, currentTotalPrice - removedPrice);

      setCartItems(nextCartItems);
      setItemCount(nextItemCount);
      setTotalPrice(nextTotalPrice);

      try {
        localStorage.setItem("cartItems", JSON.stringify(nextCartItems));
        localStorage.setItem("itemCount", nextItemCount.toString());
        localStorage.setItem("totalPrice", nextTotalPrice.toString());
      } catch {}
    },
    [cartItems, itemCount, totalPrice]
  );

  const clearCart = useCallback(() => {
    setCartItems([]);
    setItemCount(0);
    setTotalPrice(0);
    try {
      localStorage.removeItem("cartItems");
      localStorage.removeItem("itemCount");
      localStorage.removeItem("totalPrice");
    } catch {}
  }, []);

  // One referentially stable value per cart state (Issue #633): without this the
  // inline object literal is recreated on every provider render, so every
  // consumer re-renders even when the cart itself has not changed.
  const contextValue = useMemo(
    () => ({
      cartItems,
      itemCount,
      totalPrice,
      hydrated,
      isHydrated: hydrated,
      addToCart,
      removeFromCart,
      clearCart,
    }),
    [cartItems, itemCount, totalPrice, hydrated, addToCart, removeFromCart, clearCart]
  );

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
};
