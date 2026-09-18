import "server-only";
import { marcaDeNombre } from "@/lib/marcas";
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
//
// La columna se reconoce sola: la palabra "Referencias:" solo aparece en las
// fichas y siempre al margen izquierdo de la suya, así que sus X marcan dónde
// empieza cada columna sin tener que fijarlas a mano.
//
// ── EL PRECIO NO ESTÁ EN LA COLUMNA DEL TEXTO ──
//
// Cada ficha es FOTO + TEXTO, y el precio va impreso debajo de la foto, a la
// IZQUIERDA del texto: ~102 puntos antes de su "Referencia:".
//
//    x=24   $7.449.000   ←──  x=129  Portátil ROG Strix G16
//    x=24   IVA Incluido           Referencia: G614PM-RV010W
//    x=225  $2.569.000   ←──  x=330  Asus TUF Gaming A15 + GamePad
//    x=221  GamePad con IVA        Referencia: FA506NCG-HN204
//
// El motor anterior buscaba el precio DENTRO de la columna del texto, y lo que
// encontraba ahí era el de la ficha vecina: el ROG Strix de $7.449.000 entró a
// $2.769.000 (el de otro Asus) y el Lenovo LOQ de $2.980.000 a $6.739.000 (el de
// un Legion). Andrea llegó a ofrecerle a un cliente un portátil a menos de la
// mitad de lo que cuesta. Los de la primera columna se quedaban sin precio y se
// perdían. Y la nota "GamePad con IVA", que es del precio, acababa pegada al
// nombre del producto de al lado.
//
// Ahora la ficha se arma por su "Referencia:", y el precio se le asigna después
// por GEOMETRÍA: cada fila de fichas tiene sus precios, y el desplazamiento
// precio→ficha se APRENDE de la propia página emparejando las filas en las que
// hay tantos precios como fichas. No se fija: casi todo el PDF va a −102, pero
// las páginas de baterías y reguladores llevan el precio dentro (+12), y un
// valor fijo equivocaría una de las dos.

const ES_PRECIO = /^\$\s?[\d][\d.,]*$/;
/** Restos de la ESPECIFICACIÓN DE PUERTOS de una ficha ("Audio Jack TMDS",
 *  "40Gbps), 1x RJ45 LAN port"). Ninguna de estas palabras forma parte del nombre
 *  de un portátil, una tablet o un celular, que es lo único que se lee en este
 *  formato, así que un renglón que las lleva nunca es título. */
const ES_PUERTO = /\b(audio\s*jack|jack|hdmi|rj-?45|displayport|thunderbolt|tmds|gbps|ethernet|lan\s*port|type-?[ac]\b|combo\s*audio)\b/i;
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

/** La nota que acompaña a un precio: "Excluido de IVA", "IVA Incluido", "GamePad
 *  con IVA", "Equipo IVA Incluido", "AIO Excluido de IVA". Es del PRECIO, nunca del
 *  producto: pegada a un nombre salía "GamePad con IVA Portátil ROG Strix G16". */
const ES_NOTA_IVA = /\biva\b/i;

/** Limpia del nombre lo que es condición de servicio, no producto.
 *  "Garantía 1 año Onsite" → "Garantía 1 año": el tipo de atención de la
 *  garantía no distingue un producto de otro en el catálogo. Y por si una nota
 *  de IVA llegara a colarse por otra vía, tampoco pasa: el IVA no es producto. */
function limpiarNombre(nombre: string): string {
  return nombre
    .replace(/\s+on[\s-]?site\b/gi, "")
    .replace(/^\s*(?:[\p{L}\d]+\s+)?(?:(?:con|sin)\s+iva|iva\s+incluido|excluido\s+de\s+iva)\s+/iu, "")
    .replace(/\b(?:excluido\s+de\s+iva|iva\s+incluido|incluye\s+iva|(?:con|sin)\s+iva)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([/,])/g, "$1")
    .trim();
}

/** Las X donde empieza cada columna de fichas: las de la palabra "Referencias:".
 *  Se agrupan con tolerancia: la misma columna llega a 129 y a 130, o a 330, 331
 *  y 333, y tomadas por separado partían una columna en dos de 1 punto de ancho. */
function columnasDe(fragmentos: Fragmento[]): number[] {
  // Singular y plural: los celulares traen "Referencias:" con una por color y los
  // portátiles "Referencia:" con una sola. Sin aceptar el singular, las ocho
  // páginas de portátiles no se reconocían siquiera como fichas.
  const xs = fragmentos.filter((f) => /^referencias?\s*:?$/i.test(f.t)).map((f) => f.x).sort((a, b) => a - b);
  const cols: number[] = [];
  for (const x of xs) if (cols.length === 0 || x - cols[cols.length - 1] > 8) cols.push(x);
  return cols;
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

/** ¿Puede este renglón ser parte del TÍTULO de una ficha?
 *
 *  No se usa `ES_PIE` tal cual: descarta todo renglón que empiece por un número,
 *  pensado para "1x HDMI", y los títulos largos se parten justo así —
 *  "Gaming Laptop HP Victus / 15-fb3019la AMD Ryzen 7…", "Asus TUF Gaming F16 … /
 *  16GB/RTX 5050…"—. Con esa regla el nombre se quedaba en "/Jaeger Gray". Lo que
 *  separa el título de la ficha anterior ya no es el contenido del renglón sino el
 *  aire entre ambos (ver `fichasDeColumna`), así que aquí basta con dejar fuera lo
 *  que nunca es un nombre: specs etiquetadas, puertos y el pie legal. */
const PIE_LEGAL = /^(>|▪|aplica t[eé]rminos|este listado|la configuraci[oó]n|para m[aá]s informaci[oó]n|confirme la existencia|servicio con iva|pag\.?\s*\d|\d+x\s|puertos?\s*:)/i;
// La minúscula inicial TAMPOCO lo descarta: "Monitor táctil capacitivo de 15ʺ /
// sin Bisel" es un título partido, y con esa regla la ficha salía sin nombre.
const esTitulo = (t: string) => !ETIQUETA.test(t) && !ES_PUERTO.test(t) && !PIE_LEGAL.test(t);

type Ficha = {
  x: number;
  yRef: number;
  titulo: string[];
  /** El renglón de "Referencia:" y todo lo que va debajo hasta la ficha siguiente. */
  cuerpo: string[];
};

/** Las fichas de UNA columna, ancladas en su "Referencia:".
 *
 *  El título son los renglones CONTIGUOS justo encima de la referencia: se sube
 *  mientras el renglón parezca título y esté pegado al de abajo. Un salto de más
 *  de 16 puntos es el aire entre dos fichas, y lo que hay encima de ese aire es la
 *  cola de especificaciones de la ficha anterior, no el nombre de esta. */
function fichasDeColumna(filas: { y: number; t: string }[], x: number): Ficha[] {
  const iRefs = filas.flatMap((r, k) => (/^referencias?\s*:/i.test(r.t) ? [k] : []));
  const inicios = iRefs.map((k, j) => {
    const tope = j > 0 ? iRefs[j - 1] + 1 : 0;
    let s = k;
    while (s - 1 >= tope && k - (s - 1) <= 6 && esTitulo(filas[s - 1].t) && filas[s - 1].y - filas[s].y <= 16) s--;
    return s;
  });
  return iRefs.map((k, j) => ({
    x,
    yRef: filas[k].y,
    titulo: filas.slice(inicios[j], k).map((r) => r.t),
    cuerpo: filas.slice(k, j + 1 < iRefs.length ? inicios[j + 1] : filas.length).map((r) => r.t),
  }));
}

const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function fichasDePagina(
  fragmentos: Fragmento[],
  descartados: Descartado[],
): ParsedProduct[] {
  const columnas = columnasDe(fragmentos);
  if (columnas.length === 0) return [];

  // A veces el PDF parte el precio en dos fragmentos: "$" en x=30 y "52.600" en
  // x=34. Leído por separado, el signo solo no es un precio y la ficha se quedaba
  // sin el suyo — y el motor anterior le pegaba entonces el de la vecina.
  const partidos = fragmentos.flatMap((s) => {
    if (s.t.trim() !== "$") return [];
    const monto = fragmentos.find((n) => /^\d[\d.,]*$/.test(n.t.trim()) && n.x > s.x && n.x - s.x <= 14 && Math.abs(n.y - s.y) <= 2);
    return monto ? [{ signo: s, monto }] : [];
  });
  const sueltos = new Set(partidos.flatMap(({ signo, monto }) => [signo, monto]));
  const importes: Fragmento[] = [
    ...fragmentos.filter((f) => ES_PRECIO.test(f.t)),
    ...partidos.map(({ signo, monto }) => ({ ...signo, t: `$${monto.t.trim()}` })),
  ];

  // El texto de las fichas, sin precios ni notas de IVA: esos van por su lado.
  const texto = fragmentos.filter((f) => !ES_PRECIO.test(f.t) && !sueltos.has(f) && f.t.trim() !== "$" && !ES_NOTA_IVA.test(f.t));
  const notas = fragmentos.filter((f) => ES_NOTA_IVA.test(f.t));
  const precios = importes
    .filter((f) => precioNumero(f.t) !== null)
    .map((f) => ({
      x: f.x,
      y: f.y,
      valor: precioNumero(f.t)!,
      // El precio PRINCIPAL de una ficha lleva su nota de IVA justo debajo. Los
      // demás importes de la página (accesorios opcionales listados dentro de una
      // ficha, precios de antes) no la llevan, y por eso no se confunden con él.
      principal: notas.some((n) => n.x - f.x >= -15 && n.x - f.x <= 10 && f.y - n.y >= 3 && f.y - n.y <= 15),
      usado: false,
    }));

  // 1. Las fichas, columna por columna.
  const fichas: Ficha[] = [];
  for (let i = 0; i < columnas.length; i++) {
    const desde = columnas[i] - 15;
    const hasta = i + 1 < columnas.length ? columnas[i + 1] - 15 : desde + 210;
    fichas.push(...fichasDeColumna(renglones(texto.filter((f) => f.x >= desde && f.x < hasta)), columnas[i]));
  }

  // 2. Filas de la grilla: fichas cuya referencia está a la misma altura. Cada
  //    fila es dueña de los precios que caen entre su referencia y la de la fila
  //    de abajo.
  const filas: Ficha[][] = [];
  for (const f of [...fichas].sort((a, b) => b.yRef - a.yRef)) {
    const fila = filas.find((g) => Math.abs(g[0].yRef - f.yRef) <= 25);
    if (fila) fila.push(f); else filas.push([f]);
  }
  const techo = (g: Ficha[]) => Math.max(...g.map((f) => f.yRef)) + 10;
  const piso = (k: number) => (k + 1 < filas.length ? techo(filas[k + 1]) : Number.NEGATIVE_INFINITY);
  const preciosDeFila = (k: number) => precios.filter((p) => p.y <= techo(filas[k]) && p.y > piso(k));

  // 3. Cuánto se desplaza el precio de su ficha EN ESTA PÁGINA: se mide en las
  //    filas sin ambigüedad, las que tienen tantos precios principales como fichas.
  const desplazamientos: number[] = [];
  filas.forEach((g, k) => {
    const ps = preciosDeFila(k).filter((p) => p.principal).sort((a, b) => a.x - b.x);
    const fs = [...g].sort((a, b) => a.x - b.x);
    if (ps.length === fs.length) fs.forEach((f, n) => desplazamientos.push(ps[n].x - f.x));
  });
  if (desplazamientos.length === 0) {
    for (const f of fichas) {
      descartados.push({ referencia: referenciaDe(f), motivo: "Página de fichas sin una fila clara para ubicar los precios: revisar a mano" });
    }
    return [];
  }
  const desplazamiento = mediana(desplazamientos);

  // 4. Cada ficha se queda con el precio que está donde debe estar el suyo.
  const productos: ParsedProduct[] = [];
  filas.forEach((g, k) => {
    for (const f of [...g].sort((a, b) => a.x - b.x)) {
      const esperado = f.x + desplazamiento;
      const cerca = preciosDeFila(k)
        .filter((p) => !p.usado && Math.abs(p.x - esperado) <= 25)
        .sort((a, b) => Number(b.principal) - Number(a.principal) || Math.abs(a.x - esperado) - Math.abs(b.x - esperado));
      const producto = aProducto(f, descartados);
      if (!producto) continue;
      if (cerca.length === 0) {
        descartados.push({
          referencia: producto.referencia || "(sin ref)",
          motivo: "Ficha sin precio legible: el número no se pudo leer del PDF (suele venir dentro de una imagen)",
        });
        continue;
      }
      const elegido = cerca[0];
      elegido.usado = true;
      const avisos: string[] = [];
      if (!elegido.principal) avisos.push("El precio no trae su nota de IVA al lado: confirmar contra el PDF");
      // Solo es ambiguo si ninguno se distingue: un principal junto a importes sin
      // nota (los accesorios que lista la propia ficha) no deja duda de cuál es.
      if (cerca.length > 1 && (!elegido.principal || cerca.filter((p) => p.principal).length > 1)) {
        avisos.push(`La ficha trae más de un precio (${cerca.map((p) => `$${p.valor.toLocaleString("es-CO")}`).join(" y ")}): se tomó $${elegido.valor.toLocaleString("es-CO")}`);
      }
      productos.push({ ...producto, precio_costo: elegido.valor, ...(avisos.length ? { avisos } : {}) });
    }
  });

  return productos;
}

function referenciaDe(f: Ficha): string {
  return f.cuerpo[0]?.replace(/^referencias?\s*:\s*/i, "").split(/\s+[-–]\s+/)[0].trim() || "(sin ref)";
}

/** La ficha convertida en producto, todavía sin precio. */
function aProducto(f: Ficha, descartados: Descartado[]): Omit<ParsedProduct, "precio_costo"> | null {
  const nombre = limpiarNombre(f.titulo.join(" "));
  // En los portátiles el código va en la MISMA línea ("Referencia: 82X700FTLM");
  // en los celulares va debajo, una referencia por color.
  // La referencia se queda con el código, no con el sufijo de variante:
  // "Referencia: YJ9PX - Torre" es la referencia YJ9PX.
  const enLinea = f.cuerpo[0]
    .replace(/^referencias?\s*:\s*/i, "")
    .split(/\s+[-–]\s+/)[0]
    .trim();

  // Variantes de color y specs etiquetadas.
  const variantes: string[] = [];
  const specs: Record<string, string> = {};
  let ultima: string | null = null;
  for (const l of f.cuerpo.slice(1)) {
    const v = l.match(ES_VARIANTE);
    if (v && Object.keys(specs).length === 0) { variantes.push(l); continue; }
    const e = l.match(ETIQUETA);
    if (e) { ultima = e[1].trim(); specs[ultima] = e[2].trim(); continue; }
    if (ultima) specs[ultima] = `${specs[ultima]} ${l}`.trim();
  }

  if (nombre.length < 4) {
    descartados.push({ referencia: variantes[0] ?? (enLinea || "(sin ref)"), motivo: "Ficha sin nombre" });
    return null;
  }

  const referencia = enLinea || (variantes[0]?.match(ES_VARIANTE)?.[1] ?? "");
  if (variantes.length > 1) specs["variantes"] = variantes.join(" · ");

  const categoria = categoriaDeFicha(nombre, specs);
  return {
    nombre,
    marca: marcaDeNombre(nombre, categoria) ?? "",
    categoria,
    referencia,
    specs: Object.keys(specs).length ? specs : undefined,
  };
}
