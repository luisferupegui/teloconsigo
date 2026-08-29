import "server-only";
import type { ParsedProduct } from "@/lib/parse-supplier-doc";
import type { Descartado } from "./tipos";
import type { Fragmento } from "./coordenadas";
import { categoriaDeProducto } from "./categorias";

// ─── Ledacom, segundo formato: FICHAS DE PRODUCTO ────────────────────────────
//
// El mismo PDF trae DOS maquetaciones. Las tablas (Ref | Nombre | Valor) las lee
// `ledacom.ts`. Los celulares, tablets y portátiles van en fichas de tres
// columnas, y por eso faltaban: leyendo solo tablas se perdían familias enteras.
//
//   130:Xiaomi Redmi A7 Pro
//   130:(4GB|64GB)
//   130:Referencias:
//   130:6932554493479 - Azul          ← una referencia por color
//   130:6932554493431 - Negro
//   130:Procesador:  150:UNISOC T7250 de 12nm,
//   130:Almacenamiento:  159:64GB
//   229:$419.000                      ← el precio va centrado, con otra X
//   222:Excluido de IVA
//
// La columna se reconoce sola: la palabra "Referencias:" solo aparece en las
// fichas y siempre al margen izquierdo de la suya, así que sus X marcan dónde
// empieza cada columna sin tener que fijarlas a mano.

const ES_PRECIO = /^\$\s?[\d][\d.,]*$/;
/** Texto de página que se cuela encima de una ficha y nunca es su nombre: pie
 *  legal, avisos comerciales, y colas de la especificación de la ficha anterior. */
const ES_PIE_FIJO = /^(>|▪|aplica t[eé]rminos|este listado|la configuraci[oó]n|para m[aá]s informaci[oó]n|confirme la existencia|servicio con iva|pag\.?\s*\d|\d+x |puertos?\s*:)/i;
/** Una línea que empieza en MINÚSCULA continúa la especificación anterior; el
 *  nombre de un producto siempre arranca con mayúscula o con un paréntesis.
 *  Va aparte y SIN la bandera `i` a propósito: metida en la regex de arriba con
 *  `i`, el rango [a-z] casaba también las mayúsculas y se comía todos los
 *  nombres — el síntoma fue que los celulares se quedaron llamándose "(4GB|64GB)". */
const EMPIEZA_MINUSCULA = /^[a-záéíóúñü]/;
const ES_PIE = (l: string) => ES_PIE_FIJO.test(l) || EMPIEZA_MINUSCULA.test(l);
const ETIQUETA = /^([A-Za-zÁÉÍÓÚÑáéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ .]{1,26})\s*:\s*(.*)$/;
const ES_VARIANTE = /^([A-Z0-9][A-Z0-9-]{5,20})\s*[-–]\s*(.+)$/i;

const precioNumero = (t: string): number | null => {
  const n = Number(t.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n >= 1000 ? n : null;
};

/** Categoría real de la ficha.
 *
 *  Los CELULARES salen con su propia categoría, no colgados de otra. El panel de
 *  precios todavía no tiene margen para ellos, así que caerán en "default" hasta
 *  que se les fije uno — pero eso se ve y se corrige, mientras que meterlos en
 *  "tablet" o "accesorios" los cobraría mal en silencio, que es peor. */
function categoriaDeFicha(nombre: string, specs: Record<string, string>): string {
  const n = nombre.toLowerCase();
  // A minúsculas TODO: las etiquetas vienen del PDF con su capitalización
  // ("Cámara Frontal", "Carga turbo") y comparadas en crudo no casaban nunca.
  const texto = `${n} ${Object.keys(specs).join(" ")} ${Object.values(specs).join(" ")}`.toLowerCase();

  // Las pulgadas del nombre son la PANTALLA, y son el dato que más separa a un
  // equipo de otro: de 20" para arriba no existe un portátil.
  const pulgadas = Number(n.match(/(\d{2}(?:[.,]\d)?)\s*["”]/)?.[1]?.replace(",", ".") ?? 0);

  // SERVIDOR primero: tiene procesador y memoria como un portátil, así que
  // cualquier regla estructural se lo llevaría por delante.
  if (/servidor|thinksystem|proliant|poweredge|formato rack|\brack\b|\bxeon\b|\bepyc\b/.test(texto)) return "servidor";
  if (/tableta|\btab\b|tablet|ipad/.test(n)) return "tablet";
  if (/todo en uno|all.?in.?one|\baio\b/.test(n)) return "all-in-one";
  // Un teléfono se delata por la cámara frontal y la carga rápida; un portátil
  // nunca trae "Carga turbo" ni "Cámara Post.".
  if (/c[aá]mara post|c[aá]mara frontal|carga turbo|hyperos|dual sim/.test(texto)) return "celular";
  // Torre de marca o ensamblado: lo dice el formato, no la potencia.
  if (/\bsff\b|\btorre\b|\bmini.?pc\b|optiplex|thinkcentre|prodesk|elitedesk/.test(n)) return "escritorio";
  // Familias de portátil por nombre comercial. La lista es larga a propósito:
  // "Lenovo V14 G5" no dice "portátil" por ningún lado y caía en accesorios.
  if (/port[aá]til|laptop|notebook|thinkpad|thinkbook|ideapad|vivobook|zenbook|expertbook|inspiron|latitude|probook|elitebook|pavilion|aspire|nitro|swift|\btuf\b|\brog\b|legion|victus|\bomen\b|macbook|\bv1[3-6]\b|dell pro \d/.test(n)) {
    return pulgadas >= 20 ? "all-in-one" : "portatil";
  }
  // Y si nada de lo anterior encaja, manda la ESTRUCTURA de la ficha: procesador
  // + pantalla es un equipo con pantalla propia. Menos de 20", un portátil.
  if (/procesador/.test(texto) && (pulgadas > 0 || /pantalla/.test(texto))) {
    return pulgadas >= 20 ? "all-in-one" : "portatil";
  }
  // No es un equipo. Y no todo lo que va en ficha lo es: el catálogo publica
  // también tarjetas de video, mouses gamer y teclados en este formato, y
  // devolver "accesorios" los metía a todos en el mismo cajón. Manda entonces la
  // misma tabla que usan las tablas del catálogo — la que lee el NOMBRE.
  return categoriaDeProducto(nombre);
}

/** Limpia del nombre lo que es condición de servicio, no producto.
 *  "Garantía 1 año Onsite" → "Garantía 1 año": el tipo de atención de la
 *  garantía no distingue un producto de otro en el catálogo. */
function limpiarNombre(nombre: string): string {
  return nombre
    .replace(/\s+on[\s-]?site\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([/,])/g, "$1")
    .trim();
}

/** Las X donde empieza cada columna de fichas: las de la palabra "Referencias:". */
function columnasDe(fragmentos: Fragmento[]): number[] {
  // Singular y plural: los celulares traen "Referencias:" con una por color y los
  // portátiles "Referencia:" con una sola. Sin aceptar el singular, las ocho
  // páginas de portátiles no se reconocían siquiera como fichas.
  const xs = fragmentos.filter((f) => /^referencias?\s*:?$/i.test(f.t)).map((f) => f.x);
  return [...new Set(xs)].sort((a, b) => a - b);
}

/** Une los fragmentos que comparten renglón: la etiqueta y su valor van sueltos
 *  ("Procesador:" en x=130 y "UNISOC T7250…" en x=150). */
function renglones(fragmentos: Fragmento[]): { y: number; t: string }[] {
  const bandas = new Map<number, Fragmento[]>();
  for (const f of fragmentos) {
    const b = Math.round(f.y);
    if (!bandas.has(b)) bandas.set(b, []);
    bandas.get(b)!.push(f);
  }
  return [...bandas.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([y, fs]) => ({ y, t: fs.sort((a, b) => a.x - b.x).map((f) => f.t).join(" ").trim() }));
}

export function fichasDePagina(
  fragmentos: Fragmento[],
  descartados: Descartado[],
): ParsedProduct[] {
  const columnas = columnasDe(fragmentos);
  if (columnas.length === 0) return [];

  const productos: ParsedProduct[] = [];

  for (let i = 0; i < columnas.length; i++) {
    const desde = columnas[i] - 15;
    // Hasta donde empieza la siguiente columna; la última se queda con el resto
    // de la página, que es donde cae su precio centrado.
    const hasta = i + 1 < columnas.length ? columnas[i + 1] - 15 : desde + 210;
    const dentro = fragmentos.filter((f) => f.x >= desde && f.x < hasta);

    let acumulado: string[] = [];
    for (const r of renglones(dentro)) {
      if (!ES_PRECIO.test(r.t)) {
        // La nota de IVA pertenece a la ficha que acaba de cerrarse, no a la
        // siguiente: si se acumula, se cuela dentro del nombre del siguiente.
        if (!/^(excluido de iva|iva incluido|incluye iva)$/i.test(r.t)) acumulado.push(r.t);
        continue;
      }

      const precio = precioNumero(r.t);
      const lineas = acumulado;
      acumulado = [];
      if (!precio || lineas.length === 0) continue;

      const iRef = lineas.findIndex((l) => /^referencias?\s*:/i.test(l));
      if (iRef === -1) continue;   // sin "Referencia(s):" no es una ficha de producto

      // EL NOMBRE SON LAS ÚLTIMAS LÍNEAS ANTES DE "Referencia:", no todo lo
      // acumulado. Encima de una ficha caen el pie de página y la cola de specs
      // de la ficha anterior, y sin acotarlo salían nombres como "Aplica
      // Términos y Condiciones AIO HP PROONE 240" o "1x ranura para tarjetas
      // Tableta Lenovo…". Un título de ficha ocupa entre una y cuatro líneas.
      const titulo = lineas.slice(0, iRef).filter((l) => !ES_PIE(l)).slice(-4);
      const nombre = limpiarNombre(titulo.join(" "));
      // En los portátiles el código va en la MISMA línea ("Referencia: 82X700FTLM");
      // en los celulares va debajo, una referencia por color.
      // La referencia se queda con el código, no con el sufijo de variante:
      // "Referencia: YJ9PX - Torre" es la referencia YJ9PX.
      const enLinea = lineas[iRef]
        .replace(/^referencias?\s*:\s*/i, "")
        .split(/\s+[-–]\s+/)[0]
        .trim();
      const resto = lineas.slice(iRef + 1);

      // Variantes de color y specs etiquetadas.
      const variantes: string[] = [];
      const specs: Record<string, string> = {};
      let ultima: string | null = null;
      for (const l of resto) {
        const v = l.match(ES_VARIANTE);
        if (v && Object.keys(specs).length === 0) { variantes.push(l); continue; }
        const e = l.match(ETIQUETA);
        if (e) { ultima = e[1].trim(); specs[ultima] = e[2].trim(); continue; }
        if (ultima) specs[ultima] = `${specs[ultima]} ${l}`.trim();
      }

      if (nombre.length < 4) {
        descartados.push({ referencia: variantes[0] ?? "(sin ref)", motivo: "Ficha con precio pero sin nombre" });
        continue;
      }

      const referencia = enLinea || (variantes[0]?.match(ES_VARIANTE)?.[1] ?? "");
      if (variantes.length > 1) specs["variantes"] = variantes.join(" · ");

      productos.push({
        nombre,
        marca: "Ledacom",
        categoria: categoriaDeFicha(nombre, specs),
        precio_costo: precio,
        referencia,
        specs: Object.keys(specs).length ? specs : undefined,
      });
    }
  }

  return productos;
}
