"use client";

import { useState } from "react";
import { borrarPedido } from "./actions";

export function DeleteButton({ orderId }: { orderId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={async () => {
            setLoading(true);
            await borrarPedido(orderId);
          }}
          disabled={loading}
          className="rounded px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
        >
          {loading ? "…" : "Sí, borrar"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="Mover al historial"
      className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}
