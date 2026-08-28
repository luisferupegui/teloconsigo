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

export default function Page() {
  return <AsesorPage />;
}
