"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

export function FloatingWhatsApp() {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="animate-slide-in-right w-72 rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden">
          <div className="flex items-center gap-3 bg-emerald-500 p-4 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-bold">
                Te lo Consigo
              </p>
              <p className="text-xs text-emerald-50">
                ¡Hola! Estamos en línea
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 text-sm">
            <div className="rounded-lg rounded-tl-sm bg-zinc-100 px-3 py-2 text-zinc-700">
              👋 ¡Hola! ¿En qué te podemos ayudar hoy?
            </div>
            <a
              href="https://wa.me/14079169299?text=Hola,%20vengo%20de%20teloconsigo.co"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition"
            >
              <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
            </a>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 transition hover:scale-110 hover:bg-emerald-600"
        aria-label="WhatsApp"
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
        <MessageCircle className="relative h-6 w-6" />
      </button>
    </div>
  );
}
