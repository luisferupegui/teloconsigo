"use client";

import Image from "next/image";

// Altura base 36 px − 30 % = 25 px
const H = 25;

// ─── Tipos de entrada ────────────────────────────────────────────────────────
type ImgLogo = { kind: "img"; src: string };

type StripLogo = {
  kind:       "strip";
  src:        string;
  stripW:     number;
  stripH:     number;
  /** Modo "slot dentro de strip multi-logo" */
  slotIndex?:  number;
  totalSlots?: number;
  /** Modo override: recorte explícito en píxeles del source */
  cropX?:     number;
  cropW?:     number;
  /** >1 zoom in para que el texto del logo llene la altura visual */
  zoomFactor?: number;
  /** Etiqueta de la marca para tooltip / aria */
  label:      string;
};

type LogoEntry = ImgLogo | StripLogo;

// ─── Lista de logos ───────────────────────────────────────────────────────────
// Excluidos del set antiguo: logo-005 (fragmento "ZXT"), logo-018 (fragmento "SAMS"),
// logo-019 (fragmento "UNG"), logo-020 (fragmento), logo-021 (Lenovo con fondo rosa).
// SAMSUNG, ROG y Lenovo se extraen del HD strip-4.png con CSS background-position.
const LOGOS: LogoEntry[] = [
  // logo-001 → logo-003 (ASUS, MSI, Gigabyte)
  ...Array.from({ length: 3 }, (_, i) => ({
    kind: "img" as const,
    src: `/brands/logo-${String(i + 1).padStart(3, "0")}.png`,
  })),
  // ASRock: logo-004.png recortado vía CSS para eliminar los 88px finales
  // (82px vacíos + fragmento residual de 6px que se veía como "|")
  // El archivo asrock.png está mal etiquetado: contiene el logo de Gigabyte.
  { kind: "strip", src: "/brands/logo-004.png", stripW: 332, stripH: 67,
    cropX: 0, cropW: 244, label: "ASRock" },
  // logo-006 → logo-017 (salta logo-005; excluye logo-018 fragmento "SAMS")
  ...Array.from({ length: 12 }, (_, i) => ({
    kind: "img" as const,
    src: `/brands/logo-${String(i + 6).padStart(3, "0")}.png`,
  })),
  // ── Strip-4.png HD: SAMSUNG · ROG · Lenovo (slots 2, 3, 4 de 7) ──
  { kind: "strip", src: "/brands/strip-4.png", stripW: 1693, stripH: 108,
    slotIndex: 2, totalSlots: 7, zoomFactor: 1.7, label: "SAMSUNG" },
  { kind: "strip", src: "/brands/strip-4.png", stripW: 1693, stripH: 108,
    slotIndex: 3, totalSlots: 7, zoomFactor: 1.5, label: "ROG" },
  { kind: "strip", src: "/brands/strip-4.png", stripW: 1693, stripH: 108,
    slotIndex: 4, totalSlots: 7, zoomFactor: 1.5, label: "Lenovo" },
  // logo-022 → logo-040 (salta logo-021 = Lenovo con fondo rosa)
  ...Array.from({ length: 19 }, (_, i) => ({
    kind: "img" as const,
    src: `/brands/logo-${String(i + 22).padStart(3, "0")}.png`,
  })),
  // ADATA con archivo HD limpio (logo-041 tenía 15.3% de píxeles rosa = fondo coral defectuoso)
  { kind: "img", src: "/brands/adata.png" },
  // logo-042 → logo-051
  ...Array.from({ length: 10 }, (_, i) => ({
    kind: "img" as const,
    src: `/brands/logo-${String(i + 42).padStart(3, "0")}.png`,
  })),
];

// ─── Componente de un logo ────────────────────────────────────────────────────
function Logo({ entry, aria }: { entry: LogoEntry; aria?: boolean }) {
  if (entry.kind === "strip") {
    // Recorte CSS para mostrar solo una región del source
    const baseScale  = H / entry.stripH;
    const effScale   = baseScale * (entry.zoomFactor ?? 1);
    const bgW        = Math.round(entry.stripW * effScale);

    // Calcular región: por slot (multi-logo) o por crop explícito (single-logo)
    const cropSrcX = entry.cropX     ?? (entry.slotIndex! * entry.stripW / entry.totalSlots!);
    const cropSrcW = entry.cropW     ?? (entry.stripW / entry.totalSlots!);
    const slotW    = Math.round(cropSrcW * effScale);
    const offsetX  = Math.round(cropSrcX * effScale);

    return (
      <div
        aria-hidden={aria || undefined}
        className="group shrink-0 px-[22px] cursor-default"
      >
        <div
          aria-label={entry.label}
          title={entry.label}
          className="select-none opacity-60 transition-all duration-300
                     group-hover:opacity-100 group-hover:scale-125"
          style={{
            width:              `${slotW}px`,
            height:             `${H}px`,
            backgroundImage:    `url('${entry.src}')`,
            backgroundSize:     `${bgW}px auto`,
            backgroundPosition: `-${offsetX}px center`,
            backgroundRepeat:   "no-repeat",
          }}
        />
      </div>
    );
  }

  // Logo individual (img)
  const fileName = entry.src.split("/").pop() ?? "";

  return (
    <div
      aria-hidden={aria || undefined}
      className="group shrink-0 px-[22px] cursor-default"
    >
      <Image
        src={entry.src}
        alt=""
        title={fileName}
        height={H}
        width={H * 3}
        unoptimized
        style={{ height: `${H}px`, width: "auto" }}
        className="select-none object-contain opacity-60
                   transition-all duration-300
                   group-hover:opacity-100 group-hover:scale-125"
      />
    </div>
  );
}

// ─── Fila (se duplica para loop continuo) ─────────────────────────────────────
function LogoRow({ aria }: { aria?: boolean }) {
  return (
    <>
      {LOGOS.map((entry, i) => (
        <Logo key={i} entry={entry} aria={aria} />
      ))}
    </>
  );
}

// ─── Sección del marquee ──────────────────────────────────────────────────────
export function BrandMarquee() {
  return (
    <section
      aria-label="Marcas asociadas"
      className="relative bg-white border-y border-zinc-100 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />

      <div className="py-4 overflow-hidden">
        <div className="flex items-center animate-marquee-slow">
          <LogoRow />
          <LogoRow aria />
        </div>
      </div>
    </section>
  );
}
