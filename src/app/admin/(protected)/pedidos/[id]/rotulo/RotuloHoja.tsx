import Image from "next/image";
import QRCode from "qrcode";
import { vcardDe, type Rotulo } from "@/lib/rotulo";

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

/** Rótulo "REMITENTE" / "DESTINATARIO": tipografía de titulares, muy espaciada y
 *  con un filete azul delante. Sola, en gris y pequeña, la palabra se leía como
 *  un pie de formulario; así ordena la hoja sin quitarle protagonismo al nombre. */
function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-[2mm] font-display text-[2.5mm] font-bold uppercase tracking-[0.3em] text-zinc-900">
      <span className="h-[0.7mm] w-[4mm] shrink-0 bg-[#1e6cff]" />
      {children}
    </p>
  );
}

/** La hoja del rótulo: 100 × 150 mm exactos, el tamaño de guía de las transportadoras.
 *  Solo pinta; qué datos puede pintar lo decide `rotuloDe` en @/lib/rotulo. */
export async function RotuloHoja({ r }: { r: Rotulo }) {
  // Corrección de errores "M": aguanta que el QR se raye o se moje un poco sin
  // dejar de leerse, sin agrandar tanto el código como el nivel "Q".
  const qr = await QRCode.toString(vcardDe(r), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
  });

  return (
    <>
      <div
        id="rotulo"
        className="mx-auto flex h-[150mm] w-[100mm] flex-col overflow-hidden bg-white text-black shadow-lg ring-1 ring-zinc-300 print:shadow-none print:ring-0"
      >
        {/* Cabecera: la marca */}
        <div className="flex items-end justify-between gap-[4mm] px-[7mm] pb-[3mm] pt-[5mm]">
          {/* Versión recortada y con fondo transparente del logo claro: el original
              trae tanto margen blanco que, a la altura que pide el rótulo, la marca
              se veía diminuta y descentrada. */}
          <Image
            src="/rotulo-logo.png"
            alt="teloconsigo.co"
            width={1600}
            height={368}
            className="h-[9mm] w-auto"
            priority
          />
          <span className="pb-[0.5mm] font-[family-name:var(--font-nav)] text-[4mm] uppercase leading-none tracking-[0.25em] text-zinc-400">
            Guía de envío
          </span>
        </div>

        {/* `min-h-0`: sin él la columna no puede encogerse y lo que sobra se sale
            por abajo de la hoja, que a 150 mm no perdona. */}
        <div className="flex min-h-0 flex-1 flex-col px-[7mm] pb-[6mm]">
          {/* Remitente: pequeño, arriba. Quien recibe no lo necesita leer de lejos. */}
          <Titulo>Remitente</Titulo>
          <p className="mt-[2mm] font-display text-[4.2mm] font-bold leading-tight">
            teloconsigo.co
          </p>
          <p className="mt-[1.2mm] text-[3.4mm] leading-[1.4] text-zinc-800">
            {r.remitente.direccion}
            <br />
            {r.remitente.telefono} · {r.remitente.email}
          </p>
          {/* La ciudad cierra el bloque, como en el destinatario */}
          <p className="mt-[1.5mm] font-display text-[3.8mm] font-semibold uppercase leading-tight tracking-[0.02em] text-zinc-900">
            {r.remitente.destino}
          </p>

          <div className="my-[3.5mm] border-t-[0.8mm] border-black" />

          {/* Destinatario: lo más grande del rótulo. Va en una caja que se queda con
              el espacio sobrante, para que un nombre o una dirección larguísimos se
              recorten aquí en vez de empujar el pie fuera de la hoja. */}
          {/* El sello va aquí arriba y no en el pie: abajo compite con el QR y el
              número de pedido, y los tres juntos no caben en 150 mm. Va FUERA de la
              caja que recorta, porque al estar inclinado se sale de su propio marco
              y el recorte le comía la esquina. */}
          <div className="flex items-start justify-between gap-[3mm]">
            <Titulo>Destinatario</Titulo>
            {r.fragil && (
              <div className="mt-[-0.5mm] mr-[1mm] shrink-0 -rotate-6 border-[0.6mm] border-black px-[3mm] py-[1mm] text-center">
                <p className="font-[family-name:var(--font-nav)] text-[5mm] uppercase leading-none tracking-[0.1em]">
                  Frágil
                </p>
                <p className="mt-[0.5mm] text-[2mm] font-semibold uppercase tracking-[0.18em]">
                  No apilar
                </p>
              </div>
            )}
          </div>

          {/* El bloque se queda con el espacio sobrante y recorta aquí si el nombre
              o la dirección son larguísimos, en vez de empujar el pie fuera de la hoja. */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <p className="mt-[3mm] font-display text-[6mm] font-bold leading-[1.12] tracking-[-0.01em]">
              {r.destinatario.nombre}
            </p>
            <p className="mt-[3mm] text-[3.9mm] leading-[1.35] text-zinc-800">
              {r.destinatario.direccion}
            </p>
            <p className="mt-[2.5mm] text-[3.9mm] font-semibold">Tel. {r.destinatario.telefono}</p>
            {/* La ciudad manda: es por donde se clasifica el paquete en la bodega */}
            <p className="mt-[3mm] font-display text-[5.2mm] font-bold uppercase leading-tight tracking-[0.02em]">
              {r.destinatario.destino}
            </p>
          </div>

          {/* Pie, anclado abajo */}
          <div className="pt-[2.5mm]">
            <div className="flex items-center justify-between border-t border-zinc-200 pt-[2.5mm] text-[3mm] text-zinc-500">
              <span>Peso ______ kg</span>
              <span>{formatFecha(r.fecha)}</span>
            </div>

            <div className="mt-[2.5mm] flex items-end justify-between gap-[4mm]">
              <div>
                <p className="font-[family-name:var(--font-nav)] text-[3.2mm] uppercase leading-none tracking-[0.3em] text-zinc-400">
                  Pedido
                </p>
                <p className="mt-[1.5mm] font-mono text-[7mm] font-bold leading-none tracking-tight">
                  {r.orderNumber}
                </p>
                {/* Qué hay dentro del QR, para quien nunca ha escaneado uno.
                    Va pegado al número para no robarle alto al destinatario. */}
                <p className="mt-[1.5mm] text-[2.3mm] uppercase tracking-[0.12em] text-zinc-400">
                  Escanea → datos de entrega
                </p>
              </div>

              {/* QR con los datos de entrega. Va abajo a la derecha, donde el lector
                  lo busca, y con un borde blanco propio: pegado a otra tinta, muchos
                  escáneres no encuentran el código. */}
              <div
                className="h-[25mm] w-[25mm] shrink-0 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* El navegador imprime la hoja al tamaño del rótulo y sin el resto del panel.
          `visibility` en vez de `display:none` para no recalcular el layout del rótulo. */}
      <style>{`
        @page { size: 100mm 150mm; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          #rotulo, #rotulo * { visibility: visible !important; }
          #rotulo {
            position: absolute !important;
            left: 0 !important; top: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
