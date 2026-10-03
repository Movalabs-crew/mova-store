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


  try {
    const rawItems = localStorage.getItem("cartItems");
    if (rawItems) {
      const parsed = JSON.parse(rawItems);
      if (Array.isArray(parsed)) {
        storedCartItems = parsed;
      } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
        storedCartItems = parsed.items;
      }
    }
  } catch {
    storedCartItems = [];
  }

  const storedItemCount = storedCartItems.length;
  const storedTotalPrice = computeTotalPrice(storedCartItems);

  // `totalPrice` is deliberately not read back: it is derived from the items,
  // so any value persisted by an older revision is stale by definition.
  return { storedCartItems, storedItemCount, storedTotalPrice };
};

/**
 * Persist the cart as a single object so the stored total always matches the
 * stored items. `itemCount` is kept as a derived convenience key for existing
 * consumers, but it is recomputed from the items on every write.
 */
const persistCart = (items) => {
  const total = computeTotalPrice(items);
  try {
    localStorage.setItem(
      "cartItems",
      JSON.stringify({ items, total })
    );
    localStorage.setItem("itemCount", String(items.length));
    localStorage.setItem("totalPrice", String(total));
  } catch {}
  return { items, itemCount: items.length, totalPrice: total };
};

export const CartProvider = ({ children }) => {
  // Items and count move together in a single transition, so the count can
  // never drift from the cart it describes.
  const [cart, setCart] = useState({ items: [], count: 0 });
  const [hydrated, setHydrated] = useState(false);
  const isHydratedRef = useRef(false);
  const clearedRef = useRef(false);

  // Derived from the items, not a second source of truth (Issue #619).
  const totalPrice = useMemo(() => computeCartTotal(cart.items), [cart.items]);

  useEffect(() => {
    isHydratedRef.current = true;
    setHydrated(true);


    if (!isHydratedRef.current) {
      // Pre-hydration: read once, then compute and persist the whole cart in a
      // single pass. Splitting this into independent updaters that each re-read
      // localStorage lets one add see a half-written cart, so the item count
      // and total drift out of step with the items.
      const stored = readStoredCart();
      const items = [...stored.storedCartItems, product];
      const count = stored.storedItemCount + 1;

      writeStoredCart(items, count);
      setCart({ items, count });
      return;
    }

    setCart((prev) => ({
      items: [...prev.items, product],
      count: prev.count + 1,
    }));
  }, []);

  /**
   * Remove a single cart line.
   *
   * `target` may be the line object itself or a line id string. Lines are
   * matched by `cartItemId`, or by the legacy `lineId` that the row keys and the
   * duplicate-row tests already treat as a line identity, so duplicate products
   * are removed by identity instead of by array position.
   *
   * Only when the caller supplies no line identity at all does this fall back to
   * the product id, and then only if exactly one line matches: with duplicates
   * the value-based fallback cannot tell the rows apart, so removing the first
   * match would silently delete the wrong line.
   */
  const removeFromCart = useCallback((target) => {
clearedRef.current = false;

    const targetLineId =
      typeof target === "string" ? target : target?.cartItemId || target?.lineId || null;
    const targetProductId =
      typeof target === "object" && target !== null ? target.id : null;

    const matchesLine = (item) => {
      if (!item) return false;
      if (targetLineId) {
        return item.cartItemId === targetLineId || item.lineId === targetLineId;
      }
      // Legacy callers pass a bare product without a line id: fall back to the
      // product id, but only for an unambiguous match (guard below).
      return item.id === targetProductId;
    };

    if (!isHydratedRef.current) {
      const stored = readStoredCart();
      const index = stored.storedCartItems.findIndex(matchesLine);
      if (index === -1) return;

      const items = [...stored.storedCartItems];
      items.splice(index, 1);
      const count = Math.max(0, stored.storedItemCount - 1);

// A value-based fallback (no line identity supplied) is only safe when it
    // identifies a single line; otherwise it would silently remove the first of

    setCart((prev) => {
      const index = prev.items.findIndex(matchesLine);
      if (index === -1) return prev;

      const items = [...prev.items];
      items.splice(index, 1);
      return { items, count: Math.max(0, prev.count - 1) };
    });
  }, []);

  const clearCart = useCallback(() => {
    clearedRef.current = true;
    setCart({ items: [], count: 0 });
    // Remove immediately so a caller that reads storage right after the click
    // never sees a cart that has already been cleared.
    clearStoredCart();
  }, []);

  // One referentially stable value per cart state (Issue #633): without this the
  // inline object literal is recreated on every provider render, so every
  // consumer re-renders even when the cart itself has not changed.
  const contextValue = useMemo(
    () => ({
      cartItems: cart.items,
      itemCount: cart.count,
      totalPrice,
      hydrated,
      isHydrated: hydrated,
      addToCart,
      removeFromCart,
      clearCart,
    }),
    [cart.items, cart.count, totalPrice, hydrated, addToCart, removeFromCart, clearCart]
  );

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
};
  );
};
