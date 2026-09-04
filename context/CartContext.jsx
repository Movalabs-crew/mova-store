"use client"
import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

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

    setCartItems(storedCartItems);
    setItemCount(storedItemCount);
    setTotalPrice(storedTotalPrice);
  }, []);

  const addToCart = (product) => {
    setCartItems((prevCartItems) => {
      const updatedCartItems = [...prevCartItems, product];
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
      const index = prevCartItems.findIndex((item) => item.id === product.id);
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
