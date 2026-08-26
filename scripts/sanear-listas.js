#!/usr/bin/env node
/**
 * scripts/sanear-listas.js
 *
 * Aplica sobre las listas de proveedor YA IMPORTADAS las mismas correcciones que hoy hacen
 * los lectores al importar. Sirve para poner al día un entorno cuyos datos se importaron
 * antes de esas correcciones — típicamente el volumen de producción, que conserva sus
 * propios archivos y no recibe los de `data-defaults`.
 *
 * Corrige dos cosas:
 *
 *   1. MONITORES MAL LEÍDOS. La primera fila de cada bloque del PDF de Janus arrastraba
 *      texto de la cabecera y salía con un tamaño de pantalla ajeno: equipos "+ Monitor
 *      Janus 45\"" que costaban MENOS que el mismo equipo con pantalla de 23.8". Una
 *      pantalla mayor no puede costar menos que una menor dentro de la misma
 *      configuración; cuando eso pasa, el tamaño está mal y la fila se descarta. El precio
 *      es real, pero la spec es inventada, y cotizar una pantalla que nadie va a entregar
 *      es peor que no tener esa fila.
 *
 *   2. MEMORIAS USB MAL CLASIFICADAS. La regla que clasifica por nombre exigía capacidades
 *      de 3-4 dígitos, así que "USB 128GB" caía en `almacenamiento` (margen 25%) y
 *      "USB 64GB" en `accesorios` (40%): el mismo producto con dos márgenes distintos.
 *      En el catálogo de la tienda las memorias flash son accesorios, así que ahí van.
 *
 * Es IDEMPOTENTE: pasarlo dos veces no cambia nada la segunda vez.
 *
 * NOTA: el panel admin tiene el mismo saneo como botón (Marketing → Listas PDF), que es la
 * vía cómoda en producción. Las reglas viven en src/lib/sanear-listas.ts y este script las
 * reimplementa en JS plano por una razón concreta: poder ejecutarse con "node" a secas,
 * sin compilar TypeScript, dentro del contenedor. Si cambias una regla, cámbiala en ambos.
 *
 * Uso:
 *   node scripts/sanear-listas.js              → solo informa, NO escribe
 *   node scripts/sanear-listas.js --aplicar    → escribe, con copia de seguridad previa
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const APLICAR = process.argv.includes("--aplicar");
const ARCHIVO = path.join(process.cwd(), "data", "supplier-lists.json");

const fmt = (n) => "$" + Number(n || 0).toLocaleString("es-CO");

// ── Regla 1: el tamaño del monitor no cuadra con el precio ────────────────────

const pulgadas = (p) => Number((p.specs?.monitor || "").match(/([\d.]+)"/)?.[1] ?? NaN);

function monitoresIncoherentes(productos) {
  const grupos = new Map();
  for (const p of productos) {
    const base = p.nombre.replace(/ \+ Monitor .*$/, "");
    if (base === p.nombre) continue; // el nombre no menciona monitor
    if (!grupos.has(base)) grupos.set(base, []);
    grupos.get(base).push(p);
  }

  const fuera = new Set();
  for (const grupo of grupos.values()) {
    const conMonitor = grupo.filter((p) => Number.isFinite(pulgadas(p)));
    for (const p of conMonitor) {
      // ¿Existe una pantalla MÁS PEQUEÑA que cueste MÁS? Entonces esta está mal leída.
      if (conMonitor.some((q) => pulgadas(q) < pulgadas(p) && q.precio_costo > p.precio_costo)) {
        fuera.add(p);
      }
    }
  }
  return fuera;
}

// ── Regla 2: una memoria USB es un accesorio ──────────────────────────────────

const ES_MEMORIA_USB =
  /^(?=.*\b(usb|pendrive|flash\s?drive)\b)(?=.*\b\d{1,4}\s?[gt]b\b)(?!.*\b(ssd|nvme|hdd|m\.?2|disco|caja|adaptador|hub|cable|teclado|mouse|c[aá]mara|wifi|bluetooth)\b)/i;

// ── Ejecución ─────────────────────────────────────────────────────────────────

if (!fs.existsSync(ARCHIVO)) {
  console.error(`[sanear] No encuentro ${ARCHIVO}. Ejecútalo desde la raíz del proyecto.`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(ARCHIVO, "utf-8"));
const listas = Array.isArray(raw) ? raw : raw.listas;
if (!Array.isArray(listas)) {
  console.error("[sanear] El archivo no tiene el formato esperado (ni array ni { listas }).");
  process.exit(1);
}

let descartados = 0;
let recategorizados = 0;
const ejemplos = [];

for (const lista of listas) {
  if (!Array.isArray(lista.productos)) continue;

  // 1) Monitores incoherentes
  const fuera = monitoresIncoherentes(lista.productos);
  if (fuera.size > 0) {
    for (const p of fuera) {
      if (ejemplos.length < 5) ejemplos.push(`  ✗ ${p.nombre} — ${fmt(p.precio_costo)}`);
    }
    lista.productos = lista.productos.filter((p) => !fuera.has(p));
    descartados += fuera.size;
    console.log(`[sanear] ${lista.nombre}: ${fuera.size} equipo(s) con monitor mal leído`);
  }

  // 2) Memorias USB
  for (const p of lista.productos) {
    if (p.categoria === "accesorios") continue;
    if (!ES_MEMORIA_USB.test(p.nombre)) continue;
    console.log(`[sanear] ${p.categoria} → accesorios: ${p.nombre}`);
    p.categoria = "accesorios";
    recategorizados++;
  }
}

console.log("");
if (ejemplos.length > 0) {
  console.log("Ejemplos de lo descartado:");
  console.log(ejemplos.join("\n"));
  console.log("");
}

const total = descartados + recategorizados;
console.log(`Resumen: ${descartados} equipo(s) descartado(s), ${recategorizados} producto(s) recategorizado(s).`);

if (total === 0) {
  console.log("[sanear] Nada que corregir: los datos ya están al día.");
  process.exit(0);
}

if (!APLICAR) {
  console.log("\n[sanear] Simulación: NO se escribió nada.");
  console.log("[sanear] Para aplicarlo:  node scripts/sanear-listas.js --aplicar");
  process.exit(0);
}

const respaldo = `${ARCHIVO}.antes-de-sanear`;
fs.copyFileSync(ARCHIVO, respaldo);
fs.writeFileSync(ARCHIVO, JSON.stringify(raw, null, 2), "utf-8");
console.log(`\n[sanear] ✓ Aplicado. Copia previa en ${path.basename(respaldo)}`);
