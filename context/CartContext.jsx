"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";

const CartContext = createContext();

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
    setHydrated(true);
    const { storedCartItems, storedItemCount, storedTotalPrice } = readStoredCart();

    setCartItems(storedCartItems);
    setItemCount(storedItemCount);
    setTotalPrice(storedTotalPrice);
  }, []);

  const addToCart = (product) => {
    if (!isHydratedRef.current) {
      const stored = readStoredCart();
      const updatedCartItems = [...stored.storedCartItems, product];
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
        ? [...prevCartItems, product]
        : [...JSON.parse(localStorage.getItem("cartItems") || "[]"), product];
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
    if (!isHydratedRef.current) {
      const stored = readStoredCart();
      const index = stored.storedCartItems.findIndex((item) => item.id === product?.id);
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

    setCartItems((prevCartItems) => {
      const merged = isHydratedRef.current
        ? [...prevCartItems]
        : [...JSON.parse(localStorage.getItem("cartItems") || "[]")];
      const index = merged.findIndex((item) => item.id === product.id);
      if (index === -1) return merged;

      merged.splice(index, 1);
      localStorage.setItem("cartItems", JSON.stringify(merged));
      return merged;
    });

    setItemCount((prevItemCount) => {
      const newCount = isHydratedRef.current
        ? prevItemCount - 1
        : Math.max(0, (JSON.parse(localStorage.getItem("itemCount") || "0") || 0) - 1);
      localStorage.setItem("itemCount", newCount.toString());
      return newCount;
    });

    setTotalPrice((prevTotalPrice) => {
      const items = isHydratedRef.current
        ? cartItems
        : JSON.parse(localStorage.getItem("cartItems") || "[]");
      const removedItem = items.find((item) => item.id === product.id);
      if (!removedItem) return prevTotalPrice;
      const newPrice = isHydratedRef.current
        ? prevTotalPrice - removedItem.price
        : Math.max(
            0,
            (parseFloat(localStorage.getItem("totalPrice") || "0") || 0) - removedItem.price
          );
      localStorage.setItem("totalPrice", newPrice.toString());
      return newPrice;
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
