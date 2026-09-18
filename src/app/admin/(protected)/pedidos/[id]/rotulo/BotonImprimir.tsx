"use client";

export function BotonImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-[#1e6cff] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1858d6]"
    >
      🖨️ Imprimir / Guardar PDF
    </button>
  );
}
