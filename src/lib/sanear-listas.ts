import "server-only";
import type { SupplierList, SupplierProduct } from "./supplier-catalog";
import { corregirCategoria, specsDelNombre } from "./parse-supplier-doc";

// ─── Saneo de listas ya importadas ────────────────────────────────────────────
//
// Aplica sobre listas YA IMPORTADAS las mismas correcciones que hoy hacen los lectores al
// importar. Sirve para poner al día un entorno cuyos datos entraron antes de esas
// correcciones — típicamente el volumen de producción, que conserva sus propios archivos
// y no recibe los de `data-defaults`.
//
// Vive aquí, y no dentro del script de consola, porque hay DOS formas de ejecutarlo: el
// botón del panel y `scripts/sanear-listas.js`. Con la lógica en un solo sitio no pueden
// desincronizarse y dar resultados distintos.

// Las reglas del IMPORTADOR se reutilizan tal cual. El saneo no es una lista aparte de
// arreglos: es aplicar a lo ya importado exactamente lo que hoy se aplicaría al entrar,
// que es lo que evita que las dos se separen con el tiempo.

export type Hallazgo = {
  motivo: "monitor" | "categoria" | "specs";
  nombre: string;
  detalle: string;
};

export type Diagnostico = {
  descartados: Hallazgo[];
  recategorizados: Hallazgo[];
};

// ── Regla 1: el tamaño del monitor no cuadra con el precio ────────────────────
//
// La primera fila de cada bloque del PDF de Janus arrastraba texto de la cabecera y salía
// con un tamaño de pantalla ajeno: equipos "+ Monitor Janus 45"" que costaban MENOS que el
// mismo equipo con pantalla de 23.8". Dentro de una configuración, una pantalla mayor no
// puede costar menos que una menor; cuando eso pasa, el tamaño está mal leído. El precio es
// real pero la spec es inventada, y cotizar una pantalla que nadie va a entregar es peor
// que no tener esa fila.

const pulgadas = (p: SupplierProduct): number =>
  Number((p.specs?.monitor ?? "").match(/([\d.]+)"/)?.[1] ?? NaN);

function monitoresIncoherentes(productos: SupplierProduct[]): Set<SupplierProduct> {
  const grupos = new Map<string, SupplierProduct[]>();
  for (const p of productos) {
    const base = p.nombre.replace(/ \+ Monitor .*$/, "");
    if (base === p.nombre) continue; // el nombre no menciona monitor
    if (!grupos.has(base)) grupos.set(base, []);
    grupos.get(base)!.push(p);
  }

  const fuera = new Set<SupplierProduct>();
  for (const grupo of grupos.values()) {
    const conMonitor = grupo.filter((p) => Number.isFinite(pulgadas(p)));
    for (const p of conMonitor) {
      const menorYMasCaro = conMonitor.some(
        (q) => pulgadas(q) < pulgadas(p) && q.precio_costo > p.precio_costo,
      );
      if (menorYMasCaro) fuera.add(p);
    }
  }
  return fuera;
}

// ── Regla 2: una memoria USB es un accesorio ─────────────────────────────────
//
// La regla que clasifica por nombre exigía capacidades de 3-4 dígitos, así que "USB 128GB"
// caía en `almacenamiento` (margen 25%) y "USB 64GB" en `accesorios` (40%): el mismo
// producto con dos márgenes distintos. En el catálogo de la tienda las memorias flash son
// accesorios, así que ahí van.

const ES_MEMORIA_USB =
  /^(?=.*\b(usb|pendrive|flash\s?drive)\b)(?=.*\b\d{1,4}\s?[gt]b\b)(?!.*\b(ssd|nvme|hdd|m\.?2|disco|caja|adaptador|hub|cable|teclado|mouse|c[aá]mara|wifi|bluetooth)\b)/i;

// ── Diagnóstico y aplicación ─────────────────────────────────────────────────

const fmt = (n: number) => "$" + Number(n || 0).toLocaleString("es-CO");

/** Qué hay que corregir. NO modifica nada: es lo que alimenta la vista previa del panel. */
export function diagnosticar(listas: SupplierList[]): Diagnostico {
  const descartados: Hallazgo[] = [];
  const recategorizados: Hallazgo[] = [];

  for (const lista of listas) {
    if (!Array.isArray(lista.productos)) continue;

    for (const p of monitoresIncoherentes(lista.productos)) {
      descartados.push({
        motivo: "monitor",
        nombre: p.nombre,
        detalle: `${fmt(p.precio_costo)} — el tamaño de pantalla no cuadra con el precio`,
      });
    }

    for (const p of lista.productos) {
      // Categoría: se pasa por las MISMAS reglas del importador (memoria USB → accesorio,
      // equipo completo archivado como pieza → escritorio, gabinete vacío → accesorio).
      const corregida = categoriaCorrecta(p);
      if (corregida !== p.categoria) {
        recategorizados.push({
          motivo: "categoria",
          nombre: p.nombre,
          detalle: `${p.categoria} → ${corregida}`,
        });
        continue;
      }

      // Specs que el nombre declara y no están guardadas. No cambian el producto: lo
      // completan, y evitan que el completador por web gaste una consulta en un dato que
      // ya estaba escrito.
      const nuevas = specsNuevas(p);
      if (nuevas.length > 0) {
        recategorizados.push({
          motivo: "specs",
          nombre: p.nombre,
          detalle: `añade ${nuevas.join(", ")}`,
        });
      }
    }
  }

  return { descartados, recategorizados };
}

/** La categoría que le correspondería a este producto si se importara hoy. */
function categoriaCorrecta(p: SupplierProduct): string {
  // La regla de memoria USB va primero porque es más específica que las del importador.
  if (p.categoria !== "accesorios" && ES_MEMORIA_USB.test(p.nombre)) return "accesorios";
  return corregirCategoria(p.nombre, p.categoria);
}

/** Specs que el nombre declara y al producto le faltan, por nombre de campo. */
function specsNuevas(p: SupplierProduct): string[] {
  const delNombre = specsDelNombre(p.nombre, p.categoria);
  return Object.keys(delNombre).filter((k) => !p.specs?.[k]);
}

/** Aplica las correcciones y devuelve las listas ya saneadas, junto al diagnóstico de lo
 *  que se hizo. Es IDEMPOTENTE: pasarlo dos veces no cambia nada la segunda vez. */
export function sanear(listas: SupplierList[]): { listas: SupplierList[]; diagnostico: Diagnostico } {
  const diagnostico = diagnosticar(listas);
  const aDescartar = new Set(diagnostico.descartados.map((h) => h.nombre));

  const saneadas = listas.map((lista) => {
    if (!Array.isArray(lista.productos)) return lista;
    const productos = lista.productos
      .filter((p) => !aDescartar.has(p.nombre))
      .map((p) => {
        const categoria = categoriaCorrecta(p);
        // Las specs guardadas mandan sobre las deducidas: el saneo COMPLETA, no reescribe.
        const specs = { ...specsDelNombre(p.nombre, categoria), ...(p.specs ?? {}) };
        return { ...p, categoria, specs: Object.keys(specs).length ? specs : undefined };
      });
    return { ...lista, productos };
  });

  return { listas: saneadas, diagnostico };
}
