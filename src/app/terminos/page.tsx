import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/terminos" },
  title: "Términos y Condiciones",
  description: "Términos y condiciones de uso del sitio web y servicios de Te lo Consigo.",
};

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-white py-16 px-4">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-[#1e6cff] hover:underline mb-8 inline-block">
          ← Volver al inicio
        </Link>

        <h1 className="font-display text-3xl font-black text-zinc-900 mb-2">
          Términos y Condiciones
        </h1>
        <p className="text-sm text-zinc-500 mb-10">
          Última actualización: junio 2025 · Te lo Consigo S.A.S. · Colombia
        </p>

        <div className="prose prose-zinc max-w-none space-y-8 text-[15px] leading-relaxed text-zinc-700">

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">1. Aceptación de los términos</h2>
            <p>
              Al acceder y utilizar el sitio web <strong>teloconsigo.co</strong> y sus servicios, usted acepta
              quedar vinculado por los presentes Términos y Condiciones, así como por nuestra Política de
              Privacidad. Si no está de acuerdo con alguna parte de estos términos, le pedimos que no utilice
              nuestro sitio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">2. Descripción del servicio</h2>
            <p>
              Te lo Consigo es una tienda de tecnología B2B ubicada en Colombia que ofrece hardware, periféricos,
              equipos de cómputo y asesoría personalizada para empresas y profesionales. Nuestro servicio incluye:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Cotización y venta de productos tecnológicos</li>
              <li>Asesoría personalizada para armar equipos de cómputo</li>
              <li>Servicio de consecución de productos no disponibles en inventario</li>
              <li>Soporte post-venta y garantía oficial</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">3. Cotizaciones y precios</h2>
            <p>
              Los precios mostrados en el sitio son de referencia y pueden variar según disponibilidad, tasas de
              cambio y condiciones del mercado. Todas las cotizaciones formales se envían por correo electrónico
              o WhatsApp con vigencia de 48 horas. No realizamos ventas directas a través del sitio web; el proceso
              de compra se completa mediante contacto con nuestro equipo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">4. Propiedad intelectual</h2>
            <p>
              Todo el contenido del sitio — textos, imágenes, logotipos, código fuente y diseño — es propiedad
              de Te lo Consigo o de sus respectivos titulares de derechos. Queda prohibida su reproducción total
              o parcial sin autorización escrita previa.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">5. Limitación de responsabilidad</h2>
            <p>
              Te lo Consigo no será responsable por daños indirectos, incidentales o consecuentes derivados del
              uso del sitio. La información sobre especificaciones técnicas de productos proviene de los fabricantes
              y puede estar sujeta a cambios sin previo aviso.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">6. Ley aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa será sometida
              a la jurisdicción de los tribunales competentes de Colombia.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">7. Contacto</h2>
            <p>
              Para consultas sobre estos términos, contáctenos en{" "}
              <a href="mailto:contacto@teloconsigo.co" className="text-[#1e6cff] hover:underline">
                contacto@teloconsigo.co
              </a>.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
