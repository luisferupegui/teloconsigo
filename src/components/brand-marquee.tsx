"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

// ─── Dimensiones ──────────────────────────────────────────────────────────────
// Sistema de 3 alturas según aspect ratio (mejor balance visual):
//   - Compacto  (ratio ≤ 2.5):       H = 30 px  ← base (+20 %)
//   - Wordmark  (ratio 2.5 – 4.0):   H = 27 px  ← −10 %
//   - Wordmark XL (ratio > 4.0):     H = 24 px  ← −20 %   (los MÁS grandes)
const H            = 30;
const H_WORDMARK   = Math.round(H * 0.9); // 27
const H_WORDMARK_XL = Math.round(H * 0.8); // 24
// Tope de ancho para que los wordmarks ultra-anchos (NETGEAR, LINKSYS,
// Sennheiser, Deepcool) no dominen el rotador.
const MAX_LOGO_W   = 140;

// ─── 53 logos HD con fondo transparente real ──────────────────────────────────
// Carpeta: public/brands/v2-clean/  (procesados con scripts/process-brand-logos.mjs)
// `r` = aspect ratio (W/H) medido del archivo. Si r > 2.5 → wordmark → H=27.
type Logo = { src: string; alt: string; r: number };

const LOGOS: Logo[] = [
  { src: "/brands/v2-clean/01_ASUS_logo.png",         alt: "ASUS",          r: 4.64 },
  { src: "/brands/v2-clean/02_MSI_logo.png",          alt: "MSI",           r: 2.88 },
  { src: "/brands/v2-clean/03_GIGABYTE_logo.png",     alt: "GIGABYTE",      r: 1.10 },
  { src: "/brands/v2-clean/04_ASRock_logo.png",       alt: "ASRock",        r: 5.66 },
  { src: "/brands/v2-clean/05_NZXT_logo.png",         alt: "NZXT",          r: 3.89 },
  { src: "/brands/v2-clean/06_Corsair_logo.png",      alt: "CORSAIR",       r: 1.45 },
  { src: "/brands/v2-clean/07_GSKILL_logo.png",       alt: "G.SKILL",       r: 2.05 },
  { src: "/brands/v2-clean/08_Kingston_logo.png",     alt: "Kingston",      r: 4.01 },
  { src: "/brands/v2-clean/09_Crucial_logo.png",      alt: "Crucial",       r: 2.94 },
  { src: "/brands/v2-clean/10_TeamGroup_logo.png",    alt: "TeamGroup",     r: 0.81 },
  { src: "/brands/v2-clean/11_ZOTAC_logo.png",        alt: "ZOTAC",         r: 5.36 },
  { src: "/brands/v2-clean/12_Sapphire_logo.png",     alt: "SAPPHIRE",      r: 9.00 },
  { src: "/brands/v2-clean/13_CoolerMaster_logo.png", alt: "Cooler Master", r: 0.79 },
  { src: "/brands/v2-clean/14_EVGA_logo.png",         alt: "EVGA",          r: 4.74 },
  { src: "/brands/v2-clean/15_Seasonic_logo.png",     alt: "Seasonic",      r: 4.40 },
  { src: "/brands/v2-clean/16_Thermaltake_logo.png",  alt: "Thermaltake",   r: 1.41 },
  { src: "/brands/v2-clean/17_AOC_logo.png",          alt: "AOC",           r: 3.17 },
  { src: "/brands/v2-clean/18_LG_logo.png",           alt: "LG",            r: 2.20 },
  { src: "/brands/v2-clean/19_Samsung_logo.png",      alt: "SAMSUNG",       r: 2.90 },
  { src: "/brands/v2-clean/20_ROG_logo.png",          alt: "ROG",           r: 1.46 },
  { src: "/brands/v2-clean/21_Lenovo_logo.png",       alt: "Lenovo",        r: 3.10 },
  { src: "/brands/v2-clean/22_HP_logo.png",           alt: "HP",            r: 1.04 },
  { src: "/brands/v2-clean/23_Dell_logo.png",         alt: "DELL",          r: 1.00 },
  { src: "/brands/v2-clean/24_Arctic_logo.png",       alt: "ARCTIC",        r: 1.05 },
  { src: "/brands/v2-clean/25_Deepcool_logo.png",     alt: "DEEPCOOL",      r: 10.49 },
  { src: "/brands/v2-clean/26_Alienware_logo.png",    alt: "ALIENWARE",     r: 1.35 },
  { src: "/brands/v2-clean/27_TPLink_logo.png",       alt: "TP-Link",       r: 3.84 },
  { src: "/brands/v2-clean/28_NETGEAR_logo.png",      alt: "NETGEAR",       r: 7.11 },
  { src: "/brands/v2-clean/29_Linksys_logo.png",      alt: "LINKSYS",       r: 6.92 },
  { src: "/brands/v2-clean/30_DLink_logo.png",        alt: "D-Link",        r: 4.16 },
  { src: "/brands/v2-clean/31_Logitech_logo.png",     alt: "Logitech",      r: 0.90 },
  { src: "/brands/v2-clean/32_Razer_logo.png",        alt: "RAZER",         r: 0.95 },
  { src: "/brands/v2-clean/33_SteelSeries_logo.png",  alt: "SteelSeries",   r: 1.94 },
  { src: "/brands/v2-clean/34_HyperX_logo.png",       alt: "HyperX",        r: 4.30 },
  { src: "/brands/v2-clean/35_Elgato_logo.png",       alt: "ELGATO",        r: 3.37 },
  { src: "/brands/v2-clean/36_Blue_logo.png",         alt: "Blue",          r: 1.04 },
  { src: "/brands/v2-clean/37_RODE_logo.png",         alt: "RØDE",          r: 2.15 },
  { src: "/brands/v2-clean/38_Sennheiser_logo.png",   alt: "Sennheiser",    r: 8.76 },
  { src: "/brands/v2-clean/39_WD_logo.png",           alt: "WD",            r: 1.75 },
  { src: "/brands/v2-clean/40_Seagate_logo.png",      alt: "SEAGATE",       r: 7.01 },
  { src: "/brands/v2-clean/41_ADATA_logo.png",        alt: "ADATA",         r: 3.72 },
  { src: "/brands/v2-clean/42_SanDisk_logo.png",      alt: "SanDisk",       r: 3.13 },
  { src: "/brands/v2-clean/43_APC_logo.png",          alt: "APC",           r: 1.34 },
  { src: "/brands/v2-clean/44_Belkin_logo.png",       alt: "BELKIN",        r: 4.70 },
  { src: "/brands/v2-clean/45_CyberPower_logo.png",   alt: "CyberPower",    r: 7.81 },
  { src: "/brands/v2-clean/46_UGREEN_logo.png",       alt: "UGREEN",        r: 1.43 },
  { src: "/brands/v2-clean/47_ANKER_logo.png",        alt: "ANKER",         r: 4.91 },
  { src: "/brands/v2-clean/48_Intel_logo.png",        alt: "Intel",         r: 1.49 },
  { src: "/brands/v2-clean/49_AMD_logo.png",          alt: "AMD",           r: 4.29 },
  { src: "/brands/v2-clean/50_Epson_logo.png",        alt: "EPSON",         r: 4.36 },
  { src: "/brands/v2-clean/51_Canon_logo.png",        alt: "Canon",         r: 5.33 },
  { src: "/brands/v2-clean/52_Brother_logo.png",      alt: "brother",       r: 4.89 },
  { src: "/brands/v2-clean/53_Kyocera_logo.png",      alt: "KYOCERA",       r: 6.41 },
];

// ─── Fila (se duplica para loop continuo) ─────────────────────────────────────
function LogoRow({ aria }: { aria?: boolean }) {
  return (
    <>
      {LOGOS.map((logo, i) => {
        // Altura base por tier de aspect ratio
        const baseH =
          logo.r > 4.0 ? H_WORDMARK_XL :   // 24 px
          logo.r > 2.5 ? H_WORDMARK    :   // 27 px
                         H;                // 30 px
        // Para logos ultra-anchos (r > MAX_LOGO_W/baseH), la altura se reduce
        // proporcionalmente para que la imagen renderice a su aspect ratio natural
        // sin letterboxing dentro del bounding box.
        const effectiveH = Math.min(baseH, Math.floor(MAX_LOGO_W / logo.r));
        return (
          <div
            key={i}
            aria-hidden={aria || undefined}
            title={logo.alt}
            // Usamos PADDING (px-5) y no margin para que el loop sea matemáticamente
            // exacto: --copy-w calculado con offsetWidth cae justo al inicio de la
            // copia 2 sin saltos.
            className="group shrink-0 px-5 flex items-center cursor-default"
            style={{ height: `${H}px` }}
          >
            <Image
              src={logo.src}
              alt={aria ? "" : logo.alt}
              width={MAX_LOGO_W * 4}
              height={H * 4}
              unoptimized
              loading="eager"
              style={{
                height: `${effectiveH}px`,
                width:  "auto",
              }}
              className="select-none transition-transform duration-300
                         group-hover:scale-125"
            />
          </div>
        );
      })}
    </>
  );
}

// ─── Sección del marquee ──────────────────────────────────────────────────────
export function BrandMarquee() {
  const trackRef = useRef<HTMLDivElement>(null);

  // Cálculo EXACTO del ancho de una copia → translateX en píxeles puros.
  // Esto evita los 1-2 px de discrepancia entre scrollWidth/2 y la suma
  // real de slots, que causaba un mini-salto al cerrar el loop.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const setExactWidth = () => {
      const slots = Array.from(track.children) as HTMLElement[];
      if (slots.length === 0) return;
      const half = slots.length / 2;
      let copyW = 0;
      for (let i = 0; i < half; i++) copyW += slots[i].offsetWidth;
      track.style.setProperty("--copy-w", `${copyW}px`);
    };

    setExactWidth();

    // Re-medir cuando las imágenes terminen de cargar (por si hay layout shift)
    const imgs = track.querySelectorAll("img");
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", setExactWidth, { once: true });
    });

    // Re-medir si la ventana cambia de tamaño
    window.addEventListener("resize", setExactWidth);
    return () => window.removeEventListener("resize", setExactWidth);
  }, []);

  return (
    <section
      aria-label="Marcas asociadas"
      className="relative bg-white border-y border-zinc-100 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />

      <div className="py-5 overflow-hidden">
        <div
          ref={trackRef}
          className="flex items-center animate-marquee-exact will-change-transform"
        >
          <LogoRow />
          <LogoRow aria />
        </div>
      </div>
    </section>
  );
}
