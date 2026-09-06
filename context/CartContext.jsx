"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";

const CartContext = createContext();
let cartItemSequence = 0;

const createCartItemId = () => {
  cartItemSequence += 1;
  return `cart-${Date.now()}-${cartItemSequence}`;
};

const ensureCartItemIds = (items) => {
  const seenIds = new Set();

  return items.map((item) => {
    const existingId = item?.cartItemId;
    const cartItemId = existingId && !seenIds.has(existingId) ? existingId : createCartItemId();
    seenIds.add(cartItemId);

    return item?.cartItemId === cartItemId ? item : { ...item, cartItemId };
  });
};

const createCartItem = (product) => ({
  ...product,
  cartItemId: createCartItemId(),
});

const matchesCartItem = (item, target) => {
  if (typeof target === "string") return item?.cartItemId === target;
  if (target?.cartItemId) return item?.cartItemId === target.cartItemId;
  return item?.id === target?.id;
};

export const useCart = () => useContext(CartContext);

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
    const { storedCartItems, storedItemCount, storedTotalPrice } = readStoredCart();
    const normalizedCartItems = ensureCartItemIds(storedCartItems);

    setCartItems(normalizedCartItems);
    setItemCount(storedItemCount);
    setTotalPrice(storedTotalPrice);
    try {
      localStorage.setItem("cartItems", JSON.stringify(normalizedCartItems));
    } catch {}
    setHydrated(true);
  }, []);

  const addToCart = (product) => {
    if (!isHydratedRef.current) {
      const stored = readStoredCart();
      const updatedCartItems = [...ensureCartItemIds(stored.storedCartItems), createCartItem(product)];
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
      const updatedCartItems = [...prevCartItems, createCartItem(product)];
      try {
        localStorage.setItem("cartItems", JSON.stringify(updatedCartItems));
      } catch {}
      return updatedCartItems;
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
  };

  const removeFromCart = (product) => {
    if (!isHydratedRef.current) {
      const stored = readStoredCart();
      const normalizedCartItems = ensureCartItemIds(stored.storedCartItems);
      const index = normalizedCartItems.findIndex((item) => matchesCartItem(item, product));
      if (index === -1) return;

      const removedItem = normalizedCartItems[index];
      const updatedCartItems = [...normalizedCartItems];
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

    setCartItems((prevCartItems) => {
      const index = prevCartItems.findIndex((item) => matchesCartItem(item, product));
      if (index === -1) return prevCartItems;

      const removedItem = prevCartItems[index];
      const updatedCartItems = [...prevCartItems];
      updatedCartItems.splice(index, 1);
      try {
        localStorage.setItem("cartItems", JSON.stringify(updatedCartItems));
      } catch {}

      setItemCount((prevItemCount) => {
        const newItemCount = Math.max(0, prevItemCount - 1);
        try {
          localStorage.setItem("itemCount", newItemCount.toString());
        } catch {}
        return newItemCount;
      });

      setTotalPrice((prevTotalPrice) => {
        const newTotalPrice = Math.max(0, prevTotalPrice - (removedItem.price || 0));
        try {
          localStorage.setItem("totalPrice", newTotalPrice.toString());
        } catch {}
        return newTotalPrice;
      });

      return updatedCartItems;
    });
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
