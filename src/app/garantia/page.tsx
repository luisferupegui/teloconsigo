import type { Metadata } from "next";
import GarantiaPage from "./garantia-client";

// Esta ruta es un componente de CLIENTE (estado, formularios, hooks) y por eso
// no podía exportar `metadata`: heredaba el título y la descripción por defecto
// del sitio, y varias páginas competían entre sí con el mismo texto en Google.
// La página vive ahora en ./garantia-client.tsx y aquí queda solo su metadata.
export const metadata: Metadata = {
  title: "Garantía",
  description: "Todos nuestros productos tienen garantía. Conoce la cobertura, los plazos y cómo hacer efectiva la garantía de tu equipo en Colombia.",
  alternates: { canonical: "/garantia" },
  openGraph: {
    title: "Garantía",
    description: "Todos nuestros productos tienen garantía. Conoce la cobertura, los plazos y cómo hacer efectiva la garantía de tu equipo en Colombia.",
    type: "website",
    locale: "es_CO",
    url: "/garantia",
    siteName: "Te lo Consigo",
  },
};

export default function Page() {
  return <GarantiaPage />;
}
