/**
 * Migración: traslada las cards hardcodeadas del home (FEATURED_REFS y
 * ACCESORIOS_REFS de src/app/page.tsx) a flags reales en products-business.json,
 * para que el home se vea idéntico tras cablearlo a los flags del admin.
 *
 * - FEATURED_REFS   → destacado = true   ("Productos Destacados")
 * - ACCESORIOS_REFS → enAccesorios = true ("Accesorios & Esenciales")
 * - ambos           → publicado = true   (deben verse en la web)
 *
 * Idempotente. Uso: node scripts/migrate-home-flags.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "..", "data", "products-business.json");

const FEATURED_REFS = [
  "21M30053LM", "PP70R", "P3406CKANZ0441X", "YJ9PX",
  "12SD002ALS", "LS27F320GANX", "KLQ-00219", "ZAFM0226CO",
];
const ACCESORIOS_REFS = [
  "1115-KDT128", "PB-ADP10K-ADATA", "6095-MV-JAL", "6416-MK235",
  "HUB-USBC-7EN1", "5035-AHD330-1T", "5004-KXS1000-1T", "22U401A-B",
];

const featured = new Set(FEATURED_REFS);
const accesorios = new Set(ACCESORIOS_REFS);

const list = JSON.parse(readFileSync(FILE, "utf-8"));
let dest = 0, acc = 0;
for (const p of list) {
  const ref = p.referencia ?? p.slug ?? p.id;
  if (featured.has(ref))   { if (!p.destacado)    { p.destacado = true;    dest++; } p.publicado = true; }
  if (accesorios.has(ref)) { if (!p.enAccesorios) { p.enAccesorios = true; acc++;  } p.publicado = true; }
}
writeFileSync(FILE, JSON.stringify(list, null, 2) + "\n", "utf-8");

const totalDest = list.filter((p) => p.destacado).length;
const totalAcc  = list.filter((p) => p.enAccesorios).length;
const foundF = FEATURED_REFS.filter((r) => list.some((p) => (p.referencia ?? p.slug ?? p.id) === r)).length;
const foundA = ACCESORIOS_REFS.filter((r) => list.some((p) => (p.referencia ?? p.slug ?? p.id) === r)).length;
console.log(`Destacado nuevos: ${dest} · Accesorios nuevos: ${acc}`);
console.log(`Totales → Destacados: ${totalDest} · Accesorios & Esenciales: ${totalAcc}`);
console.log(`Refs encontrados en datos → featured: ${foundF}/8 · accesorios: ${foundA}/8`);
