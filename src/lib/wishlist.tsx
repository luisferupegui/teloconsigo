"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type WishlistContext = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
};

const Ctx = createContext<WishlistContext | null>(null);
const KEY = "teloconsigo_wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(ids));
  }, [ids, hydrated]);

  return (
    <Ctx.Provider
      value={{
        ids,
        count: ids.length,
        has: (id) => ids.includes(id),
        toggle: (id) =>
          setIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          ),
        remove: (id) => setIds((prev) => prev.filter((x) => x !== id)),
        clear: () => setIds([]),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
