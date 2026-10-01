import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type CartLine = { id: string; vendorId: string; name: string; price: number; qty: number };

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  vendorId: string | null;
  qtyOf: (id: string) => number;
  add: (line: Omit<CartLine, 'qty'>) => void;
  decrement: (id: string) => void;
  clear: () => void;
  replace: (lines: CartLine[]) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => n + l.qty * l.price, 0);
    return {
      lines,
      count,
      subtotal,
      vendorId: lines[0]?.vendorId ?? null,
      qtyOf: (id) => lines.find((l) => l.id === id)?.qty ?? 0,
      add: (line) =>
        setLines((prev) => {
          // One order = one restaurant: adding from a different vendor starts a fresh cart.
          const base = prev.length && prev[0].vendorId !== line.vendorId ? [] : prev;
          const existing = base.find((l) => l.id === line.id);
          return existing
            ? base.map((l) => (l.id === line.id ? { ...l, qty: l.qty + 1 } : l))
            : [...base, { ...line, qty: 1 }];
        }),
      decrement: (id) =>
        setLines((prev) =>
          prev.flatMap((l) => (l.id !== id ? [l] : l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : [])),
        ),
      clear: () => setLines([]),
      replace: setLines,
    };
  }, [lines]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
