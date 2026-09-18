import "server-only";
import { loadActiveProducts, type ActiveProduct } from "./supplier-catalog";
import { loadPublishedBusinessProducts } from "./products";
import { marcaDeNombre } from "./marcas";
import { limpiarNombreProducto } from "./nombre-producto";

// ─── El buscador de la web también encuentra lo de las listas ────────────────
//
// Quien buscaba "Kingston 64GB" o "RTX 5060" en la web no encontraba nada: solo
// salían los productos publicados, aunque en las listas hubiera más de mil y
// Andrea los cotizara todos. Era demanda que se perdía en la puerta.
//
// Lo de las listas se muestra SIN PRECIO, con un "Cotizar ahora" que abre a
// Andrea con el producto ya cargado. Por tres razones:
//   - Las listas salen de leer PDFs y traen errores: la de Ledacom tuvo 185
//     precios mal durante dos semanas. En una conversación un precio malo lo
//     frena la revisión del pedido; publicado, lo ve cualquiera.
//   - Los mayoristas cambian precios casi a diario y las listas se importan cada
//     varias semanas. Andrea cotiza con la vigente al momento de preguntar.
//   - El negocio no compite por precio contra una lista buscable.
//
// Por lo mismo, lo que sale de aquí hacia la web es solo nombre y marca. Nunca
// precio, costo, proveedor ni el nombre de la lista.

export type ResultadoLista = {
  /** Identifica el resultado en la lista; es el nombre normalizado, no un id interno. */
  clave: string;
  nombre: string;
  marca: string;
  /** A dónde lleva "Cotizar ahora": Andrea con el producto ya cargado. */
  cotizar: string;
};

const plano = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const palabras = (s: string) => plano(s).split(/[^a-z0-9]+/).filter(Boolean);
const claveDe = (s: string) => plano(s).replace(/[^a-z0-9]/g, "");

/** Primera palabra de los nombres que en realidad son un trozo de la ficha anterior
 *  ("con 4 enlaces ascendentes SFP+…", "puertos de salida 4xPoE…"). */
const EMPIEZA_COMO_FRAGMENTO = /^(con|de|del|y|para|puertos?|a|en|el|la|los|las|sin|hasta|incluye)\b/;

/** El nombre que ve el cliente, o `null` si no está en condiciones de mostrarse. */
function nombrePublico(p: ActiveProduct): string | null {
  const n = limpiarNombreProducto(p.nombre)
    // Abreviatura de la lista, no del producto: "Mem. USB Kingston".
    .replace(/^Mem\.\s*/i, "Memoria ")
    // Letra suelta al final, resto de un corte del PDF: "EcoTank L3310 a".
    .replace(/\s+[a-zA-Z]$/, "")
    .replace(/[\s,;/\-+]+$/, "")
    .trim();
  if (n.length < 8 || !/[a-z]/i.test(n)) return null;
  if (EMPIEZA_COMO_FRAGMENTO.test(n)) return null;
  // Una etiqueta de ficha dentro del nombre ("INTEL Procesador: INTEL N") es que el
  // lector mezcló el título con las specs: el nombre no es fiable.
  if (/\b[\p{L}.]{3,}\s*:\s*/u.test(n)) return null;
  // La primera letra en mayúscula: "kaspersky STANDAR MOBILE" es legítimo pero así
  // parece un error de digitación.
  return n.charAt(0).toUpperCase() + n.slice(1);
}

type Indexado = ResultadoLista & { palabrasNombre: string[]; todo: string[]; textoPlano: string };

let cache: { en: number; indice: Indexado[] } | null = null;
/** Las listas cambian cuando alguien importa una, no a cada tecla: se relee el
 *  disco como mucho una vez por minuto. */
const VIGENCIA_MS = 60_000;

function indice(): Indexado[] {
  if (cache && Date.now() - cache.en < VIGENCIA_MS) return cache.indice;

  // Lo ya publicado en la tienda sale en su propio resultado, con foto y ficha;
  // aquí no se repite.
  const publicados = new Set(loadPublishedBusinessProducts().map((p) => claveDe(p.nombre)));
  const vistos = new Set<string>();
  const out: Indexado[] = [];

  for (const p of loadActiveProducts()) {
    // Sin precio en la lista Andrea tampoco podría cotizarlo.
    if (!(p.precio_costo > 0)) continue;
    const nombre = nombrePublico(p);
    if (!nombre) continue;
    const clave = claveDe(nombre);
    // El mismo producto en dos listas (Ledacom e Infoshop) se muestra una vez.
    if (vistos.has(clave) || publicados.has(clave)) continue;
    vistos.add(clave);

    // La marca se reconoce en el NOMBRE contra la tabla de marcas conocidas. La
    // columna de marca de las listas trae de todo ("DDR4", "CABLE") y mostrada
    // encima del producto parecía un error; si no se reconoce, no se muestra.
    const marca = marcaDeNombre(nombre, p.categoria) ?? "";
    const palabrasNombre = palabras(nombre);
    out.push({
      clave,
      nombre,
      marca,
      cotizar: `/asesor?producto=${encodeURIComponent(nombre)}&ref=buscador`,
      palabrasNombre,
      // La referencia se busca pero no se muestra: quien la conoce la escribe tal
      // cual ("DTXS/64GB"), y encontrar el producto por ella es lo que espera.
      todo: [...palabrasNombre, ...palabras(marca), ...palabras(p.categoria), ...palabras(p.referencia ?? "")],
      textoPlano: claveDe(`${nombre} ${p.referencia ?? ""}`),
    });
  }

  cache = { en: Date.now(), indice: out };
  return out;
}

/** Productos de las listas que coinciden con la búsqueda, los mejores primero.
 *  Cada palabra de la búsqueda tiene que aparecer, como comienzo de una palabra
 *  ("mem" encuentra "Mem." y "Memoria") o, si lleva cifras, en cualquier parte
 *  ("64gb", "5060", "i5-1334u"). */
export function buscarEnListas(q: string, limite = 8): ResultadoLista[] {
  const terminos = palabras(q);
  if (terminos.length === 0 || plano(q).trim().length < 2) return [];

  const puntuados: { r: Indexado; puntos: number }[] = [];
  for (const r of indice()) {
    let puntos = 0;
    let todos = true;
    for (const t of terminos) {
      if (r.palabrasNombre.includes(t)) puntos += 3;
      else if (r.palabrasNombre.some((w) => w.startsWith(t))) puntos += 2;
      else if (r.todo.some((w) => w.startsWith(t)) || (/\d/.test(t) && r.textoPlano.includes(t))) puntos += 1;
      else { todos = false; break; }
    }
    if (todos && puntos > 0) puntuados.push({ r, puntos });
  }

  return puntuados
    // A igual coincidencia, el nombre más corto: "Kingston 64GB" antes que un
    // combo que además la menciona.
    .sort((a, b) => b.puntos - a.puntos || a.r.nombre.length - b.r.nombre.length)
    .slice(0, limite)
    .map(({ r }) => ({ clave: r.clave, nombre: r.nombre, marca: r.marca, cotizar: r.cotizar }));
}
