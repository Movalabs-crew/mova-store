"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

// Generates a process-unique id for each cart line so duplicate products
// (same product `id`) can be tracked and removed as independent instances.
let cartItemIdCounter = 0;
const generateCartItemId = () => {
  cartItemIdCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `cart-${Date.now().toString(36)}-${cartItemIdCounter}-${rand}`;
};

// Ensures every cart line carries a unique cartItemId. Items that already
// have one keep it; legacy items (no cartItemId) get a freshly generated one.
const withCartItemId = (item) =>
  item && item.cartItemId ? item : { ...item, cartItemId: generateCartItemId() };

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

    // Assign unique cartItemIds to any legacy items that were persisted
    // without one, keeping previously stored ids intact.
    const normalizedItems = storedCartItems.map(withCartItemId);
    setCartItems(normalizedItems);
    setItemCount(storedItemCount);
    setTotalPrice(storedTotalPrice);
    try {
      localStorage.setItem("cartItems", JSON.stringify(normalizedItems));
    } catch {}
  }, []);

  const addToCart = (product) => {
    // Each add produces an independent cart line with its own cartItemId,
    // even when the same product object is added multiple times.
    const itemToAdd = withCartItemId(product);

    if (!isHydratedRef.current) {
      const stored = readStoredCart();
      const updatedCartItems = [...stored.storedCartItems, itemToAdd];
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
      const merged = isHydratedRef.current
        ? [...prevCartItems, itemToAdd]
        : [...JSON.parse(localStorage.getItem("cartItems") || "[]"), itemToAdd];
      localStorage.setItem("cartItems", JSON.stringify(merged));
      return merged;
    });

    setItemCount((prevItemCount) => {
      const newItemCount = isHydratedRef.current
        ? prevItemCount + 1
        : (JSON.parse(localStorage.getItem("itemCount") || "0") || 0) + 1;
      localStorage.setItem("itemCount", newItemCount.toString());
      return newItemCount;
    });

    setTotalPrice((prevTotalPrice) => {
      const newTotalPrice = isHydratedRef.current
        ? prevTotalPrice + product.price
        : (parseFloat(localStorage.getItem("totalPrice") || "0") || 0) + product.price;
      localStorage.setItem("totalPrice", newTotalPrice.toString());
      return newTotalPrice;
    });
  };

  const removeFromCart = (product) => {
    // Support removing by a bare cartItemId string, an object carrying
    // cartItemId, or an object carrying only id (legacy/duplicate items).
    const key = typeof product === "string" ? product : product?.cartItemId;
    const id = typeof product === "string" ? undefined : product?.id;
    const findIndex = (list) => {
      if (key != null && key !== "") {
        const idx = list.findIndex((item) => item.cartItemId === key);
        if (idx !== -1) return idx;
      }
      return list.findIndex((item) => item.id === id);
    };

    if (!isHydratedRef.current) {
      const stored = readStoredCart();
      const index = findIndex(stored.storedCartItems);
      if (index === -1) return;

      const removedItem = stored.storedCartItems[index];
      const updatedCartItems = [...stored.storedCartItems];
      updatedCartItems.splice(index, 1);
      const newItemCount = Math.max(0, stored.storedItemCount - 1);
      const newTotalPrice = Math.max(0, stored.storedTotalPrice - (removedItem.price || 0));

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

    const index = findIndex(cartItems);
    if (index === -1) return;

    const removedItem = cartItems[index];
    const updatedCartItems = [...cartItems];
    updatedCartItems.splice(index, 1);
    setCartItems(updatedCartItems);
    setItemCount((prevItemCount) => {
      const next = Math.max(0, prevItemCount - 1);
      try {
        localStorage.setItem("itemCount", next.toString());
      } catch {}
      return next;
    });
    setTotalPrice((prevTotalPrice) => {
      const next = Math.max(0, prevTotalPrice - (removedItem?.price || 0));
      try {
        localStorage.setItem("totalPrice", next.toString());
      } catch {}
      return next;
    });
    try {
      localStorage.setItem("cartItems", JSON.stringify(updatedCartItems));
    } catch {}
  };

  const clearCart = () => {
    setCartItems([]);
    setItemCount(0);
    setTotalPrice(0);
    try {
      localStorage.removeItem("cartItems");
      localStorage.removeItem("itemCount");
      localStorage.removeItem("totalPrice");
    } catch {}
  };

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
