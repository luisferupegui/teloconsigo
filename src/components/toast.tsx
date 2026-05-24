"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Check, X, ShoppingCart } from "lucide-react";

type Toast = {
  id: string;
  type: "success" | "info" | "error";
  title: string;
  description?: string;
};

type ToastContext = {
  toast: (t: Omit<Toast, "id">) => void;
};

const Ctx = createContext<ToastContext | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  const remove = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-24 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-80 items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl animate-slide-in-right"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                t.type === "success"
                  ? "bg-emerald-100 text-emerald-600"
                  : t.type === "error"
                    ? "bg-red-100 text-red-600"
                    : "bg-blue-100 text-[#1e6cff]"
              }`}
            >
              {t.type === "success" ? (
                <Check className="h-5 w-5" />
              ) : (
                <ShoppingCart className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-bold text-zinc-900">
                {t.title}
              </p>
              {t.description && (
                <p className="mt-0.5 text-xs text-zinc-600 line-clamp-2">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="text-zinc-400 hover:text-zinc-700"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
