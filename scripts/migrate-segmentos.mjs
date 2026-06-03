/**
 * Migración: añade `segmento` (las 9 categorías nuevas) y `publicado` a los
 * productos existentes en data/products-business.json.
 *
 * - `segmento`: se infiere best-effort desde usoCaso/categoria. El admin lo
 *   puede reajustar producto por producto.
 * - `publicado`: se pone en true para no cambiar la visibilidad actual.
 *
 * Idempotente: no pisa valores ya existentes. Uso: node scripts/migrate-segmentos.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "..", "data", "products-business.json");

const BY_USO = {
  "portatil-ejecutivo": "movilidad-premium",
  "portatil-oficina":   "productividad-oficina",
  "portatil-gaming":    "gaming-streaming",
  "pc-empresarial":     "productividad-oficina",
  "monitor":            "monitores",
  "tablet-empresarial": "movilidad-premium",
  "licencia":           "accesorios",
  "accesorio":          "accesorios",
  "servidor":           "redes-servidores",
  "nas":                "redes-servidores",
  "ups-regulador":      "redes-servidores",
};

const BY_CAT = {
  monitor:   "monitores",
  accesorio: "accesorios",
  licencia:  "accesorios",
  pc:        "productividad-oficina",
  tablet:    "movilidad-premium",
  portatil:  "productividad-oficina",
};

function inferSegmento(p) {
  return BY_USO[p.usoCaso] ?? BY_CAT[p.categoria] ?? "productividad-oficina";
}

const list = JSON.parse(readFileSync(FILE, "utf-8"));
let seg = 0, pub = 0;
for (const p of list) {
  if (p.segmento == null) { p.segmento = inferSegmento(p); seg++; }
  if (p.publicado == null) { p.publicado = true; pub++; }
}
writeFileSync(FILE, JSON.stringify(list, null, 2) + "\n", "utf-8");

const dist = {};
for (const p of list) dist[p.segmento] = (dist[p.segmento] || 0) + 1;
console.log(`Migrados ${list.length} productos · segmento asignado a ${seg} · publicado a ${pub}`);
console.log("Distribución por segmento:");
for (const [k, v] of Object.entries(dist).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(24)} ${v}`);
