// Migración puntual: promueve de "almacenamiento" a "portatil" los productos que
// en realidad son portátiles (el clasificador viejo los metía en almacenamiento por
// el "512GB"/"1TB" del nombre). Detección IDÉNTICA al importador corregido
// (parse-supplier-doc.ts): palabra explícita, o CPU + PANTALLA de 11–17".
//
// Uso:  node scripts/fix-laptop-categoria.mjs           (dry-run: solo reporta)
//       node scripts/fix-laptop-categoria.mjs --apply   (aplica + backup .bak)
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "data", "supplier-lists.json");
const APPLY = process.argv.includes("--apply");

const LAPTOP_WORD = /(port[aá]til|laptop|notebook|ultrabook)/i;
const LAPTOP_CPU_SCREEN =
  /^(?=.*\b(ryzen|core\s?i[3579]|core\s?ultra|celeron|pentium|athlon|i[3579]-\d{3,4}[a-z])\b)(?=.*(pantalla\s*1[0-7]\b|\b1[0-7][.,]\d\s*("|''|pulg)))/i;
const esLaptop = (n) => LAPTOP_WORD.test(n) || LAPTOP_CPU_SCREEN.test(n);

const raw = readFileSync(FILE, "utf-8");
const lists = JSON.parse(raw);

const cambios = [];
for (const l of lists) {
  for (const p of l.productos ?? []) {
    if (p.categoria !== "portatil" && esLaptop(p.nombre)) {
      cambios.push({ lista: l.nombre, nombre: p.nombre, de: p.categoria });
      if (APPLY) p.categoria = "portatil";
    }
  }
}

console.log(`${cambios.length} producto(s) detectados como portátil mal clasificados en "almacenamiento":\n`);
for (const c of cambios.slice(0, 60)) console.log(` - (${c.de}) ${c.nombre.slice(0, 90)}`);
if (cambios.length > 60) console.log(` ... y ${cambios.length - 60} más`);

if (APPLY && cambios.length > 0) {
  writeFileSync(FILE + ".prelaptopfix.bak", raw, "utf-8");
  writeFileSync(FILE, JSON.stringify(lists, null, 2), "utf-8");
  console.log(`\n✅ Aplicado: ${cambios.length} reclasificados a "portatil". Backup en supplier-lists.json.prelaptopfix.bak`);
} else if (!APPLY) {
  console.log(`\n(dry-run — nada escrito. Corre con --apply para aplicar.)`);
}
