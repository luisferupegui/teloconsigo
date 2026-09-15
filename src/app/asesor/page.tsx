import type { Metadata } from "next";
import AsesorPage from "./asesor-client";

// Esta ruta es un componente de CLIENTE (estado, formularios, hooks) y por eso
// no podía exportar `metadata`: heredaba el título y la descripción por defecto
// del sitio, y varias páginas competían entre sí con el mismo texto en Google.
// La página vive ahora en ./asesor-client.tsx y aquí queda solo su metadata.
export const metadata: Metadata = {
  title: "Andrea — asesora de tecnología",
  description: "Habla con Andrea y recibe en minutos precio, disponibilidad y tiempo de entrega de cualquier producto de tecnología, con envío a toda Colombia.",
  alternates: { canonical: "/asesor" },
  openGraph: {
    title: "Andrea — asesora de tecnología",
    description: "Habla con Andrea y recibe en minutos precio, disponibilidad y tiempo de entrega de cualquier producto de tecnología, con envío a toda Colombia.",
    type: "website",
    locale: "es_CO",
    url: "/asesor",
    siteName: "Te lo Consigo",
  },
};

/** Un parámetro repetido en la URL (`?ref=a&ref=b`) llega como arreglo. Nos
 *  quedamos con el primero, que es lo que significaría para el cliente. */
function uno(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

// El chat leía la URL con `useSearchParams`, y eso obliga a envolverlo en un
// `<Suspense>`: React descartaba el HTML del servidor y repintaba la página
// entera en el cliente, dejando una copia completa del chat abandonada dentro
// del `<div id="S:0">`. Dos Andreas en el DOM, una de ellas muerta, en cada
// carga — y en un móvil lento eso se siente.
//
// Esta página ya es un componente de servidor, así que puede leer los
// parámetros ella misma y bajárselos al chat como props (es lo que recomienda
// la documentación de `useSearchParams` para este caso). Sin el hook no hace
// falta la frontera de Suspense, no hay repintado, y el cliente recibe la
// página ya armada desde el servidor.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return (
    <AsesorPage
      producto={uno(sp.producto)}
      refOrigen={uno(sp.ref)}
      precio={uno(sp.precio)}
    />
  );
}
