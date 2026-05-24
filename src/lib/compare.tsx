"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type CompareContext = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  MAX: number;
};

const Ctx = createContext<CompareContext | null>(null);
const KEY = "teloconsigo_compare";
const MAX = 4;

export function CompareProvider({ children }: { children: ReactNode }) {
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
        MAX,
        has: (id) => ids.includes(id),
        toggle: (id) =>
          setIds((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length >= MAX) return prev;
            return [...prev, id];
          }),
        remove: (id) => setIds((prev) => prev.filter((x) => x !== id)),
        clear: () => setIds([]),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompare must be used inside CompareProvider");
  return ctx;
}
