import "server-only";
import { loadBusinessProducts, saveBusinessProducts } from "@/lib/products";
import { loadActiveProducts, loadMargins, applyMargin, type ActiveProduct } from "@/lib/supplier-catalog";

// ─── Llenar la vitrina con lo mejor de las listas del mes ────────────────────
//
// Las doce secciones de /soluciones se llenaron a mano una vez. Hoy hay
// secciones con UNA sola card —Gaming, Creadores, Componentes— y una card suelta
// no parece una promoción: parece una tienda vacía.
//
// Esto propone hasta 8 por sección tomándolas de las listas vigentes. No
// publica: propone, y quien mira decide. Es el escaparate, no una lista interna.

/** Cuántas cards quiere cada sección. Ocho llena una rejilla de 4×2 sin huecos. */
export const CUPO = 8;

/**
 * Qué alimenta cada sección.
 *
 * `campo` y `valor` son EXACTAMENTE lo que filtra /soluciones; publicar con otra
 * cosa deja el producto fuera de la vitrina aunque esté en el catálogo.
 *
 * `categorias` son las categorías de LISTA que pueden entrar, y `rango` acota
 * por precio cuando la misma categoría alimenta dos secciones distintas: un
 * escritorio de $1,5M es "Hogar y Estudio" y uno de $4M es "Productividad", y
 * son el mismo `escritorio` en la lista del proveedor.
 */
export type SeccionVitrina = {
  id: string;
  nombre: string;
  campo: "usoCaso" | "segmento";
  valor: string;
  categorias: string[];
  /** Tope de precio de venta, cuando la sección es la gama de entrada. */
  hasta?: number;
  /** Piso de precio de venta, cuando la sección es la gama alta. */
  desde?: number;
};

export const SECCIONES: SeccionVitrina[] = [
  // Mezcla portátiles y escritorio a propósito: es la sección de "un equipo para
  // la casa", y ahí el cliente compara las dos cosas. Por eso filtra por
  // segmento y no por usoCaso, que solo admitiría portátiles.
  { id: "hogar-estudio", nombre: "Hogar y Estudio", campo: "segmento", valor: "hogar-estudio",
    categorias: ["portatil", "escritorio", "all-in-one"], hasta: 2_600_000 },

  { id: "gaming-streaming", nombre: "Gaming y Streaming", campo: "segmento", valor: "gaming-streaming",
    categorias: ["escritorio-alto-rendimiento", "tarjeta-grafica"] },

  { id: "productividad-oficina", nombre: "Productividad y Oficina", campo: "usoCaso", valor: "pc-empresarial",
    categorias: ["escritorio", "all-in-one", "mini-pc"], desde: 2_000_000 },

  { id: "movilidad-premium", nombre: "Movilidad Premium", campo: "usoCaso", valor: "portatil-ejecutivo",
    categorias: ["portatil"], desde: 2_600_000 },

  { id: "redes-servidores", nombre: "Redes y Servidores", campo: "segmento", valor: "redes-servidores",
    categorias: ["redes", "servidor"] },

  { id: "creadores-produccion", nombre: "Creadores y Producción", campo: "segmento", valor: "creadores-produccion",
    categorias: ["escritorio-alto-rendimiento"], desde: 3_500_000 },

  { id: "smart-home", nombre: "Smart Home y Conectividad", campo: "segmento", valor: "smart-home",
    categorias: ["camara", "televisor", "redes"] },

  { id: "monitores", nombre: "Monitores", campo: "usoCaso", valor: "monitor",
    categorias: ["monitor"] },

  { id: "tablets", nombre: "Tablets Empresariales", campo: "usoCaso", valor: "tablet-empresarial",
    categorias: ["tableta"] },

  { id: "accesorios", nombre: "Accesorios", campo: "usoCaso", valor: "accesorio",
    categorias: ["accesorios", "mouse", "teclado", "auriculares", "camara", "impresora"] },

  { id: "licencias", nombre: "Licencias y Software", campo: "usoCaso", valor: "licencia",
    categorias: ["antivirus", "licencia", "software"] },

  { id: "componentes", nombre: "Componentes", campo: "segmento", valor: "componentes",
    categorias: ["procesador", "motherboard", "memoria-ram", "almacenamiento",
                 "tarjeta-grafica", "fuente-poder", "refrigeracion", "proteccion"] },
];

export type Candidato = {
  referencia: string;
  nombre: string;
  marca: string;
  categoria: string;
  proveedor: string;
  precioCosto: number;
  precioVenta: number;
  /** entrada | medio | alto — el tramo de la escalera que ocupa. */
  tramo: string;
  /** Por qué está propuesto, en una línea que se pueda leer. */
  porque: string;
};

export type PropuestaSeccion = {
  id: string;
  nombre: string;
  publicados: number;
  faltan: number;
  candidatos: Candidato[];
  /** Cuántos candidatos había en las listas antes de recortar al cupo. */
  disponibles: number;
};

/** Un nombre que no identifica el producto no puede ir a una card. Es la misma
 *  guarda del importador: mejor una sección con seis cards buenas que con ocho. */
function nombreUsable(n: string): boolean {
  const letras = (n.match(/[a-záéíóúñü]/gi) ?? []).length;
  return n.trim().length >= 12 && letras >= 8 && /[a-záéíóúñü]{3,}/i.test(n);
}

/**
 * Cuánto producto da por su precio.
 *
 * No es "el más barato": el más barato suele ser la peor máquina, deja mala
 * primera impresión y el menor margen absoluto. Esto mide lo contrario — cuánta
 * ficha técnica trae por millón de pesos — que es lo que hace que una card se
 * sienta buena compra.
 */
function valorPorPeso(p: ActiveProduct, precioVenta: number): number {
  const texto = `${p.nombre} ${Object.values(p.specs ?? {}).join(" ")}`;
  const gb = [...texto.matchAll(/(\d{1,4})\s?GB\b/gi)].map((m) => Number(m[1])).filter((n) => n <= 4096);
  const tb = [...texto.matchAll(/(\d)\s?TB\b/gi)].map((m) => Number(m[1]) * 1024);
  const capacidad = [...gb, ...tb].reduce((a, b) => a + b, 0);

  let puntos = capacidad / 8;                                    // RAM + disco
  if (/\b(rtx|gtx|radeon\s*rx|rx\s?\d{4})\b/i.test(texto)) puntos += 40;   // gráfica dedicada
  if (/\b(i7|i9|ryzen\s*[79]|ultra\s*[79]|xeon)\b/i.test(texto)) puntos += 25;
  else if (/\b(i5|ryzen\s*5|ultra\s*5)\b/i.test(texto)) puntos += 12;
  puntos += Object.keys(p.specs ?? {}).length * 2;               // ficha completa

  return puntos / Math.max(precioVenta / 1_000_000, 0.05);
}

const TRAMOS = ["entrada", "medio", "alto"] as const;
/** Cómo se reparten 8 cards: la del medio es la que más se vende, y las de los
 *  extremos hacen de ancla — la cara hace razonable a la del medio. */
const REPARTO = { entrada: 0.25, medio: 0.5, alto: 0.25 };

/** La propuesta para las secciones pedidas. No escribe nada. */
export function proponerRelleno(ids: string[]): PropuestaSeccion[] {
  const publicados = loadBusinessProducts();
  const margins = loadMargins();
  const vigentes = loadActiveProducts();

  // Lo que ya está publicado no se vuelve a proponer, esté donde esté.
  const yaEsta = new Set(
    publicados.map((p) => String(p.referencia ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "")).filter(Boolean),
  );
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

  return SECCIONES.filter((s) => ids.includes(s.id)).map((s) => {
    const enVitrina = publicados.filter(
      (p) => p.enPromocion && (p as unknown as Record<string, string>)[s.campo] === s.valor,
    ).length;
    const faltan = Math.max(0, CUPO - enVitrina);

    const pool = vigentes
      .filter((p) => s.categorias.includes(p.categoria))
      .filter((p) => p.precio_costo > 0 && p.referencia && !yaEsta.has(norm(p.referencia)))
      .filter((p) => nombreUsable(p.nombre))
      .map((p) => {
        const precioVenta = applyMargin(p.precio_costo, p.categoria, margins, p.nombre);
        return { p, precioVenta, valor: valorPorPeso(p, precioVenta) };
      })
      .filter(({ precioVenta }) =>
        (s.hasta === undefined || precioVenta <= s.hasta) &&
        (s.desde === undefined || precioVenta >= s.desde));

    if (faltan === 0 || pool.length === 0) {
      return { id: s.id, nombre: s.nombre, publicados: enVitrina, faltan, candidatos: [], disponibles: pool.length };
    }

    // ── Escalera de precios ──
    // Ocho equipos al mismo precio convierten peor que una escalera: el cliente
    // no compara, y el que no puede pagar el único precio se va. Se parte el
    // surtido en tres tercios por precio y se toma de cada uno.
    const ordenados = [...pool].sort((a, b) => a.precioVenta - b.precioVenta);
    const corte = Math.ceil(ordenados.length / 3);
    const porTramo: Record<string, typeof ordenados> = {
      entrada: ordenados.slice(0, corte),
      medio: ordenados.slice(corte, corte * 2),
      alto: ordenados.slice(corte * 2),
    };

    // Las cuotas se reparten SIN redondear cada una por su lado: redondeando,
    // 3 huecos daban 1+2+1 = 4 propuestas para 3 sitios.
    const cuotas = { entrada: Math.floor(faltan * REPARTO.entrada), alto: Math.floor(faltan * REPARTO.alto) } as Record<string, number>;
    cuotas.medio = faltan - cuotas.entrada - cuotas.alto;

    const elegidos: Candidato[] = [];
    const puestos = new Set<string>();
    const porProveedor = new Map<string, number>();

    const tomar = (c: (typeof pool)[number], tramo: string) => {
      if (puestos.has(c.p.referencia!) || elegidos.length >= faltan) return false;
      puestos.add(c.p.referencia!);
      porProveedor.set(c.p.proveedor, (porProveedor.get(c.p.proveedor) ?? 0) + 1);
      elegidos.push(candidato(c.p, c.precioVenta, tramo, c.valor));
      return true;
    };

    // ── Primera pasada: con diversidad de proveedor ──
    // Como mucho la mitad de la sección del mismo proveedor. Si ese se queda sin
    // stock, la sección no se cae entera.
    const tope = Math.max(2, Math.ceil(faltan / 2));
    for (const tramo of TRAMOS) {
      const orden = [...porTramo[tramo]].sort((a, b) => b.valor - a.valor);
      for (const c of orden) {
        if (elegidos.filter((e) => e.tramo === tramo).length >= cuotas[tramo]) break;
        if ((porProveedor.get(c.p.proveedor) ?? 0) >= tope) continue;
        tomar(c, tramo);
      }
    }

    // ── Segunda pasada: llenar lo que falte ──
    // La diversidad es una preferencia, no un muro: hay categorías que un solo
    // proveedor domina, y dejar la sección a medias por eso es peor que
    // repetirlo. Se ordena por valor, así que lo que entra aquí sigue siendo lo
    // mejor que queda.
    if (elegidos.length < faltan) {
      // El tramo se saca del precio, no se fija a "medio": etiquetarlos todos
      // igual hacía que la escalera pareciera plana en pantalla cuando no lo era.
      const limiteEntrada = ordenados[corte - 1]?.precioVenta ?? Infinity;
      const limiteMedio = ordenados[corte * 2 - 1]?.precioVenta ?? Infinity;
      for (const c of [...pool].sort((a, b) => b.valor - a.valor)) {
        if (elegidos.length >= faltan) break;
        tomar(c, c.precioVenta <= limiteEntrada ? "entrada" : c.precioVenta <= limiteMedio ? "medio" : "alto");
      }
    }

    return {
      id: s.id, nombre: s.nombre, publicados: enVitrina, faltan,
      candidatos: elegidos.sort((a, b) => a.precioVenta - b.precioVenta),
      disponibles: pool.length,
    };
  });
}

/**
 * Publica los candidatos aprobados de una sección.
 *
 * Se vuelve a calcular todo en el momento: entre ver la propuesta y aprobarla
 * pudo importarse otra lista, y publicar el precio que se vio en pantalla en vez
 * del vigente es justo el problema que vinimos a arreglar.
 *
 * Escribe `usoCaso` Y `segmento`: el primero es lo que filtran las secciones
 * viejas y el segundo lo que usan las nuevas. Poner solo uno deja el producto
 * en el catálogo pero fuera de la vitrina.
 */
export function publicarCandidatos(
  seccionId: string,
  referencias: string[],
): { publicados: number; omitidos: number } {
  const seccion = SECCIONES.find((s) => s.id === seccionId);
  if (!seccion) return { publicados: 0, omitidos: referencias.length };

  const pedidas = new Set(referencias.map((r) => r.toUpperCase().replace(/[^A-Z0-9]/g, "")));
  const propuesta = proponerRelleno([seccionId])[0];
  const aprobados = propuesta.candidatos.filter((c) =>
    pedidas.has(c.referencia.toUpperCase().replace(/[^A-Z0-9]/g, "")),
  );

  const productos = loadBusinessProducts();
  const existentes = new Set(productos.map((p) => p.referencia));
  let publicados = 0;

  for (const c of aprobados) {
    if (!c.referencia || existentes.has(c.referencia)) continue;
    existentes.add(c.referencia);
    productos.push({
      referencia: c.referencia,
      id: c.referencia,
      slug: slugify(c.nombre),
      nombre: c.nombre,
      // La marca del proveedor NUNCA sale a la tienda: si coinciden, vacía.
      marca: c.marca.trim().toLowerCase() === c.proveedor.trim().toLowerCase() ? "" : c.marca,
      categoria: categoriaTienda(c.categoria),
      usoCaso: seccion.campo === "usoCaso" ? seccion.valor : usoCasoPorDefecto(c.categoria),
      segmento: seccion.campo === "segmento" ? seccion.valor : segmentoPorDefecto(c.categoria),
      publicado: true,
      enPromocion: true,
      destacado: false,
      enAccesorios: false,
      precio: c.precioVenta,
      precioDesde: c.precioVenta,
      precioIvaIncluido: true,
      proveedor: "manual",
      specs: {},
      descripcionUso: "",
    } as unknown as ReturnType<typeof loadBusinessProducts>[number]);
    publicados++;
  }

  if (publicados > 0) saveBusinessProducts(productos);
  return { publicados, omitidos: referencias.length - publicados };
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Categoría de TIENDA (la taxonomía del catálogo público), distinta de la de
 *  lista y de la clave de margen. Confundirlas ya costó precios equivocados. */
function categoriaTienda(catLista: string): string {
  if (catLista === "portatil") return "portatil";
  if (catLista === "monitor") return "monitor";
  if (["escritorio", "escritorio-alto-rendimiento", "all-in-one", "mini-pc", "servidor"].includes(catLista)) return "pc";
  if (["tableta", "celular"].includes(catLista)) return "tablet";
  return "accesorio";
}
const usoCasoPorDefecto = (c: string) =>
  c === "portatil" ? "portatil-oficina" : c === "monitor" ? "monitor" : c === "tableta" ? "tablet-empresarial" : "accesorio";
const segmentoPorDefecto = (c: string) =>
  ["escritorio", "all-in-one", "mini-pc"].includes(c) ? "productividad-oficina" : "accesorios";

function candidato(p: ActiveProduct, precioVenta: number, tramo: string, valor: number): Candidato {
  const texto = `${p.nombre} ${Object.values(p.specs ?? {}).join(" ")}`;
  const razones: string[] = [];
  if (/\b(rtx|gtx|radeon)\b/i.test(texto)) razones.push("gráfica dedicada");
  if (/\b(i7|i9|ryzen\s*[79]|ultra\s*[79])\b/i.test(texto)) razones.push("CPU de gama alta");
  const ram = texto.match(/(\d{1,3})\s?GB\b/i);
  if (ram) razones.push(`${ram[1]}GB`);
  if (p.marca) razones.push(`marca ${p.marca}`);
  razones.push(`${Math.round(valor)} pts/millón`);

  return {
    referencia: p.referencia ?? "",
    nombre: p.nombre,
    marca: p.marca,
    categoria: p.categoria,
    proveedor: p.proveedor,
    precioCosto: p.precio_costo,
    precioVenta,
    tramo,
    porque: razones.join(" · "),
  };
}
