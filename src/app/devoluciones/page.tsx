import type { Metadata } from "next";
import DevolucionesPage from "./devoluciones-client";

// Esta ruta es un componente de CLIENTE (estado, formularios, hooks) y por eso
// no podía exportar `metadata`: heredaba el título y la descripción por defecto
// del sitio, y varias páginas competían entre sí con el mismo texto en Google.
// La página vive ahora en ./devoluciones-client.tsx y aquí queda solo su metadata.
export const metadata: Metadata = {
  title: "Cambios y devoluciones",
  description: "Política de cambios y devoluciones: plazos, condiciones y pasos para devolver o cambiar un producto comprado en teloconsigo.co.",
  alternates: { canonical: "/devoluciones" },
  openGraph: {
    title: "Cambios y devoluciones",
    description: "Política de cambios y devoluciones: plazos, condiciones y pasos para devolver o cambiar un producto comprado en teloconsigo.co.",
    type: "website",
    locale: "es_CO",
    url: "/devoluciones",
    siteName: "Te lo Consigo",
  },
};

export default function Page() {
  return <DevolucionesPage />;
}
