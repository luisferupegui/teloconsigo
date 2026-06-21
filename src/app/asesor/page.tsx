"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, Suspense, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Send, Monitor, Laptop, Gamepad2, Building2, Headphones, Truck,
  ShieldCheck, Award, Sparkles, ChevronRight, Cpu, Minimize2,
} from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; hidden?: boolean };
type InactivityState = "active" | "notified15" | "notified30" | "archived";

const AVATAR        = "/asesor/andrea.png";
const SESSION_KEY   = "tlc-andrea-chat";

// ─── Tiempos de inactividad ────────────────────────────────────────────────
const T_15 = 15 * 60 * 1000;
const T_30 = 30 * 60 * 1000;
const T_60 = 60 * 60 * 1000;

// ─── Mensajes automáticos de inactividad ──────────────────────────────────
const MSG_15MIN =
  "¿Sigues allí? 😊\n\nSi necesitas ayuda para elegir un producto o tienes alguna pregunta, estaré encantada de ayudarte.";
const MSG_30MIN =
  "Guardaré nuestra conversación para que puedas retomarla cuando quieras.\n\nCuando regreses, continuaré ayudándote donde quedamos. 🙌";
const MSG_RETURN =
  "¡Hola de nuevo! 😊 Veo que retomaste nuestra conversación. ¿En qué puedo ayudarte?";

// ─── Botones de acceso rápido ──────────────────────────────────────────────
const QUICK_GENERAL = [
  { icon: Monitor,    label: "Necesito un computador de escritorio" },
  { icon: Laptop,     label: "Busco un portátil" },
  { icon: Gamepad2,   label: "Quiero una PC Gamer" },
  { icon: Cpu,        label: "Componentes" },
  { icon: Building2,  label: "Equipos para mi empresa" },
  { icon: Headphones, label: "Accesorios y otros" },
  { icon: Truck,      label: "Estado de mi pedido" },
];

const QUICK_PRODUCTO = [
  "¿Cuál es el precio?",
  "¿En cuánto tiempo me llega?",
  "¿Tiene garantía?",
];

// ─── Sidebar — beneficios ──────────────────────────────────────────────────
const BENEFITS = [
  { icon: ShieldCheck, title: "Productos originales",   desc: "Trabajamos con las mejores marcas del mercado." },
  { icon: Award,       title: "Garantía nacional",      desc: "Todos nuestros productos cuentan con garantía." },
  { icon: Truck,       title: "Envíos a toda Colombia", desc: "Entregas rápidas y seguras a donde estés." },
];

// ─── Sidebar — productos más buscados ────────────────────────────────────────
const TOP_PRODUCTS = [
  { img: "/productos/P3406CKANZ0441X/card.png",   name: "Portátiles",            desc: "Para trabajo y estudio",          q: "Busco un portátil" },
  { img: "/productos/LS27F320GANX/card.png",       name: "Monitores",             desc: "Más pantalla, más productividad", q: "Quiero un monitor" },
  { img: "/productos/13C50021LD/card.png",         name: "Equipos de escritorio", desc: "Potencia para hogar y oficina",   q: "Necesito un equipo de escritorio" },
  { img: "/productos/1115-KDT128/card.png",        name: "Accesorios",            desc: "Memorias USB, hubs, cables y más",   q: "Busco accesorios para mi PC: memorias USB, hubs o cables" },
  { img: "/lineas/tarjetas-graficas/amd-1.png",    name: "Componentes",           desc: "GPU, RAM, procesadores y más",       q: "Busco componentes: tarjeta de video, RAM o procesador" },
  { img: "/productos/5035-AHD330-1T/card.png",     name: "Discos Externos",       desc: "Respaldo y almacenamiento portátil", q: "Busco un disco duro externo" },
];

// ─── Saludos ───────────────────────────────────────────────────────────────
const SALUDO_GENERAL =
  "¡Hola! Soy **Andrea** 😊\n\nEstoy aquí para ayudarte a encontrar la mejor tecnología para tu hogar o empresa.\n\n¿Qué producto estás buscando?";

const saludoProducto = (nombre: string) =>
  `¡Hola! Soy **Andrea** 😊\n\nVi que te interesa el **${nombre}**. Dame un momento que verifico el precio y disponibilidad para ti 🔍`;

const SALUDO_ARMADOR =
  "¡Hola! Soy **Andrea** 😊\n\n¡Me encanta tu configuración! 🙌 Dame un momento que te confirmo el precio final y la entrega 🔍";

// ─── Render markdown: negritas + listas ───────────────────────────────────
function applyBold(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function renderRich(text: string): ReactNode {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^[-*]\s+\S/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      nodes.push(
        <ul key={`ul${i}`} className="my-1 space-y-1 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#1e6cff]" />
              <span>{applyBold(item)}</span>
            </li>
          ))}
        </ul>,
      );
    } else if (/^\d+\.\s+\S/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      nodes.push(
        <ol key={`ol${i}`} className="my-1 space-y-1 pl-4 list-decimal">
          {items.map((item, j) => (
            <li key={j}>{applyBold(item)}</li>
          ))}
        </ol>,
      );
    } else if (/^\s*\|.+\|\s*$/.test(line)) {
      // Tabla markdown: recolectar todas las filas contiguas
      const rows: string[][] = [];
      const isSep: boolean[] = [];
      while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
        const cells = lines[i].trim().split("|").slice(1, -1).map((c) => c.trim());
        rows.push(cells);
        isSep.push(cells.every((c) => /^[-: ]+$/.test(c)));
        i++;
      }
      const headers  = rows[0] ?? [];
      const bodyRows = rows.filter((_, idx) => idx !== 0 && !isSep[idx]);
      nodes.push(
        <div key={`tbl${i}`} className="my-2 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50">
              <tr>{headers.map((h, j) => <th key={j} className="px-3 py-2 text-left font-semibold text-zinc-700 whitespace-nowrap">{applyBold(h)}</th>)}</tr>
            </thead>
            <tbody>
              {bodyRows.map((row, j) => (
                <tr key={j} className={j % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}>
                  {row.map((cell, k) => <td key={k} className="px-3 py-1.5 text-zinc-600">{applyBold(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (line === "") {
      nodes.push(<div key={`sp${i}`} className="h-1.5" />);
      i++;
    } else {
      nodes.push(<p key={`p${i}`} className="leading-relaxed">{applyBold(line)}</p>);
      i++;
    }
  }
  return <>{nodes}</>;
}

// ─── Avatar circular ───────────────────────────────────────────────────────
function ChatAvatar({ size }: { size: number }) {
  return (
    <Image
      src={AVATAR}
      alt="Andrea"
      width={size}
      height={size}
      className="rounded-full object-cover object-top ring-2 ring-white shadow-sm shrink-0"
      style={{ width: size, height: size }}
      priority
    />
  );
}

// ─── Indicador de escritura ────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <span className="flex items-center gap-2 py-0.5">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
      </span>
      <span className="text-xs italic text-zinc-400">Andrea está escribiendo...</span>
    </span>
  );
}

// ─── Contenido principal ───────────────────────────────────────────────────
function AsesorContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const producto    = searchParams.get("producto") ?? "";
  const ref         = searchParams.get("ref") ?? "";
  const precio      = searchParams.get("precio") ?? "";
  const hasProducto = producto.length > 0;
  const isArmador   = ref === "armador";

  const initialMsg: Msg = {
    role: "assistant",
    content: isArmador ? SALUDO_ARMADOR : hasProducto ? saludoProducto(producto) : SALUDO_GENERAL,
  };

  const [messages,      setMessages]      = useState<Msg[]>([initialMsg]);
  const [input,         setInput]         = useState("");
  const [loading,       setLoading]       = useState(hasProducto); // true desde el inicio cuando hay producto → evita flash de QUICK_PRODUCTO
  const [isTyping,      setIsTyping]      = useState(false);
  const [lastActivity,  setLastActivity]  = useState<number>(() => Date.now());
  const [inactivity,    setInactivity]    = useState<InactivityState>("active");
  const [showChoice,    setShowChoice]    = useState(false);
  const [sessionReady,  setSessionReady]  = useState(false);
  const scrollRef       = useRef<HTMLDivElement>(null);
  const restoredRef     = useRef(false);
  const autoStartedRef  = useRef(false);
  const savedDataRef    = useRef<{ msgs: Msg[]; la: number; is: InactivityState } | null>(null);

  // ── Detectar conversación guardada al montar ──────────────────────────────
  useEffect(() => {
    if (restoredRef.current) return;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (!saved) { restoredRef.current = true; setSessionReady(true); return; }
      const parsed = JSON.parse(saved);
      const msgs: Msg[]           = Array.isArray(parsed) ? parsed : (parsed?.messages ?? []);
      const la:   number          = parsed?.lastActivity     ?? Date.now();
      const is:   InactivityState = parsed?.inactivityState  ?? "active";
      const hasUser = msgs.some((m: Msg) => m.role === "user" && !m.hidden);
      if (!hasUser || msgs.length < 1) { restoredRef.current = true; setSessionReady(true); return; }
      savedDataRef.current = { msgs, la, is };
      setShowChoice(true);
      setSessionReady(true);
    } catch { restoredRef.current = true; setSessionReady(true); }
  }, []);

  const handleContinue = () => {
    const data = savedDataRef.current;
    autoStartedRef.current = true; // conversación restaurada → no disparar auto-inicio
    setLoading(false); // si hasProducto=true loading arrancó true; al restaurar se habilita el input
    if (!data) { setShowChoice(false); restoredRef.current = true; return; }
    let { msgs, la, is } = data;
    const elapsed    = Date.now() - la;
    const extraMsgs: Msg[] = [];
    if (is !== "archived") {
      if (is === "active" && elapsed >= T_15) {
        is = "notified15";
        extraMsgs.push({ role: "assistant", content: MSG_15MIN });
      }
      if (is === "notified15" && elapsed >= T_30) {
        is = "notified30";
        extraMsgs.push({ role: "assistant", content: MSG_30MIN });
      }
      if (is === "notified30" && elapsed >= T_60) is = "archived";
    }
    setMessages([...msgs, ...extraMsgs]);
    setLastActivity(la);
    setInactivity(is);
    setShowChoice(false);
    restoredRef.current = true;
  };

  const handleNewChat = () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    window.dispatchEvent(new CustomEvent("tlc-chat-cleared"));
    setMessages([initialMsg]);
    setShowChoice(false);
    restoredRef.current = true;
  };

  // ── Guardar conversación y estado en cada cambio ──────────────────────────
  useEffect(() => {
    if (!restoredRef.current) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        messages, lastActivity, inactivityState: inactivity,
      }));
    } catch { /* */ }
  }, [messages, lastActivity, inactivity]);

  // ── Timer de inactividad ──────────────────────────────────────────────────
  useEffect(() => {
    const hasUserMsg = messages.some((m) => m.role === "user" && !m.hidden);
    if (!hasUserMsg || inactivity === "archived") return;

    const id = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      if (inactivity === "active" && elapsed >= T_15) {
        setInactivity("notified15");
        setMessages((prev) => [...prev, { role: "assistant", content: MSG_15MIN }]);
      } else if (inactivity === "notified15" && elapsed >= T_30) {
        setInactivity("notified30");
        setMessages((prev) => [...prev, { role: "assistant", content: MSG_30MIN }]);
      } else if (inactivity === "notified30" && elapsed >= T_60) {
        setInactivity("archived");
      }
    }, 60_000);

    return () => clearInterval(id);
  }, [lastActivity, inactivity, messages]);

  // ── Auto-inicio: buscar precio/disponibilidad al llegar desde una card ────
  useEffect(() => {
    if (!sessionReady || showChoice || !hasProducto) return;
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    const SEP = String.fromCharCode(30);
    const autoUserMsg: Msg = { role: "user", content: `¿Cuál es el precio y disponibilidad del ${producto}?`, hidden: true };
    setLoading(true);
    setIsTyping(true);
    const doFetch = async () => {
      try {
        const res = await fetch("/api/asesor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [initialMsg], contexto: { producto, ref, precio }, autoInicio: true }),
        });
        if (!res.ok || !res.body) { setIsTyping(false); setLoading(false); return; }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          const parts = acc.split(SEP);
          const bubbles: Msg[] = parts.map((c) => c.trim()).filter((c) => c.length > 0).map((c) => ({ role: "assistant" as const, content: c }));
          setMessages([initialMsg, autoUserMsg, ...bubbles]);
          setIsTyping(parts[parts.length - 1].trim().length === 0);
        }
        if (acc.split(SEP).every((c) => c.trim().length === 0)) setMessages([initialMsg]);
      } catch { setMessages([initialMsg]); }
      finally { setLoading(false); setIsTyping(false); }
    };
    doFetch();
  }, [sessionReady, showChoice, hasProducto]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasUserMsg = messages.some((m) => m.role === "user" && !m.hidden);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    setInput("");

    // Reiniciar contador de inactividad
    const now = Date.now();
    setLastActivity(now);
    setInactivity("active");

    // Si retorna desde estado archivado, insertar saludo de bienvenida
    const base = inactivity === "archived"
      ? [...messages, { role: "assistant" as const, content: MSG_RETURN }]
      : messages;

    const withUser: Msg[] = [...base, { role: "user", content: t }];
    setMessages(withUser);
    setLoading(true);
    setIsTyping(true);

    // El backend separa el preámbulo ("dame un momento") de la respuesta final
    // con un ASCII Record Separator (char 30). Cada segmento es su propio globo;
    // mientras llega el siguiente, se muestra el indicador "escribiendo…".
    const SEP = String.fromCharCode(30);

    const renderStream = (acc: string) => {
      const parts = acc.split(SEP);
      const bubbles = parts
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
        .map((c) => ({ role: "assistant" as const, content: c }));
      setMessages([...withUser, ...bubbles]);
      // Si el último segmento aún está vacío, Andrea sigue "escribiendo" el próximo globo.
      setIsTyping(parts[parts.length - 1].trim().length === 0);
    };

    try {
      const res = await fetch("/api/asesor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: withUser,
          contexto: hasProducto ? { producto, ref, precio } : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        let msg = "Uf, no pude responderte en este momento. ¿Lo intentamos de nuevo?";
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch { /* */ }
        setIsTyping(false);
        setMessages([...withUser, { role: "assistant", content: msg }]);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        renderStream(acc);
      }

      // Si no llegó ningún contenido real (solo separadores o vacío) → fallback.
      if (acc.split(SEP).every((c) => c.trim().length === 0)) {
        setIsTyping(false);
        setMessages([...withUser, { role: "assistant", content: "Uf, no me llegó la respuesta. ¿Lo intentamos de nuevo? 😊" }]);
      }
    } catch {
      setIsTyping(false);
      setMessages([...withUser, { role: "assistant", content: "Parece que se cayó la conexión. ¿Lo intentamos de nuevo?" }]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // rAF garantiza que el DOM ya pintó el nuevo contenido antes de leer scrollHeight
    const id = requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    return () => cancelAnimationFrame(id);
  }, [messages, isTyping, inactivity]);

  return (
    <div className="py-6">
      <div className="mx-auto max-w-6xl px-4">

        {/* Breadcrumb + Minimizar */}
        <div className="mb-4 flex items-center justify-between">
          <nav className="text-xs text-zinc-400">
            <Link href="/" className="hover:text-zinc-600">Inicio</Link>
            <span className="mx-1.5">/</span>
            <span className="text-zinc-500">Andrea</span>
          </nav>
          <button
            onClick={() => { if (typeof window !== "undefined" && window.history.length > 1) router.back(); else router.push("/"); }}
            aria-label="Minimizar chat y seguir navegando por el sitio"
            title="Minimizar y seguir navegando"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#1e6cff]/25 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1858d6] shadow-sm transition hover:border-[#1e6cff]/50 hover:bg-[#1e6cff]/5"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            <span>Minimizar</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* ── Columna chat (2/3) ────────────────────────────────────── */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:col-span-2">

            {/* Encabezado de Andrea */}
            <div className="relative flex items-center gap-4 overflow-hidden border-b border-zinc-100 px-6 py-5">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1e6cff]/[0.05] via-[#1e6cff]/[0.02] to-transparent" />

              <div className="relative z-10 shrink-0">
                <Image
                  src={AVATAR}
                  alt="Andrea — Especialista en Tecnología"
                  width={90}
                  height={90}
                  className="rounded-full object-cover object-top shadow-md ring-4 ring-[#1e6cff]/10"
                  style={{ width: 90, height: 90 }}
                  priority
                />
                <span className={`absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full ring-2 ring-white transition-colors duration-500 ${
                  inactivity === "archived"   ? "bg-zinc-400" :
                  inactivity === "notified30" ? "bg-amber-400" :
                  "bg-emerald-500"
                }`} />
              </div>

              <div className="z-10 min-w-0">
                <h1 className="text-xl font-bold leading-tight text-zinc-900">Andrea</h1>
                <p className="text-sm font-semibold text-[#1e6cff]">Especialista en Tecnología</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {inactivity === "archived"   ? "💤 Conversación archivada" :
                   inactivity === "notified30" ? "💾 Conversación guardada" :
                   "⚡ Respuesta en menos de 1 minuto"}
                </p>
              </div>

              <div className="z-10 ml-auto self-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/asesor/logo-slogan.png"
                  alt="Te lo Consigo"
                  style={{ height: 52, width: "auto" }}
                  className="hidden md:block"
                />
              </div>
            </div>

            {/* Mensajes */}
            <div
              ref={scrollRef}
              className="flex flex-col gap-4 overflow-y-auto bg-slate-50/60 px-5 py-5 min-h-[280px] max-h-[400px]"
            >
              {/* ── Pantalla de elección: continuar o nuevo chat ────────── */}
              {showChoice && (
                <div className="flex flex-1 flex-col items-center justify-center gap-5 min-h-[220px] py-4 animate-fade-in-up" style={{ animationDuration: "0.25s" }}>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <ChatAvatar size={56} />
                    <p className="font-semibold text-zinc-900">¡Hola de nuevo!</p>
                    <p className="text-sm text-zinc-500 max-w-[260px] leading-relaxed">
                      Andrea guardó tu conversación anterior.<br />¿Qué prefieres hacer?
                    </p>
                  </div>
                  <div className="flex flex-col w-full max-w-[260px] gap-2.5">
                    <button
                      onClick={handleContinue}
                      className="flex items-center justify-between rounded-xl bg-[#1e6cff] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1858d6]"
                    >
                      <span>Continuar conversación</span>
                      <ChevronRight className="h-4 w-4 opacity-70" />
                    </button>
                    <button
                      onClick={handleNewChat}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:border-zinc-300"
                    >
                      Empezar un chat nuevo
                    </button>
                  </div>
                </div>
              )}

              {!showChoice && messages.filter((m) => !m.hidden).map((m, i) => {
                if (m.role === "user") {
                  return (
                    <div
                      key={i}
                      className="ml-auto max-w-[82%] animate-fade-in-up"
                      style={{ animationDuration: "0.2s" }}
                    >
                      <div className="whitespace-pre-line rounded-2xl rounded-br-sm bg-[#1e6cff] px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
                        {m.content}
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={i}
                    className="flex max-w-[88%] items-end gap-2.5 animate-fade-in-up"
                    style={{ animationDuration: "0.2s" }}
                  >
                    <ChatAvatar size={32} />
                    <div className="rounded-2xl rounded-bl-sm border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-800 shadow-sm">
                      {renderRich(m.content)}
                    </div>
                  </div>
                );
              })}

              {/* Indicador de escritura — independiente del array de mensajes */}
              {!showChoice && isTyping && (
                <div
                  className="flex max-w-[88%] items-end gap-2.5 animate-fade-in-up"
                  style={{ animationDuration: "0.15s" }}
                >
                  <ChatAvatar size={32} />
                  <div className="rounded-2xl rounded-bl-sm border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                    <TypingIndicator />
                  </div>
                </div>
              )}

              {/* Banner de conversación archivada */}
              {!showChoice && inactivity === "archived" && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500 animate-fade-in-up">
                  <span>💤</span>
                  <span>Conversación archivada · Escribe para continuar desde donde quedamos</span>
                </div>
              )}
            </div>

            {/* Accesos rápidos + input */}
            <div className="space-y-3 border-t border-zinc-100 px-5 py-4">

              {!hasProducto && !hasUserMsg && !showChoice && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {QUICK_GENERAL.map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      onClick={() => send(label)}
                      disabled={loading}
                      className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-xs font-medium text-zinc-700 shadow-sm transition hover:border-[#1e6cff]/40 hover:bg-[#1e6cff]/5 hover:text-[#1e6cff] disabled:opacity-50 last:col-span-full"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[#1e6cff]" />
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {hasProducto && !hasUserMsg && !showChoice && !loading && !autoStartedRef.current && (
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PRODUCTO.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      disabled={loading}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 transition hover:border-[#1e6cff]/40 hover:bg-[#1e6cff]/5 hover:text-[#1e6cff] disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  placeholder="Escríbele a Andrea…"
                  className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 focus:border-[#1e6cff]/50 focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/15 disabled:bg-zinc-100"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Enviar"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e6cff] text-white shadow-sm transition hover:bg-[#1858d6] disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>

          {/* ── Sidebar (1/3) ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 lg:col-span-1">

            {/* Sellos de confianza */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="space-y-4">
                {BENEFITS.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e6cff]/10">
                      <Icon className="h-5 w-5 text-[#1e6cff]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Productos más buscados */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Productos más buscados
              </h2>

              <div className="space-y-0.5">
                {TOP_PRODUCTS.map(({ img, name, desc, q }) => (
                  <button
                    key={name}
                    onClick={() => send(q)}
                    className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50"
                  >
                    {/* Thumbnail de alta definición */}
                    <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-100 transition group-hover:ring-[#1e6cff]/30">
                      <Image
                        src={img}
                        alt={name}
                        width={60}
                        height={60}
                        className="h-[58px] w-[58px] object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 group-hover:text-[#1e6cff] transition-colors">{name}</p>
                      <p className="truncate text-xs text-zinc-500">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-zinc-400">
          Atención personalizada de teloconsigo.co
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function AsesorPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-20 text-center text-zinc-400">
          Cargando…
        </div>
      }
    >
      <AsesorContent />
    </Suspense>
  );
}
