import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Política de privacidad y tratamiento de datos personales de Te lo Consigo.",
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-white py-16 px-4">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-[#1e6cff] hover:underline mb-8 inline-block">
          ← Volver al inicio
        </Link>

        <h1 className="font-display text-3xl font-black text-zinc-900 mb-2">
          Política de Privacidad
        </h1>
        <p className="text-sm text-zinc-500 mb-10">
          Última actualización: junio 2025 · Te lo Consigo S.A.S. · Colombia
        </p>

        <div className="prose prose-zinc max-w-none space-y-8 text-[15px] leading-relaxed text-zinc-700">

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">1. Responsable del tratamiento</h2>
            <p>
              Te lo Consigo S.A.S., con domicilio en Colombia, es responsable del tratamiento de sus datos
              personales de conformidad con la Ley 1581 de 2012 (Ley de Protección de Datos Personales) y el
              Decreto 1377 de 2013.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">2. Datos que recopilamos</h2>
            <p>Recopilamos únicamente los datos necesarios para prestar nuestros servicios:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Datos de contacto:</strong> nombre, correo electrónico, teléfono y empresa (cuando aplica)</li>
              <li><strong>Datos de navegación:</strong> páginas visitadas, productos consultados (sin identificación personal)</li>
              <li><strong>Datos de cotización:</strong> información sobre los productos de interés</li>
            </ul>
            <p className="mt-3">
              <strong>No recopilamos</strong> datos de tarjetas de crédito ni información financiera sensible.
              Las transacciones se coordinan directamente con nuestro equipo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">3. Finalidad del tratamiento</h2>
            <p>Sus datos se utilizan exclusivamente para:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Responder solicitudes de cotización y contacto</li>
              <li>Enviar información sobre productos y promociones (solo con su consentimiento)</li>
              <li>Mejorar la experiencia de usuario en el sitio</li>
              <li>Cumplir obligaciones legales y contractuales</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">4. Almacenamiento local</h2>
            <p>
              Este sitio utiliza <strong>almacenamiento local del navegador</strong> (localStorage) para guardar
              su carrito de compras y lista de favoritos. Esta información permanece en su dispositivo y no se
              transmite a nuestros servidores. Puede borrarla en cualquier momento desde la configuración de
              su navegador.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">5. Compartición de datos</h2>
            <p>
              No vendemos, alquilamos ni compartimos sus datos personales con terceros, excepto cuando sea
              necesario para prestar el servicio (por ejemplo, empresas de logística para entregas) o cuando
              sea requerido por ley.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">6. Sus derechos (Habeas Data)</h2>
            <p>
              De acuerdo con la Ley 1581 de 2012, usted tiene derecho a conocer, actualizar, rectificar y
              suprimir sus datos personales. Para ejercer estos derechos, contáctenos en{" "}
              <a href="mailto:contacto@teloconsigo.co" className="text-[#1e6cff] hover:underline">
                contacto@teloconsigo.co
              </a>{" "}
              indicando en el asunto &quot;Habeas Data&quot;.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">7. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política ocasionalmente. Los cambios se publicarán en esta página con
              la fecha de actualización. El uso continuado del sitio implica la aceptación de los cambios.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-zinc-900 mb-3">8. Contacto</h2>
            <p>
              Para consultas sobre privacidad o tratamiento de datos:{" "}
              <a href="mailto:contacto@teloconsigo.co" className="text-[#1e6cff] hover:underline">
                contacto@teloconsigo.co
              </a>
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
