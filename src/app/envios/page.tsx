import type { Metadata } from "next";
import EnviosPage from "./envios-client";

// Esta ruta es un componente de CLIENTE (estado, formularios, hooks) y por eso
// no podía exportar `metadata`: heredaba el título y la descripción por defecto
// del sitio, y varias páginas competían entre sí con el mismo texto en Google.
// La página vive ahora en ./envios-client.tsx y aquí queda solo su metadata.
export const metadata: Metadata = {
  title: "Envíos y entregas",
  description: "Envíos a toda Colombia en 2 a 5 días hábiles según la ciudad, con guía de rastreo. Conoce tiempos, cobertura y costos de entrega.",
  alternates: { canonical: "/envios" },
  openGraph: {
    title: "Envíos y entregas",
    description: "Envíos a toda Colombia en 2 a 5 días hábiles según la ciudad, con guía de rastreo. Conoce tiempos, cobertura y costos de entrega.",
    type: "website",
    locale: "es_CO",
    url: "/envios",
    siteName: "Te lo Consigo",
  },
};

export default function Page() {
  return <EnviosPage />;
}
