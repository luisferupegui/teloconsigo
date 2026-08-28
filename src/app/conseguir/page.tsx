import type { Metadata } from "next";
import ConseguirPage from "./conseguir-client";

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

export default function Page() {
  return <ConseguirPage />;
}
