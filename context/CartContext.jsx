"use client"
import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

// Unique per-cart-line identifier. Adding the same product twice must create
// two independent rows (each removable on its own, each with a unique React
// key), so every line item gets a `lineId` that is unique across the cart
// lifetime and stable across localStorage persistence.
let lineIdSequence = 0;
const makeLineId = (productId) => {
  lineIdSequence += 1;
  return `${productId}#${lineIdSequence}-${Date.now().toString(36)}`;
};

// Normalize items restored from localStorage: carts persisted by an older
// version of this context have no `lineId` yet.
const ensureLineId = (item) =>
  item && typeof item === "object" && !item.lineId
    ? { ...item, lineId: makeLineId(item.id) }
    : item;

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

    setCartItems(storedCartItems.map(ensureLineId));
    setItemCount(storedItemCount);
    setTotalPrice(storedTotalPrice);
  }, []);

  const addToCart = (product) => {
    setCartItems((prevCartItems) => {
      const lineItem = ensureLineId(product);
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
      const newTotalPrice = prevTotalPrice + product.price;
      localStorage.setItem("totalPrice", newTotalPrice.toString());
      return newTotalPrice;
    });
  };

  const removeFromCart = (product) => {
    setCartItems((prevCartItems) => {
      // Remove the exact line instance (by lineId) so that, with duplicate
      // products in the cart, only the row whose Remove button was clicked
      // disappears. Fall back to product id matching for legacy callers that
      // pass a bare product object.
      const index =
        product?.lineId != null
          ? prevCartItems.findIndex((item) => item.lineId === product.lineId)
          : prevCartItems.findIndex((item) => item.id === product?.id);
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
