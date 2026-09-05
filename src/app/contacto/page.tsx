import type { Metadata } from "next";
import ContactoPage from "./contacto-client";
import { CONTACTO } from "@/lib/contacto";

// Esta ruta es un componente de CLIENTE (estado, formularios, hooks) y por eso
// no podía exportar `metadata`: heredaba el título y la descripción por defecto
// del sitio, y varias páginas competían entre sí con el mismo texto en Google.
// La página vive ahora en ./contacto-client.tsx y aquí queda solo su metadata.
export const metadata: Metadata = {
  title: "Contacto",
  description: `Escríbenos o llámanos: ${CONTACTO.telefonoVisible}, ${CONTACTO.email}. Atención de lunes a viernes de 8:00 am a 6:00 pm desde Medellín para toda Colombia.`,
  alternates: { canonical: "/contacto" },
  openGraph: {
    title: "Contacto",
    description: `Escríbenos o llámanos: ${CONTACTO.telefonoVisible}, ${CONTACTO.email}. Atención de lunes a viernes de 8:00 am a 6:00 pm desde Medellín para toda Colombia.`,
    type: "website",
    locale: "es_CO",
    url: "/contacto",
    siteName: "Te lo Consigo",
  },
};

export default function Page() {
  return <ContactoPage />;
}
