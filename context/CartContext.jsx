"use client"
import { createContext, useContext, useEffect, useRef, useState } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const readStoredItems = () => {
  try {
    const raw = localStorage.getItem("cartItems");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fall through to empty
  }
  return [];
};

const readStoredCount = () => {
  try {
    const raw = localStorage.getItem("itemCount");
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
  } catch {
    // fall through to zero
  }
  return 0;
};

const readStoredTotal = () => {
  try {
    const raw = localStorage.getItem("totalPrice");
    if (raw) {
      const parsed = parseFloat(raw);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
  } catch {
    // fall through to zero
  }
  return 0;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  // Adds that land before the hydration effect has run. They are queued here
  // and merged with the stored snapshot once hydration completes, so a fast
  // "Add to cart" click after a hard load can no longer clobber the saved cart.
  const pendingAdds = useRef([]);

  useEffect(() => {
    const storedCartItems = readStoredItems();
    const storedItemCount = readStoredCount();
    const storedTotalPrice = readStoredTotal();

    const pending = pendingAdds.current;
    pendingAdds.current = [];

    if (pending.length > 0) {
      const merged = [...storedCartItems, ...pending];
      const mergedCount = storedItemCount + pending.length;
      const mergedTotal =
        storedTotalPrice + pending.reduce((sum, item) => sum + (item.price || 0), 0);

      setCartItems(merged);
      setItemCount(mergedCount);
      setTotalPrice(mergedTotal);
      localStorage.setItem("cartItems", JSON.stringify(merged));
      localStorage.setItem("itemCount", mergedCount.toString());
      localStorage.setItem("totalPrice", mergedTotal.toString());
    } else {
      setCartItems(storedCartItems);
      setItemCount(storedItemCount);
      setTotalPrice(storedTotalPrice);
    }

    setHydrated(true);
  }, []);

  const addToCart = (product) => {
    if (!hydrated) {
      pendingAdds.current.push(product);
      return;
    }

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
    pendingAdds.current = [];
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
        hydrated,
        addToCart,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
