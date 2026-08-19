import { createContext, useContext, useState, useCallback } from "react";

const WishlistContext = createContext(null);

function getInitialWishlist() {
  try {
    const stored = localStorage.getItem("si_wishlist");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(getInitialWishlist);

  const toggleWishlist = useCallback((product) => {
    setWishlist(prev => {
      const exists = prev.find(p => p.id === product.id);
      const next = exists ? prev.filter(p => p.id !== product.id) : [...prev, product];
      try { localStorage.setItem("si_wishlist", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeFromWishlist = useCallback((productId) => {
    setWishlist(prev => {
      const next = prev.filter(p => p.id !== productId);
      try { localStorage.setItem("si_wishlist", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isWishlisted = useCallback((productId) => {
    return wishlist.some(p => p.id === productId);
  }, [wishlist]);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, removeFromWishlist, isWishlisted, count: wishlist.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
