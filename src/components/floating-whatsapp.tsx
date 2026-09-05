"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, ChevronRight, MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/contacto";

const WA_HREF = whatsappUrl("Hola, visité la web de Te lo Consigo y quisiera información sobre un producto");

const AVATAR      = "/asesor/andrea.png";
const SESSION_KEY = "tlc-andrea-chat";

export function FloatingWhatsApp() {
  const pathname = usePathname();
  const [mounted,         setMounted]         = useState(false);
  const [showCard,        setShowCard]        = useState(false);
  const [cardDismissed,   setCardDismissed]   = useState(false);
  const [hasConversation, setHasConversation] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setMounted(true),          1200);
    const t2 = setTimeout(() => setShowCard(true),         5000);
    const t3 = setTimeout(() => setCardDismissed(true), 5000 + 28000);

    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const msgs = Array.isArray(parsed) ? parsed : (parsed?.messages ?? []);
        if (msgs.some((m: { role: string }) => m.role === "user")) {
          setHasConversation(true);
        }
      }
    } catch { /* sessionStorage no disponible */ }

    const onCleared = () => setHasConversation(false);
    window.addEventListener("tlc-chat-cleared", onCleared);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      window.removeEventListener("tlc-chat-cleared", onCleared);
    };
  }, []);

  if (!mounted || pathname.startsWith("/asesor")) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2.5">

      {/* ── Tarjeta popup ─────────────────────────────────────────────────── */}
      {showCard && !cardDismissed && (
        <div
          className="animate-fade-in-up w-[276px] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/[0.10] ring-1 ring-black/[0.06]"
          style={{ animationDuration: "0.35s" }}
        >
          <div className="h-[3px] w-full bg-gradient-to-r from-[#1e6cff] via-[#4f8aff] to-[#7c5aff]" />

          <div className="p-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={AVATAR}
                  alt="Andrea"
                  style={{ width: 44, height: 44 }}
                  className="rounded-full object-cover object-top shadow-sm ring-2 ring-[#1e6cff]/15"
                />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-[2.5px] border-white bg-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-900">Andrea</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600">En línea ahora</span>
                </div>
              </div>
              <button
                onClick={() => setCardDismissed(true)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                aria-label="Cerrar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Burbuja de mensaje — cambia si hay conversación guardada */}
            <div className="mt-3.5 rounded-2xl rounded-tl-sm bg-slate-50 px-4 py-3 text-sm leading-relaxed text-zinc-700 ring-1 ring-black/[0.04]">
              {hasConversation ? (
                <>
                  👋 ¡Bienvenido de nuevo! 😊<br />
                  Tienes una conversación guardada. ¿Continuamos donde quedamos?
                </>
              ) : (
                <>
                  👋 Hola, soy <strong className="font-semibold text-zinc-900">Andrea</strong> 😊<br />
                  Especialista en tecnología. ¿En qué te puedo ayudar hoy?
                </>
              )}
            </div>

            {/* CTA principal — Andrea */}
            <Link
              href="/asesor"
              className="mt-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-[#1e6cff] to-[#4f8aff] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[#1e6cff]/25 transition hover:brightness-105 hover:shadow-[#1e6cff]/40"
            >
              <span>{hasConversation ? "Retomar conversación" : "Hablar con Andrea"}</span>
              <ChevronRight className="h-4 w-4 opacity-80" />
            </Link>

            {/* Separador */}
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-px flex-1 bg-zinc-100" />
              <span className="text-[10px] font-medium text-zinc-400">o</span>
              <div className="h-px flex-1 bg-zinc-100" />
            </div>

            {/* CTA secundario — WhatsApp */}
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/8 px-4 py-2 text-sm font-semibold text-[#128C7E] transition hover:bg-[#25D366]/15"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              Escríbenos por WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* ── Fila inferior: badge (hover) + botón avatar ──────────────────── */}
      <div className="group flex items-center gap-2.5">

        {/* Badge — solo visible al hacer hover */}
        <div className="pointer-events-none translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
          <div className="flex items-center gap-2 rounded-full border border-zinc-100 bg-white px-3.5 py-1.5 shadow-lg shadow-black/[0.08] whitespace-nowrap">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-zinc-800">
              {hasConversation ? "Retomar conversación" : "Andrea en línea"}
            </span>
          </div>
        </div>

        {/* Botón avatar */}
        <Link
          href="/asesor"
          aria-label="Hablar con Andrea"
          className="relative flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full shadow-2xl shadow-black/20 ring-[3px] ring-white transition duration-200 hover:scale-105"
        >
          {/* anillo de pulso — azul si hay conversación activa, verde si no */}
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-20 ${hasConversation ? "bg-[#1e6cff]" : "bg-emerald-400"}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={AVATAR}
            alt="Andrea"
            className="relative h-full w-full rounded-full object-cover object-top"
          />
          {/* punto verde online (siempre) */}
          <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
          {/* punto azul de notificación (conversación guardada) */}
          {hasConversation && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-[#1e6cff] shadow-sm" />
          )}
        </Link>
      </div>

    </div>
  );
}
