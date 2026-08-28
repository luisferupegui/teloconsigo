import "server-only";
import { lineasDePdf, camposDeBloque, partirEnBloques, precioDeTexto, campo, type Campo } from "./bloques";
import type { ParsedProduct } from "@/lib/parse-supplier-doc";
import type { Descartado, ResultadoParser } from "./tipos";

// ─── Compumax ────────────────────────────────────────────────────────────────
//
// Cada producto es una ficha que empieza por un código de 10-12 dígitos y termina
// en "Precio total: $X":
//
//     10479000192
//     Procesador: Corei5 10400T
//     Memoria:   SODIMM 8GB BUS DE
//     2666 (2*4GB)
//     Disco Duro: SSD512GB  PCIE M.2
//     Sistema Operativo:  Linux
//     Monitor: 23.8" Compumax  120HZ
//     FHD
//     Periféricos: Teclado y mouse
//     alámbricos
//     Precio total: $ 1.732.500
//
// La lista NO trae nombre de producto: el producto ES la ficha. El nombre se
// COMPONE de sus propias specs, y eso importa más de lo que parece — de él
// dependen la búsqueda de Andrea y la categoría de margen, que se deduce
// leyendo el nombre. Un producto sin nombre entra al catálogo invisible.

const CODIGO = /^\d{10,12}$/;

/** Marca del procesador, para el nombre. */
function cpuCorto(procesador: string): string {
  const p = procesador.replace(/\s+/g, " ").trim();
  const ryzen = p.match(/ryzen\s*(\d)\s*([0-9a-z]+)/i);
  if (ryzen) return `Ryzen ${ryzen[1]} ${ryzen[2].toUpperCase()}`;
  const core = p.match(/core\s*i(\d)[\s-]*([0-9a-z]+)/i);
  if (core) return `Core i${core[1]}-${core[2].toUpperCase()}`;
  return p.split(/\s{2,}/)[0].slice(0, 28);
}

/** "SODIMM 8GB BUS DE 2666 (2*4GB)" → "8GB" */
const soloCapacidad = (t: string | undefined, re: RegExp) => t?.match(re)?.[0]?.toUpperCase();

/** Nombre legible a partir de las specs, que es lo único que hay. */
function componerNombre(campos: Campo[]): string {
  const cpu     = campo(campos, "procesador");
  const ram     = soloCapacidad(campo(campos, "memoria"), /\d+\s?GB/i);
  const disco   = soloCapacidad(campo(campos, "disco duro", "almacenamiento"), /\d+\s?(?:GB|TB)/i);
  const monitor = campo(campos, "monitor", "pantalla");
  const pulgadas = monitor?.match(/\d{2}(?:[.,]\d)?\s?"/)?.[0];

  const partes = [
    "Compumax",
    cpu ? cpuCorto(cpu) : null,
    ram ? ram.replace(/\s/g, "") : null,
    disco ? disco.replace(/\s/g, "") : null,
    pulgadas ? `+ Monitor ${pulgadas}` : null,
  ].filter(Boolean);

  return partes.join(" ");
}

/** Categoría según lo que la ficha describe. Compumax vende sobre todo equipos
 *  completos; se distingue el todo-en-uno y el portátil por sus propias specs. */
function categoriaDe(campos: Campo[], nombre: string): string {
  const texto = `${nombre} ${campos.map((c) => `${c.etiqueta} ${c.valor}`).join(" ")}`.toLowerCase();
  if (/all.?in.?one|todo en uno|\baio\b/.test(texto)) return "all-in-one";
  if (/port[aá]til|laptop|notebook|bater[ií]a/.test(texto)) return "portatil";
  if (/\b(rtx|gtx|radeon rx)\b/.test(texto)) return "escritorio-alto-rendimiento";
  return "escritorio";
}

export async function parseCompumax(buffer: Buffer): Promise<ResultadoParser> {
  const lineas = await lineasDePdf(buffer);
  const bloques = partirEnBloques(lineas, (l) => CODIGO.test(l));
  const productos: ParsedProduct[] = [];
  const descartados: Descartado[] = [];

  for (const bloque of bloques) {
    const referencia = bloque[0];
    // El bloque termina en su precio: lo que venga después ya es del siguiente
    // producto o es cabecera de sección ("Equipos de Escritorio").
    const fin = bloque.findIndex((l) => /precio\s*total/i.test(l));
    const cuerpo = fin === -1 ? bloque.slice(1) : bloque.slice(1, fin + 1);
    const { campos } = camposDeBloque(cuerpo);

    // Un código suelto, sin ficha debajo, es una VARIANTE: el catálogo lista
    // varias referencias que comparten una misma descripción. No se puede
    // describir como producto, pero tampoco se tira a la basura sin decirlo.
    if (campos.length === 0) {
      descartados.push({ referencia, motivo: "Referencia sin ficha (variante de la siguiente)" });
      continue;
    }
    if (!campo(campos, "procesador")) {
      descartados.push({ referencia, motivo: "Ficha sin procesador: no parece un equipo" });
      continue;
    }

    // El precio de algunos equipos gamer está dentro de una imagen y no existe
    // en el texto del PDF. El producto SÍ existe: sale con precio 0 y el motor
    // de confianza lo manda a revisión para que se complete a mano.
    const precio = fin === -1 ? null : precioDeTexto(bloque[fin]);
    const nombre = componerNombre(campos);

    const specs: Record<string, string> = {};
    for (const c of campos) {
      if (/precio/.test(c.etiqueta) || !c.valor) continue;
      specs[c.etiqueta.replace(/\s+/g, "_")] = c.valor;
    }

    productos.push({
      nombre,
      marca: "Compumax",
      categoria: categoriaDe(campos, nombre),
      precio_costo: precio ?? 0,
      referencia,
      specs: Object.keys(specs).length ? specs : undefined,
    });
  }

  return { productos, descartados };
}
