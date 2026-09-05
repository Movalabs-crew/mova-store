"use client";
import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

// Unique per-cart-line identifier helper. Adding the same product twice creates
// independent rows (each removable on its own with unique React keys).
let lineItemCounter = 0;
export const generateCartItemId = (productId) => {
  lineItemCounter += 1;
  const rand = Math.random().toString(36).slice(2, 9);
  return `${productId ?? "item"}-${Date.now().toString(36)}-${lineItemCounter}-${rand}`;
};

export const ensureCartItemId = (item) => {
  if (!item || typeof item !== "object") return item;
  if (item.cartItemId || item.lineId) return item;
  return {
    ...item,
    cartItemId: generateCartItemId(item.id),
  };
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    let storedCartItems = [];
    let storedItemCount = 0;
    let storedTotalPrice = 0;

    try {
      const rawItems = localStorage.getItem("cartItems");
      if (rawItems) {
        const parsed = JSON.parse(rawItems);
        if (Array.isArray(parsed)) {
          storedCartItems = parsed.map(ensureCartItemId);
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

    setCartItems(storedCartItems);
    setItemCount(storedItemCount);
    setTotalPrice(storedTotalPrice);
  }, []);

  const addToCart = (product) => {
    const lineItem = {
      ...product,
      cartItemId: generateCartItemId(product?.id),
    };

    setCartItems((prevCartItems) => {
      const updatedCartItems = [...prevCartItems, lineItem];
      localStorage.setItem("cartItems", JSON.stringify(updatedCartItems));
      return updatedCartItems;
    });
    setItemCount((prevItemCount) => {
      const newItemCount = prevItemCount + 1;
      localStorage.setItem("itemCount", newItemCount.toString());
      return newItemCount;
    });
    setTotalPrice((prevTotalPrice) => {
      const newTotalPrice = prevTotalPrice + (product?.price || 0);
      localStorage.setItem("totalPrice", newTotalPrice.toString());
      return newTotalPrice;
    });
  };

  const removeFromCart = (product) => {
    setCartItems((prevCartItems) => {
      // Find by unique instance id if present (cartItemId or lineId),
      // otherwise fall back to product id for legacy callers.
      const targetInstanceId =
        product?.cartItemId ||
        product?.lineId ||
        (typeof product === "string" &&
        prevCartItems.some((i) => i.cartItemId === product || i.lineId === product)
          ? product
          : null);

      let index = -1;
      if (targetInstanceId) {
        index = prevCartItems.findIndex(
          (item) => item.cartItemId === targetInstanceId || item.lineId === targetInstanceId
        );
      }

      if (index === -1) {
        const targetProductId =
          product && typeof product === "object" && product.id !== undefined ? product.id : product;
        index = prevCartItems.findIndex((item) => item.id === targetProductId);
      }

      if (index === -1) return prevCartItems;

      const removedItem = prevCartItems[index];
      const updatedCartItems = [...prevCartItems];
      updatedCartItems.splice(index, 1);
      localStorage.setItem("cartItems", JSON.stringify(updatedCartItems));

      setItemCount((prevItemCount) => {
        const newItemCount = Math.max(0, prevItemCount - 1);
        localStorage.setItem("itemCount", newItemCount.toString());
        return newItemCount;
      });

      setTotalPrice((prevTotalPrice) => {
        const newTotalPrice = Math.max(0, prevTotalPrice - (removedItem.price || 0));
        localStorage.setItem("totalPrice", newTotalPrice.toString());
        return newTotalPrice;
      });

      return updatedCartItems;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setItemCount(0);
    setTotalPrice(0);
    localStorage.removeItem("cartItems");
    localStorage.removeItem("itemCount");
    localStorage.removeItem("totalPrice");
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        itemCount,
        totalPrice,
        addToCart,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
