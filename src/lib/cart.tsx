"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Product } from "@/lib/products-types";

export type CartItem = {
  id: string;
  slug: string;
  nombre: string;
  marca: string;
  precio: number;
  imagen: string;
  cantidad: number;
};

type CartContext = {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (p: Product, cantidad?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, cantidad: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartContext | null>(null);

const STORAGE_KEY = "teloconsigo_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Cargar del localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const addItem = (p: Product, cantidad = 1) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === p.id);
      if (exists) {
        return prev.map((i) =>
          i.id === p.id ? { ...i, cantidad: i.cantidad + cantidad } : i,
        );
      }
      return [
        ...prev,
        {
          id: p.id,
          slug: p.slug,
          nombre: p.nombre,
          marca: p.marca,
          precio: p.precio,
          imagen: p.imagen,
          cantidad,
        },
      ];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, cantidad: number) => {
    if (cantidad <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, cantidad } : i)),
    );
  };

  const clear = () => setItems([]);

  const count = items.reduce((acc, i) => acc + i.cantidad, 0);
  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

  return (
    <Ctx.Provider
      value={{ items, count, total, addItem, removeItem, updateQuantity, clear }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
