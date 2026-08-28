import "server-only";
import { lineasDePdf, camposDeBloque, partirEnBloques, precioDeTexto, campo, type Campo } from "./bloques";
import type { ParsedProduct } from "@/lib/parse-supplier-doc";
import type { Descartado, ResultadoParser } from "./tipos";

// ─── Compuoriente ────────────────────────────────────────────────────────────
//
// Cada equipo empieza por la línea de familia ("EQUIPO POWER GROUP"), sigue con
// su referencia y sus campos etiquetados, y cierra con el PRECIO y el MONITOR —
// en ese orden, después de las specs:
//
//     EQUIPO POWER GROUP
//     G105162HST
//     Caja ATX Power Group: G93
//     Procesador:
//     INTEL CORE I5-10400T  2,0GHZ      ← el valor va en la línea siguiente
//     Board (2 opc): MSI PRO H510M PLUS II /
//     ASUS PRIME H510M-F
//     Memoria: HIKSEMI ARMOR
//     16GB   DDR4 3200MHZ
//     Almacenamiento (2 opc): SATA / HIKSEMI  512GB
//     OS: Linux
//     $1.599.000                         ← precio de ESTE equipo
//     Monitor: ASUS
//     22" VP229HF                        ← monitor de ESTE equipo
//
// Que el precio venga al final y no al principio es la trampa de esta lista: un
// parser que asocie "el precio más cercano hacia arriba" le pone a cada equipo
// el precio del anterior. Aquí el bloque se cierra en la familia siguiente, así
// que el precio que contiene es el suyo.

const FAMILIA = /^EQUIPO\s+[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9 .\-]{2,40}$/;
/** Referencia: código alfanumérico corto, en mayúsculas, sin espacios. */
const REFERENCIA = /^[A-Z0-9][A-Z0-9-]{5,20}$/;

function cpuCorto(procesador: string): string {
  const p = procesador.replace(/\s+/g, " ").trim();
  const ryzen = p.match(/ryzen\s*(\d)\s*([0-9a-z]+)/i);
  if (ryzen) return `Ryzen ${ryzen[1]} ${ryzen[2].toUpperCase()}`;
  const core = p.match(/core\s*i(\d)[\s-]*([0-9a-z]+)/i);
  if (core) return `Core i${core[1]}-${core[2].toUpperCase()}`;
  return p.split(/\s{2,}/)[0].slice(0, 28);
}

const soloCapacidad = (t: string | undefined, re: RegExp) => t?.match(re)?.[0]?.toUpperCase();

function componerNombre(familia: string, campos: Campo[]): string {
  const cpu     = campo(campos, "procesador");
  const ram     = soloCapacidad(campo(campos, "memoria"), /\d+\s?GB/i);
  const disco   = soloCapacidad(campo(campos, "almacenamiento", "disco"), /\d+\s?(?:GB|TB)/i);
  const monitor = campo(campos, "monitor");
  const pulgadas = monitor?.match(/\d{2}(?:[.,]\d)?\s?[”"]/)?.[0]?.replace("”", '"');

  return [
    familia.replace(/^EQUIPO\s+/i, "").trim() || "Compuoriente",
    cpu ? cpuCorto(cpu) : null,
    ram ? ram.replace(/\s/g, "") : null,
    disco ? disco.replace(/\s/g, "") : null,
    pulgadas ? `+ Monitor ${pulgadas}` : null,
  ].filter(Boolean).join(" ");
}

function categoriaDe(campos: Campo[], nombre: string): string {
  const texto = `${nombre} ${campos.map((c) => `${c.etiqueta} ${c.valor}`).join(" ")}`.toLowerCase();
  if (/all.?in.?one|todo en uno|\baio\b/.test(texto)) return "all-in-one";
  if (/port[aá]til|laptop|notebook/.test(texto)) return "portatil";
  if (/\b(rtx|gtx|radeon rx)\b/.test(texto) || campo(campos, "tvideo", "t.video")) return "escritorio-alto-rendimiento";
  return "escritorio";
}

export async function parseCompuoriente(buffer: Buffer): Promise<ResultadoParser> {
  const lineas = await lineasDePdf(buffer);
  const bloques = partirEnBloques(lineas, (l) => FAMILIA.test(l));
  const productos: ParsedProduct[] = [];
  const descartados: Descartado[] = [];

  for (const bloque of bloques) {
    const familia = bloque[0];
    // La referencia es la primera línea suelta tras la familia, antes de los campos.
    const referencia = bloque.slice(1, 4).find((l) => REFERENCIA.test(l)) ?? "";

    const { campos } = camposDeBloque(bloque.slice(1));
    // El precio del bloque: la primera cifra con $ que aparezca dentro de él.
    // Va DESPUÉS de las specs, así que el bloque tiene que cerrarse en la
    // familia siguiente; si se cerrara antes, cada equipo heredaría el precio
    // del anterior.
    const lineaPrecio = bloque.find((l) => precioDeTexto(l) !== null);
    const precio = lineaPrecio ? precioDeTexto(lineaPrecio) : null;

    if (!campo(campos, "procesador")) {
      descartados.push({
        referencia: referencia || familia,
        motivo: precio ? "Referencia con precio pero sin ficha (variante)" : "Bloque sin procesador",
      });
      continue;
    }

    const nombre = componerNombre(familia, campos);

    const specs: Record<string, string> = {};
    for (const c of campos) {
      if (!c.valor || /^nota$/.test(c.etiqueta)) continue;
      specs[c.etiqueta.replace(/\s+/g, "_")] = c.valor;
    }

    productos.push({
      nombre,
      marca: "Compuoriente",
      categoria: categoriaDe(campos, nombre),
      precio_costo: precio ?? 0,
      referencia,
      specs: Object.keys(specs).length ? specs : undefined,
    });
  }

  return { productos, descartados };
}
