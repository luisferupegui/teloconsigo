import "server-only";
import fs from "fs";
import path from "path";

// Precios "puesto en Colombia" — DETERMINISTA, nunca los calcula el modelo.
//
// Dos flujos:
//   A) Importación EE.UU.: (usdProducto / DIVISOR + fleteUS) × TRM
//   B) Local Colombia:     precioBase × (1 + margen) + fleteCOP

// ── A) IMPORTACIÓN EE.UU. ────────────────────────────────────────────────────

export type ShippingTier = "component" | "laptop" | "desktop";

export type ImportConfig = {
  divisor:  number;
  trm:      number;
  shipping: Record<ShippingTier, number>;
};

const CONFIG_PATH = path.join(process.cwd(), "data", "importacion-config.json");

const DEFAULTS: ImportConfig = {
  divisor:  0.7,
  trm:      3800,
  shipping: { component: 25, laptop: 60, desktop: 100 },
};

export function loadImportConfig(): ImportConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    return {
      divisor: Number(raw.divisor)  > 0 ? Number(raw.divisor)  : DEFAULTS.divisor,
      trm:     Number(raw.trm)      > 0 ? Number(raw.trm)      : DEFAULTS.trm,
      shipping: {
        component: Number(raw.shipping?.component) > 0 ? Number(raw.shipping.component) : DEFAULTS.shipping.component,
        laptop:    Number(raw.shipping?.laptop)    > 0 ? Number(raw.shipping.laptop)    : DEFAULTS.shipping.laptop,
        desktop:   Number(raw.shipping?.desktop)   > 0 ? Number(raw.shipping.desktop)   : DEFAULTS.shipping.desktop,
      },
    };
  } catch {
    return { ...DEFAULTS, shipping: { ...DEFAULTS.shipping } };
  }
}

export function saveImportConfig(cfg: Partial<ImportConfig>): void {
  const current = loadImportConfig();
  const next: ImportConfig = {
    divisor:  cfg.divisor  ?? current.divisor,
    trm:      cfg.trm      ?? current.trm,
    shipping: {
      component: cfg.shipping?.component ?? current.shipping.component,
      laptop:    cfg.shipping?.laptop    ?? current.shipping.laptop,
      desktop:   cfg.shipping?.desktop   ?? current.shipping.desktop,
    },
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), "utf-8");
}

export type Cotizacion = {
  usdProducto: number;
  usdEnvio:    number;
  usdTotal:    number;
  trm:         number;
  copEstimado: number;
};

/** Precio puesto en Colombia (COP) para producto importado desde EE.UU. */
export function cotizarImportacion(usdProducto: number, tier: ShippingTier = "component"): Cotizacion {
  const cfg = loadImportConfig();
  const usdEnvio = cfg.shipping[tier];
  const usdTotal = usdProducto / cfg.divisor + usdEnvio;
  return {
    usdProducto,
    usdEnvio,
    usdTotal:    Math.round(usdTotal * 100) / 100,
    trm:         cfg.trm,
    copEstimado: Math.round((usdTotal * cfg.trm) / 1000) * 1000,
  };
}

// ── B) DISPONIBILIDAD LOCAL COLOMBIA ─────────────────────────────────────────
//
// Márgenes y fletes locales según categoría de producto.
// Flete local (COP): producto pequeño $15.000 | GPU/portátil $60.000 | escritorio $80.000

export type LocalCategoria =
  | "tablet" | "portatil" | "all_in_one" | "equipo_corporativo"
  | "servidor" | "nas" | "tarjeta_grafica" | "procesador"
  | "accesorio" | "licencia" | "antivirus";

const LOCAL_PRICING: Record<LocalCategoria, { margen: number; flete: number }> = {
  tablet:             { margen: 0.15, flete:  15_000 },
  portatil:           { margen: 0.15, flete:  60_000 },
  all_in_one:         { margen: 0.20, flete:  80_000 },
  equipo_corporativo: { margen: 0.25, flete:  80_000 },
  servidor:           { margen: 0.20, flete:  80_000 },
  nas:                { margen: 0.25, flete:  60_000 },
  tarjeta_grafica:    { margen: 0.15, flete:  60_000 },
  procesador:         { margen: 0.15, flete:  15_000 },
  accesorio:          { margen: 0.20, flete:  15_000 },
  licencia:           { margen: 0.20, flete:       0 },
  antivirus:          { margen: 0.35, flete:       0 },
};

export type CotizacionLocal = {
  precioBase:  number;
  margen:      number;
  flete:       number;
  precioFinal: number;
};

/** Precio de venta en COP para producto conseguido localmente en Colombia. */
export function cotizarLocal(precioBase: number, categoria: LocalCategoria): CotizacionLocal {
  const { margen, flete } = LOCAL_PRICING[categoria] ?? LOCAL_PRICING.accesorio;
  return {
    precioBase,
    margen,
    flete,
    precioFinal: Math.round((precioBase * (1 + margen) + flete) / 1000) * 1000,
  };
}
