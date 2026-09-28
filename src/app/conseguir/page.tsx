import type { Metadata } from "next";
import ConseguirPage from "./conseguir-client";
import { loadCategories } from "@/lib/categories";
import { loadPublishedBusinessProducts } from "@/lib/products";

// Esta ruta es un componente de CLIENTE (estado, formularios, hooks) y por eso
// no podía exportar `metadata`: heredaba el título y la descripción por defecto
// del sitio, y varias páginas competían entre sí con el mismo texto en Google.
// La página vive ahora en ./conseguir-client.tsx y aquí queda solo su metadata.
export const metadata: Metadata = {
  title: "Te lo conseguimos",
  description: "¿No encuentras lo que buscas? Dinos qué necesitas y te lo conseguimos: cualquier equipo, componente o accesorio de tecnología, con entrega en Colombia.",
  alternates: { canonical: "/conseguir" },
  openGraph: {
    title: "Te lo conseguimos",
    description: "¿No encuentras lo que buscas? Dinos qué necesitas y te lo conseguimos: cualquier equipo, componente o accesorio de tecnología, con entrega en Colombia.",
    type: "website",
    locale: "es_CO",
    url: "/conseguir",
    siteName: "Te lo Consigo",
  },
};

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

/** LO QUE EL CLIENTE VENÍA MIRANDO, ESCRITO POR NOSOTROS.
 *
 *  A esta página se llega desde varios sitios y todos le pasan algo en la URL: la ficha
 *  de un producto manda `ref`, el buscador manda `q`, una categoría manda `cat`. Nada de
 *  eso se leía: el cliente que acababa de pinchar un monitor concreto se encontraba una
 *  caja de texto vacía pidiéndole que describiera "marca, modelo, características" — lo
 *  que el sitio ya sabía y le acababa de quitar.
 *
 *  Son esos tres y nada más: se miran los enlaces que existen de verdad. Hubo aquí un
 *  cuarto caso, `marca` + `linea`, que nació muerto — lo mandaba la card de línea del
 *  catálogo, y esa card ahora lleva a Andrea.
 *
 *  Se devuelve TEXTO EDITABLE, no un campo bloqueado: es el punto de partida de su
 *  mensaje, y si venía por otra cosa lo borra y escribe. */
function loQueVieneBuscando(sp: { [key: string]: string | string[] | undefined }): string {
  const ref = uno(sp.ref).trim();
  const q   = uno(sp.q).trim();
  const cat = uno(sp.cat).trim();

  if (ref) {
    const p = loadPublishedBusinessProducts().find(
      (x) => (x.referencia ?? x.slug ?? x.id) === ref,
    );
    const nombre = p?.nombre?.trim();
    return nombre
      ? `Quiero cotizar: ${nombre}${p?.referencia ? ` (ref. ${p.referencia})` : ""}\n\nCantidad: `
      : `Quiero cotizar la referencia ${ref}.\n\nCantidad: `;
  }
  if (q)   return `Estaba buscando: "${q}"\n\n`;
  if (cat) {
    const nombre = loadCategories().find((c) => c.slug === cat)?.nombre;
    return nombre ? `Estoy buscando ${nombre.toLowerCase()}.\n\n` : "";
  }
  return "";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return <ConseguirPage descripcionInicial={loQueVieneBuscando(sp)} />;
}
