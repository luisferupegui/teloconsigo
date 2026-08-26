import "server-only";
import { DeepSeek, deepseekJson } from "./deepseek";
import { serperShopping } from "./serper";
import type { SupplierList, SupplierProduct } from "./supplier-catalog";
import { sinVram, ramYDisco, pantallaDesdeNombre } from "./specs-nombre";

// ─── Completar fichas técnicas incompletas ────────────────────────────────────
//
// Algunas listas de proveedor traen solo marca, modelo y precio. La de Ledacom, por
// ejemplo, entrega "HP | Victus 15-fb3019la Ryzen 7 7445H RTX 3050 6GB | Gaming | $2.618.000"
// y nada más: 61 de sus 70 portátiles llegan sin memoria y 49 sin tamaño de pantalla. El
// lector no pierde nada — esos datos no vienen en el documento.
//
// Lo ideal es que el proveedor los mande. Esto es el plan B: buscar el modelo EXACTO en
// internet y completar la ficha una sola vez, dejándola guardada en la lista. Se paga una
// consulta por producto, no una por cotización.
//
// Nunca guarda sin confirmación: `proponer` consulta y devuelve lo que encontró, y solo
// `aplicar` escribe. Y si una spec no se puede afirmar, se deja vacía — la ficha ya sabe
// decir "te lo confirmo antes de cerrar", que es mejor que inventar una cifra.

/** Categorías donde memoria, disco y pantalla son decisivos para comprar. */
const EQUIPOS = new Set(["portatil", "escritorio", "escritorio-alto-rendimiento", "all-in-one", "todo-en-uno", "mini-pc", "tableta"]);

/** Equipos con pantalla integrada: a una torre no se le pregunta el tamaño de pantalla. */
const PANTALLA_PROPIA = new Set(["portatil", "all-in-one", "todo-en-uno", "tableta"]);

// Un equipo completo nombra su procesador; una caja vacía o un accesorio, no.
const NOMBRA_CPU = /\b(ryzen|core\s?i[3579]|core\s?ultra|core\s?[357]\b|pentium|celeron|athlon|xeon|epyc|snapdragon|mediatek|apple\s?m[1-4])\b/i;

export type Faltante = { ram: boolean; almacenamiento: boolean; pantalla: boolean };

/** Qué le falta a un producto para tener ficha completa. `null` si no le falta nada o si
 *  no es un equipo (a un teclado no se le exige memoria). */
export function faltantesDe(p: SupplierProduct): Faltante | null {
  if (!EQUIPOS.has(p.categoria)) return null;
  // Un equipo NOMBRA su procesador. Sin este filtro entraban gabinetes vacíos catalogados
  // como "escritorio" ("TORRE XYZ QUBEX BLACK ARGB + 4 FANS"): consultar sus specs sería
  // tirar el dinero, porque no tiene ninguna.
  if (!NOMBRA_CPU.test(p.nombre)) return null;

  // Se lee el nombre con las MISMAS funciones que usa la ficha del cliente. Si la ficha
  // sabe deducir el dato, el producto NO está incompleto y no hay nada que consultar. Una
  // copia propia de esta lógica ya dio por incompletos 41 portátiles cuyo nombre traía la
  // memoria en la notación abreviada "(16/512)": habría gastado consultas de pago en datos
  // que ya teníamos.
  const texto = `${p.nombre} ${Object.values(p.specs ?? {}).join(" ")}`;
  const { ram, disco } = ramYDisco(sinVram(texto));

  // La pantalla solo se le exige a los equipos que la llevan INTEGRADA. Una torre de
  // escritorio no tiene pantalla, y si viene con monitor ya está en su propia spec.
  const conPantallaPropia = PANTALLA_PROPIA.has(p.categoria);

  const falta = {
    ram: !p.specs?.ram && ram === null,
    almacenamiento: !p.specs?.almacenamiento && disco === null,
    pantalla: conPantallaPropia && !p.specs?.pantalla && !p.specs?.monitor && pantallaDesdeNombre(texto) === null,
  };
  return falta.ram || falta.almacenamiento || falta.pantalla ? falta : null;
}

export type Propuesta = {
  id: string;
  nombre: string;
  /** Lo que se encontró; solo las specs que faltaban y se pudieron afirmar. */
  specs: Record<string, string>;
  /** Título del listado del que se dedujo, para que el admin pueda juzgarlo. */
  fuente: string;
};

const SISTEMA_EXTRACCION = [
  "Eres un extractor de especificaciones de computadores. Recibes el nombre de un producto y",
  "títulos de anuncios de tiendas sobre ese mismo modelo.",
  "",
  "Devuelve SOLO un objeto JSON con estas claves, y únicamente las que puedas afirmar con",
  "seguridad a partir de los títulos:",
  '  { "ram": "16GB DDR5", "almacenamiento": "512GB SSD", "pantalla": "15.6\\" FHD" }',
  "",
  "REGLAS INNEGOCIABLES:",
  "- Si los títulos no coinciden con el MISMO modelo del producto, devuelve {}.",
  "- Si una spec no aparece o los títulos se contradicen entre sí, OMITE esa clave.",
  "- No deduzcas por lo que es habitual en ese tipo de equipo: solo lo que digan los títulos.",
  "- La VRAM de la tarjeta gráfica NO es la memoria del equipo.",
  "- Sin texto extra, sin explicaciones: solo el JSON.",
].join("\n");

/** Busca en internet las specs que le faltan a un producto. `null` si no se pudo afirmar
 *  ninguna. Una consulta a Serper y una a DeepSeek por producto. */
async function completarUno(
  ds: DeepSeek,
  p: SupplierProduct,
  falta: Faltante,
  serperKey: string,
): Promise<Propuesta | null> {
  // Se busca por marca + nombre: el nombre suele traer el código exacto de modelo, que es
  // lo que distingue una variante de 8GB de una de 16GB.
  const consulta = `${p.marca} ${p.nombre}`.trim();
  let items: { title?: string }[] = [];
  try {
    items = await serperShopping(consulta, "co", serperKey);
    if (items.length === 0) items = await serperShopping(consulta, "us", serperKey);
  } catch {
    return null;
  }
  const titulos = items.map((i) => i.title ?? "").filter(Boolean).slice(0, 8);
  if (titulos.length === 0) return null;

  const extraido = await deepseekJson<Record<string, string>>(
    ds,
    SISTEMA_EXTRACCION,
    `PRODUCTO: ${consulta}\n\nTÍTULOS DE ANUNCIOS:\n${titulos.map((t) => `- ${t}`).join("\n")}`,
    { maxTokens: 300 },
  );
  if (!extraido) return null;

  // Solo se propone lo que FALTABA: si la lista ya trae el dato, manda la lista.
  const specs: Record<string, string> = {};
  if (falta.ram && typeof extraido.ram === "string") specs.ram = extraido.ram;
  if (falta.almacenamiento && typeof extraido.almacenamiento === "string") specs.almacenamiento = extraido.almacenamiento;
  if (falta.pantalla && typeof extraido.pantalla === "string") specs.pantalla = extraido.pantalla;
  if (Object.keys(specs).length === 0) return null;

  return { id: p.id, nombre: p.nombre, specs, fuente: titulos[0] };
}

/** Cuántos productos tienen la ficha incompleta. No consulta internet: es el conteo que
 *  alimenta el "hay N por completar" del panel. */
export function contarIncompletos(listas: SupplierList[]): number {
  return listas.reduce(
    (t, l) => t + (l.productos ?? []).filter((p) => faltantesDe(p) !== null).length,
    0,
  );
}

/** Consulta internet y devuelve lo que encontró, SIN guardar nada.
 *  `limite` acota el gasto: son dos llamadas de pago por producto. */
export async function proponer(
  ds: DeepSeek,
  listas: SupplierList[],
  serperKey: string,
  // 25 por tanda: cada producto son dos llamadas de pago y unos segundos, y la ruta tiene
  // un tope de 5 minutos. Lo que sobre queda para la siguiente pulsación.
  limite = 25,
): Promise<{ propuestas: Propuesta[]; consultados: number; pendientes: number }> {
  const incompletos: SupplierProduct[] = [];
  for (const l of listas) for (const p of l.productos ?? []) if (faltantesDe(p)) incompletos.push(p);

  const lote = incompletos.slice(0, limite);
  const propuestas: Propuesta[] = [];
  // En serie a propósito: en paralelo se dispararía el gasto y el proveedor de búsqueda
  // limita la tasa. Son unos segundos por producto y se hace una sola vez.
  for (const p of lote) {
    const r = await completarUno(ds, p, faltantesDe(p)!, serperKey);
    if (r) propuestas.push(r);
  }

  return { propuestas, consultados: lote.length, pendientes: Math.max(0, incompletos.length - lote.length) };
}

/** Escribe las propuestas confirmadas. Solo rellena huecos: nunca pisa una spec existente. */
export function aplicar(listas: SupplierList[], propuestas: Propuesta[]): { listas: SupplierList[]; aplicadas: number } {
  const porId = new Map(propuestas.map((p) => [p.id, p.specs]));
  let aplicadas = 0;

  const nuevas = listas.map((l) => ({
    ...l,
    productos: (l.productos ?? []).map((p) => {
      const specs = porId.get(p.id);
      if (!specs) return p;
      aplicadas++;
      return { ...p, specs: { ...specs, ...(p.specs ?? {}) } };
    }),
  }));

  return { listas: nuevas, aplicadas };
}
