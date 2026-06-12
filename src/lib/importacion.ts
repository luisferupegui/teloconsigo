import "server-only";

// Precios "puesto en Colombia" — DETERMINISTA, nunca los calcula el modelo.
//
// Dos flujos:
//   A) Importación EE.UU.: (usdProducto / 0.7 + fleteUS) × TRM
//   B) Local Colombia:     precioBase × (1 + margen) + fleteCOP

// ── A) IMPORTACIÓN EE.UU. ────────────────────────────────────────────────────

const DIVISOR = 0.7;
const TRM = 3800; // fijo por ahora; luego se conecta a tasa en vivo

export type ShippingTier = "component" | "laptop" | "desktop";

const SHIPPING_USD: Record<ShippingTier, number> = {
  component: 25,  // GPU, RAM, SSD, CPU, accesorios, periféricos, monitores ≤27"
  laptop:    60,  // portátiles, notebooks, mini PCs
  desktop:  100,  // torres, all-in-one, workstations
};

export type Cotizacion = {
  usdProducto: number;
  usdEnvio:    number;
  usdTotal:    number;
  trm:         number;
  copEstimado: number;
};

/** Precio puesto en Colombia (COP) para producto importado desde EE.UU. */
export function cotizarImportacion(usdProducto: number, tier: ShippingTier = "component"): Cotizacion {
  const usdEnvio = SHIPPING_USD[tier];
  const usdTotal = usdProducto / DIVISOR + usdEnvio;
  return {
    usdProducto,
    usdEnvio,
    usdTotal:    Math.round(usdTotal * 100) / 100,
    trm:         TRM,
    copEstimado: Math.round((usdTotal * TRM) / 1000) * 1000,
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
