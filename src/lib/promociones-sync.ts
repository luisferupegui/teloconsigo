import "server-only";
import { loadBusinessProducts, saveBusinessProducts } from "@/lib/products";
import type { BusinessProduct } from "@/lib/products-types";
import { loadActiveProducts, loadMargins, applyMargin } from "@/lib/supplier-catalog";

// ─── Sincronizar la vitrina con las listas del mes ───────────────────────────
//
// La página de promociones se llenó una vez y se quedó quieta. Medido sobre el
// catálogo real, de los 65 productos que estaban en promoción:
//
//   45  ya no existían en ninguna lista activa — el proveedor dejó de venderlos
//   20  seguían existiendo, y los 20 a un precio distinto del publicado
//   ──
//    0  correctos
//
// Y no es cosmético. El Dell Inspiron 5440 estaba publicado a $3.934.000 cuando
// el costo del mes lo pone en $4.919.000: cada venta perdía $985.000. El Dell
// ProOne al revés, un millón por encima del precio real, o sea invendible.
//
// Esto no adivina nada ni elige productos nuevos: compara lo que YA está
// publicado contra las listas vigentes y dice qué cambió. Decidir qué se aplica
// es de quien mira.

/** Cómo se emparejan un producto publicado y uno de lista: por su referencia,
 *  ignorando guiones, puntos y mayúsculas, que es donde difieren al escribirlas. */
const norm = (s: string | undefined | null) =>
  String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export type Repreciar = {
  referencia: string;
  nombre: string;
  precioActual: number;
  precioNuevo: number;
  diferencia: number;
  proveedor: string;
  lista: string;
};

export type Descatalogado = {
  referencia: string;
  nombre: string;
  precioActual: number;
};

export type AnalisisPromociones = {
  enPromocion: number;
  /** Siguen a la venta pero a otro precio. */
  repreciar: Repreciar[];
  /** Ya no están en ninguna lista activa. */
  descatalogados: Descatalogado[];
  /** Publicados sin referencia: no hay por dónde emparejarlos, así que no se
   *  tocan. Se cuentan para que el número cuadre y nadie los dé por revisados. */
  sinReferencia: number;
  alDia: number;
};

/** Qué le pasa hoy a lo que está en promoción. No escribe nada. */
export function analizarPromociones(): AnalisisPromociones {
  const publicados = loadBusinessProducts().filter((p) => p.enPromocion);
  const margins = loadMargins();

  // `loadActiveProducts` ya aplica las reglas que costó acordar: dentro de un
  // proveedor manda su lista más nueva, y entre proveedores compite el precio.
  // Si dos proveedores traen la misma referencia, se queda el más barato.
  const vigentes = new Map<string, ReturnType<typeof loadActiveProducts>[number]>();
  for (const p of loadActiveProducts()) {
    if (!p.referencia) continue;
    const clave = norm(p.referencia);
    const previo = vigentes.get(clave);
    if (!previo || p.precio_costo < previo.precio_costo) vigentes.set(clave, p);
  }

  const repreciar: Repreciar[] = [];
  const descatalogados: Descatalogado[] = [];
  let sinReferencia = 0;
  let alDia = 0;

  for (const pub of publicados) {
    const precioActual = pub.precioDesde ?? pub.precio ?? 0;

    // Productos que no salen de ninguna lista: los dos servidores de la sección
    // de Redes están cotizados contra el mercado, no contra un proveedor. Sin
    // esto el panel los daba por descatalogados —correcto pero inútil: no hay
    // lista donde buscarlos— y el botón de retirar se los habría llevado.
    if ((pub as unknown as { fueraDeLista?: boolean }).fueraDeLista) { alDia++; continue; }

    if (!pub.referencia) { sinReferencia++; continue; }

    const enLista = vigentes.get(norm(pub.referencia));
    if (!enLista) {
      descatalogados.push({ referencia: pub.referencia, nombre: pub.nombre, precioActual });
      continue;
    }

    // El margen va por la categoría de la LISTA, que es la taxonomía que usa
    // margins.json — no por la de la tienda, que es otra cosa.
    const precioNuevo = applyMargin(
      enLista.precio_costo, enLista.categoria, margins, enLista.nombre,
    );

    if (precioNuevo !== precioActual) {
      repreciar.push({
        referencia: pub.referencia,
        nombre: pub.nombre,
        precioActual,
        precioNuevo,
        diferencia: precioNuevo - precioActual,
        proveedor: enLista.proveedor,
        lista: enLista.listaNombre,
      });
    } else {
      alDia++;
    }
  }

  // Lo que más dinero mueve, arriba. Es el mismo criterio que los avisos del
  // importador: por pesos, no por porcentaje ni por orden alfabético.
  repreciar.sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia));
  descatalogados.sort((a, b) => b.precioActual - a.precioActual);

  return {
    enPromocion: publicados.length,
    repreciar,
    descatalogados,
    sinReferencia,
    alDia,
  };
}

/** Escribe los precios nuevos de las referencias indicadas. Devuelve cuántos
 *  cambió. Se vuelve a calcular en el momento: entre ver la propuesta y
 *  aplicarla pudo importarse otra lista. */
export function aplicarPrecios(referencias: string[]): number {
  const pedidas = new Set(referencias.map(norm));
  if (pedidas.size === 0) return 0;

  const cambios = new Map(
    analizarPromociones().repreciar
      .filter((r) => pedidas.has(norm(r.referencia)))
      .map((r) => [norm(r.referencia), r.precioNuevo]),
  );
  if (cambios.size === 0) return 0;

  const productos = loadBusinessProducts();
  let n = 0;
  for (const p of productos) {
    const nuevo = p.referencia ? cambios.get(norm(p.referencia)) : undefined;
    if (nuevo === undefined) continue;
    // Se escriben los DOS campos porque la ficha usa `precioDesde ?? precio`:
    // dejar uno viejo haría que el precio mostrado dependiera de cuál se lee.
    p.precio = nuevo;
    p.precioDesde = nuevo;
    n++;
  }
  if (n > 0) saveBusinessProducts(productos);
  return n;
}

/**
 * Saca de promoción los productos indicados.
 *
 * Quita `enPromocion` y NO despublica: el producto desaparece de la vitrina pero
 * su ficha sigue existiendo, con su URL y su posición en el buscador. Un
 * proveedor puede volver a traer un modelo el mes siguiente, y despublicarlo
 * rompería el enlace por algo que quizá vuelve. Despublicar de verdad es otra
 * decisión y se hace desde Gestionar productos.
 */
export function quitarDePromocion(referencias: string[]): number {
  const pedidas = new Set(referencias.map(norm));
  if (pedidas.size === 0) return 0;

  const productos = loadBusinessProducts() as (BusinessProduct & { enPromocion?: boolean })[];
  let n = 0;
  for (const p of productos) {
    if (!p.referencia || !pedidas.has(norm(p.referencia)) || !p.enPromocion) continue;
    p.enPromocion = false;
    n++;
  }
  if (n > 0) saveBusinessProducts(productos);
  return n;
}
