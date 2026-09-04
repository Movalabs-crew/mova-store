"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const isHydratedRef = useRef(false);

  const getStoredCartState = () => {
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

  useEffect(() => {
    const { storedCartItems, storedItemCount, storedTotalPrice } = getStoredCartState();

    setCartItems((currentItems) => {
      // If items were added before hydration effect ran, merge with stored items
      if (currentItems.length > 0) {
        const mergedItems = [...storedCartItems, ...currentItems];
        try {
          localStorage.setItem("cartItems", JSON.stringify(mergedItems));
        } catch {}
        return mergedItems;
      }
      return storedCartItems;
    });

    setItemCount((currentCount) => {
      if (currentCount > 0) {
        const mergedCount = storedItemCount + currentCount;
        try {
          localStorage.setItem("itemCount", mergedCount.toString());
        } catch {}
        return mergedCount;
      }
      return storedItemCount;
    });

    setTotalPrice((currentPrice) => {
      if (currentPrice > 0) {
        const mergedPrice = storedTotalPrice + currentPrice;
        try {
          localStorage.setItem("totalPrice", mergedPrice.toString());
        } catch {}
        return mergedPrice;
      }
      return storedTotalPrice;
    });

    isHydratedRef.current = true;
  }, []);

  const addToCart = (product) => {
    setCartItems((prevCartItems) => {
      let baseItems = prevCartItems;
      if (!isHydratedRef.current && prevCartItems.length === 0) {
        const { storedCartItems } = getStoredCartState();
        baseItems = storedCartItems;
      }
      const updatedCartItems = [...baseItems, product];
      try {
        localStorage.setItem("cartItems", JSON.stringify(updatedCartItems));
      } catch {}
      return updatedCartItems;
    });

    setItemCount((prevItemCount) => {
      let baseCount = prevItemCount;
      if (!isHydratedRef.current && prevItemCount === 0) {
        const { storedItemCount } = getStoredCartState();
        baseCount = storedItemCount;
      }
      const newItemCount = baseCount + 1;
      try {
        localStorage.setItem("itemCount", newItemCount.toString());
      } catch {}
      return newItemCount;
    });

    setTotalPrice((prevTotalPrice) => {
      let basePrice = prevTotalPrice;
      if (!isHydratedRef.current && prevTotalPrice === 0) {
        const { storedTotalPrice } = getStoredCartState();
        basePrice = storedTotalPrice;
      }
      const newTotalPrice = basePrice + (product.price || 0);
      try {
        localStorage.setItem("totalPrice", newTotalPrice.toString());
      } catch {}
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
        addToCart,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
