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

/**
 * Derive the cart total from the cart lines.
 *
 * The total is never trusted from storage: it is always recomputed from the
 * items so the two can never diverge (Issue #475).
 */
export const computeTotalPrice = (items) => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const price = Number(item?.price);
    return sum + (Number.isFinite(price) && price > 0 ? price : 0);
  }, 0);
};

/**
 * Read the persisted cart.
 *
 * The cart is stored as a single object under `cartItems` that carries both
 * the lines and the derived total. Legacy installs that persisted the total
 * under a separate `totalPriced key are migrated on read: the total is
 * recomputed from the items so a stale/forged `totalPrice` can never win.
 */
export const readStoredCart = () => {
  let storedCartItems = [];

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
  const [cartItems, setCartItems] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const isHydratedRef = useRef(false);

  useEffect(() => {
    isHydratedRef.current = true;
    setHydrated(true);
    const { storedCartItems } = readStoredCart();

    // Upgrade legacy rows (persisted before line identities existed) so every
    // line has a unique id, and persist the normalised form once.
    const { items: hydratedCartItems } = ensureCartItemIds(storedCartItems);
    const persisted = persistCart(hydratedCartItems);

    setCartItems(persisted.items);
    setItemCount(persisted.itemCount);
    setTotalPrice(persisted.totalPrice);
  }, []);

  const addToCart = useCallback((product) => {
    // Each call adds a *new line*, even for a product already in the cart, so
    // the line gets its own identity rather than reusing the product id.
    const cartLine = { ...(product || {}), cartItemId: createCartItemId() };

    if (!isHydratedRef.current) {
      // Pre-hydration: read once, then compute and persist the whole cart in a
      // single pass. Splitting this into independent updaters that each re-read
      // localStorage lets one add see a half-written cart, so the item count
      // and total drift out of step with the items.
      const stored = readStoredCart();
      const updatedCartItems = [...stored.storedCartItems, cartLine];
      const persisted = persistCart(updatedCartItems);

      setCartItems(persisted.items);
      setItemCount(persisted.itemCount);
      setTotalPrice(persisted.totalPrice);
      return;
    }

    setCartItems((prevCartItems) => {
      const merged = [...prevCartItems, cartLine];
      const persisted = persistCart(merged);
      setItemCount(persisted.itemCount);
      setTotalPrice(persisted.totalPrice);
      return persisted.items;
    });
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

    const source = isHydratedRef.current
      ? cartItems
      : readStoredCart().storedCartItems;

    const index = source.findIndex(matchesLine);
    if (index === -1) return;

    // A value-based fallback (no line identity supplied) is only safe when it
    // identifies a single line; otherwise it would silently remove the first of
    // several identical products.
    if (!targetLineId) {
      const valueMatches = source.filter((item) => item && item.id === targetProductId).length;
      if (valueMatches !== 1) return;
    }

    const removedItem = source[index];
    const nextCartItems = [...source];
    nextCartItems.splice(index, 1);

    const persisted = persistCart(nextCartItems);

    setCartItems(persisted.items);
    setItemCount(persisted.itemCount);
    setTotalPrice(persisted.totalPrice);
  }, [cartItems]);

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

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};
