"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  Heart, Laptop, PcCase, Server, Monitor, Tablet, Camera, Router, Network,
  HardDrive, MemoryStick, Cpu, CircuitBoard, Zap, Fan, Printer, Headphones,
  Keyboard, Mouse, Usb, KeyRound, Package,
} from "lucide-react";
import type { BusinessProduct } from "@/lib/products-types";
import { useWishlist } from "@/lib/wishlist";
import { formatCOP } from "@/lib/products-types";
import {
  subtituloDeCatalogo, iconoDeCard, resumirSpec, specsDeNombre, tituloDeCard, cabeEnEtiqueta,
} from "@/lib/ficha-card";

// ─── El icono del subtítulo ──────────────────────────────────────────────────
//
// La vitrina no lleva fotos: doce cards seguidas son doce bloques de texto y el
// ojo no encuentra dónde agarrarse. El icono da la primera lectura —esto es un
// portátil, esto un router— antes de leer una sola palabra.
const ICONOS: Record<string, React.ComponentType<{ className?: string }>> = {
  portatil: Laptop, escritorio: PcCase, servidor: Server, monitor: Monitor,
  tablet: Tablet, camara: Camera, red: Router, switch: Network,
  disco: HardDrive, ram: MemoryStick, procesador: Cpu, board: CircuitBoard,
  grafica: Cpu, energia: Zap, refrigeracion: Fan, impresora: Printer,
  audio: Headphones, teclado: Keyboard, mouse: Mouse, usb: Usb,
  licencia: KeyRound, accesorio: Package,
};

// ─── Etiquetas de specs (compartido con /productos y /soluciones) ──────────────

// La columna de la etiqueta se mide sola (grid `auto`), así que ya no hay que
// abreviar hasta el jeroglífico: "RES", "HZ" y "RESP" pedían adivinar. Cada
// card ajusta su columna a la etiqueta más larga que tenga, y todas sus filas
// quedan alineadas entre sí, que es lo que hace que se vea ordenada.
//
// El tope sigue siendo NUEVE caracteres: por encima, la etiqueta le come el
// sitio al dato, que es lo que se vino a enseñar.
const SPEC_LABEL: Record<string, string | null> = {
  procesador:       "CPU",
  nucleos:          "CORES",
  ram:              "RAM",
  almacenamiento:   "DISCO",
  capacidad:        "CAPACIDAD",
  gpu:              "GPU",
  pantalla:         "PANT",
  monitor:          "MONITOR",
  so:               "SO",
  garantia:         "GARANTÍA",
  conectividad:     "RED",
  bateria:          "BATERÍA",
  tdp:              "TDP",
  // Redes y cámaras
  estandar:         "WIFI",
  banda:            "BANDA",
  velocidad:        "VELOCIDAD",
  puertos:          "PUERTOS",
  potencia:         "POTENCIA",
  tipo:             "TIPO",
  resolucion:       "RESOL",
  tecnologia:       "TECNO",
  conexion:         "CONEXIÓN",
  interfaz:         "CONEXIÓN",
  // Monitores
  frecuencia:       "REFRESCO",
  tiempo_respuesta: "RESPUESTA",
  entradas:         "ENTRADAS",
  freesync:         "SYNC",
  curvatura:        "CURVA",
  color:            "COLOR",
  // Licencias
  aplicaciones:     "INCLUYE",
  incluye:          "INCLUYE",
  usuarios:         "USUARIOS",
  dispositivos:     "EQUIPOS",
  cobertura:        "EQUIPOS",
  duracion:         "VIGENCIA",
  version:          "VERSIÓN",
  activacion:       "ACTIVA",
  idioma:           "IDIOMA",
  soporte:          "SOPORTE",
  transferible:     "TRASLADO",
  proteccion:       "PROTEGE",
  clase:            "CLASE",
  // Accesorios y energía
  lectura:          "LECTURA",
  escritura:        "ESCRITURA",
  alcance:          "ALCANCE",
  dpi:              "DPI",
  botones:          "BOTONES",
  receptor:         "RECEPTOR",
  autonomia:        "AUTONOMÍA",
  tomas:            "TOMAS",
  avr:              "AVR",
  entrada:          "ENTRADA",
  salida:           "SALIDA",
  hdmi:             "HDMI",
  usb_velocidad:    "USB",
  pd:               "CARGA",
  carga_rapida:     "CARGA",
  compatibilidad:   "COMPAT",
  tamanho:          null,   // ya va en el subtítulo ("Monitor 24\"")
  panel:            null,   // idem
  // omitidos de la vista resumen
  extra:            null,
  cuerpo:           null,
  dimension:        null,
  peso:             null,
  resistencia:      null,
  ergonomia:        null,
  indicador:        null,
  cable:            null,
  board:            null,
  uso:              null,
  teclado:          null,
  mouse:            null,
  bateria_teclado:  null,
  bateria_mouse:    null,
};

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * Tarjeta de producto de negocio con botón de favoritos.
 *
 * variant="conseguir" (default) → CTA va a /conseguir?ref=...
 * variant="asesor"              → CTA va a /asesor?producto=...&ref=...&precio=...
 */
export function BusinessProductCard({
  product,
  variant = "conseguir",
}: {
  product: BusinessProduct;
  variant?: "conseguir" | "asesor";
}) {
  const { has, toggle } = useWishlist();
  const productKey = product.referencia ?? product.slug ?? product.id;
  const isFavorite  = has(productKey);

  const price = product.precioDesde ?? product.precio;

  const cotizarHref =
    variant === "asesor"
      ? `/asesor?producto=${encodeURIComponent(product.nombre)}&ref=${encodeURIComponent(
          product.referencia ?? product.slug,
        )}&precio=${price ?? ""}`
      : `/conseguir?ref=${product.referencia ?? product.slug}`;

  // "Escritorio alto rendimiento · Monitor 23.8"" no cabe en una etiqueta y se
  // cortaba justo donde estaba el dato: "…· Monitor …". Se parte en dos, que
  // además son dos cosas distintas —lo que es y lo que trae de más— y así ni se
  // corta ni hay que acortar el texto.
  // La descripción guardada manda, pero sólo si cabe en una etiqueta: si es una
  // frase, se usa el rótulo deducido del catálogo.
  const guardada = product.descripcionUso?.trim() ?? "";
  const [queEs, ...extras] = (cabeEnEtiqueta(guardada)
    ? guardada
    : subtituloDeCatalogo(product.nombre, product.categoria, product.specs)
  ).split(" · ");
  const Icono = ICONOS[iconoDeCard(product.nombre, product.categoria)] ?? Package;

  // Seis productos del catálogo no traen NI UNA spec —"Unidad DVD-RW Externa
  // Usb 3.0", "Intel Core i5-12400F LGA1700 (2.5GHZ)"— y salían con la card en
  // blanco entre el nombre y el precio. Su ficha está en el nombre; se lee de
  // ahí, igual que hace el panel al publicar.
  const specs = Object.keys(product.specs ?? {}).length
    ? product.specs
    : specsDeNombre(product.nombre);

  const specRows = Object.entries(specs)
    .map(([k, v]) => {
      const label = k in SPEC_LABEL ? SPEC_LABEL[k] : k;
      return label ? { clave: k, label, value: resumirSpec(k, String(v)) } : null;
    })
    .filter((x): x is { clave: string; label: string; value: string } => x !== null)
    .filter((x) => x.value.length > 0)
    .slice(0, 4);

  return (
    <div className="relative flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5">

      {/* ── Botón favoritos ── */}
      <button
        type="button"
        onClick={() => toggle(productKey)}
        aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center
                   rounded-full bg-white shadow-sm border border-zinc-100
                   transition-colors hover:bg-zinc-50"
      >
        <Heart
          className={`h-3.5 w-3.5 transition-colors ${
            isFavorite ? "fill-rose-500 text-rose-500" : "text-zinc-400"
          }`}
          strokeWidth={1.5}
        />
      </button>

      {/* ── Nombre ── */}
      <h3 className="pr-9 text-sm font-semibold tracking-tight text-zinc-900 leading-snug line-clamp-2 min-h-[2.5rem]">
        {tituloDeCard(product.nombre)}
      </h3>

      {/* ── Qué es ──
          Los productos que se cargaron a mano no traen `descripcionUso`, así que
          se deduce del catálogo antes que dejar el renglón en blanco. Va en azul
          de marca y con icono: es lo único de color de la card y lo que la salva
          de ser un bloque de texto gris. */}
      <div className="mt-2 flex min-h-[1.75rem] flex-wrap gap-1.5">
        {queEs && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1
                           text-[11px] font-semibold leading-none text-[#1e6cff]
                           ring-1 ring-inset ring-blue-100">
            <Icono className="h-3.5 w-3.5 shrink-0" />
            {queEs}
          </span>
        )}
        {extras.map((e) => (
          <span key={e} className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1
                                   text-[11px] font-semibold leading-none text-zinc-600">
            {e}
          </span>
        ))}
      </div>

      {/* ── Ficha ──
          En un panel propio: separa lo que se compara de lo que se lee, y una
          card con una sola spec deja de verse rota. */}
      <div className="mt-3 flex-1">
        {specRows.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-2.5 gap-y-2
                         rounded-xl bg-zinc-50/80 px-3 py-2.5 text-[11px] leading-4
                         ring-1 ring-inset ring-zinc-100">
            {specRows.map(({ clave, label, value }) => (
              <Fragment key={clave}>
                <dt className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">
                  {label}
                </dt>
                <dd className="min-w-0 font-medium text-zinc-700">{value}</dd>
              </Fragment>
            ))}
          </dl>
        )}
      </div>

      {/* ── Precio y CTA ── */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-100 pt-3.5">
        <div>
          {price ? (
            <>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Desde
              </span>
              <p className="mt-0.5 text-[17px] font-black leading-tight tracking-tight text-zinc-900">
                {formatCOP(price)}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-zinc-400">Consultar precio</p>
          )}
        </div>
        <Link
          href={cotizarHref}
          className="shrink-0 rounded-full bg-[#1e6cff] px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 active:scale-95"
        >
          Cotizar
        </Link>
      </div>
    </div>
  );
}
