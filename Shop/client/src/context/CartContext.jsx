import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

const CART_KEY = 'shopindia_cart';

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product, size, quantity = 1) => {
    setItems(prev => {
      const key = `${product.id}-${size}`;
      const existing = prev.find(i => `${i.product_id}-${i.size}` === key);
      if (existing) {
        return prev.map(i =>
          `${i.product_id}-${i.size}` === key
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, {
        product_id: product.id,
        title: product.title,
        price: product.price,
        image: (product.images || [])[0] || '',
        size,
        quantity,
      }];
    });
  }, []);

  const removeItem = useCallback((product_id, size) => {
    setItems(prev => prev.filter(i => !(i.product_id === product_id && i.size === size)));
  }, []);

  const updateQty = useCallback((product_id, size, quantity) => {
    if (quantity < 1) {
      removeItem(product_id, size);
      return;
    }
    setItems(prev =>
      prev.map(i =>
        i.product_id === product_id && i.size === size ? { ...i, quantity } : i
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
