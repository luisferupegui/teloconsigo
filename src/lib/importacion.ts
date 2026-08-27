import "server-only";
import fs from "fs";
import path from "path";

// Precio de un producto IMPORTADO DE EE.UU., puesto en Colombia.
// DETERMINISTA: nunca lo calcula el modelo.
//
//   (usdProducto / DIVISOR + fleteUS) × TRM
//
// El precio de lo que se consigue EN COLOMBIA no se calcula aquí: sale del costo de
// la lista de proveedor por el margen de su categoría (`applyMargin`, en
// supplier-catalog.ts), que es el que se edita en Admin → Precios.

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
