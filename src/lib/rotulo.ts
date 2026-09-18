// ─── Qué se imprime en el rótulo de envío ────────────────────────────────────
//
// El rótulo sale de la casa pegado a una caja: lo leen el cliente, el mensajero
// y cualquiera que pase al lado del paquete. El pedido, en cambio, carga datos
// que son SOLO nuestros —lo que nos costó, el margen, de qué proveedor salió y
// en qué enlace se compra—, y están en el mismo objeto, a un `.` de distancia.
//
// Por eso el rótulo no recibe un `Order`: recibe lo que devuelve esta función,
// que copia campo por campo lo que sí puede imprimirse. Si mañana alguien
// agrega un dato interno al pedido, no aparece en el rótulo por descuido; hay
// que venir aquí y escribirlo a mano.

import type { Order } from "./orders";
import { CONTACTO } from "./contacto";

export type Rotulo = {
  orderNumber: string;
  fecha: string;
  destinatario: {
    nombre:    string;
    direccion: string;
    telefono:  string;
    /** El mismo teléfono en E.164 (+57…), que es como lo quiere una vCard. */
    telefonoE164: string;
    ciudad:    string;
    departamento?: string;
    /** "BOGOTÁ, CUNDINAMARCA" — por donde se clasifica el paquete. */
    destino:   string;
  };
  remitente: {
    direccion: string;
    telefono:  string;
    email:     string;
    /** La ciudad cierra el bloque, igual que en el destinatario. */
    destino:   string;
  };
  fragil: boolean;
};

/** "3208891234" → "320 889 1234". Un número de diez dígitos corrido se copia mal
 *  cuando el mensajero llama desde la calle; agrupado se lee de un vistazo.
 *  Cualquier otro formato (fijo con indicativo, con guiones) se deja tal cual. */
function telefonoLegible(t: string): string {
  const d = t.replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : t;
}

/** El mismo número en el formato que piden los teléfonos: "+573208891234".
 *  Si ya trae indicativo de país se respeta; si no, se asume Colombia. */
function telefonoE164(t: string): string {
  const d = t.replace(/\D/g, "");
  if (t.trim().startsWith("+")) return `+${d}`;
  if (d.length === 10) return `+57${d}`;
  return d.startsWith("57") ? `+${d}` : `+57${d}`;
}

/** Lo que se rompe si la caja se cae o se apila. */
const FRAGIL = /\b(monitor|pantalla|televisor|tv|port[áa]til|laptop|all[\s-]?in[\s-]?one|impresora|vidrio|cristal)\b/i;

export function rotuloDe(order: Order): Rotulo {
  const c = order.cliente;
  const p = order.producto;
  return {
    orderNumber: order.orderNumber,
    fecha: order.fecha,
    destinatario: {
      nombre:    c.nombre,
      direccion: c.direccion,
      telefono:  telefonoLegible(c.telefono),
      telefonoE164: telefonoE164(c.telefono),
      ciudad:    c.ciudad,
      departamento: c.departamento,
      destino:   [c.ciudad, c.departamento].filter(Boolean).join(", ").toUpperCase(),
    },
    remitente: {
      direccion: CONTACTO.direccion,
      telefono:  CONTACTO.telefonoVisible,
      email:     CONTACTO.email,
      destino:   `${CONTACTO.ciudad}, ${CONTACTO.departamento}`.toUpperCase(),
    },
    // El nombre del producto NO se imprime: el rótulo va pegado a la caja y decir
    // "portátil" invita a que el paquete no llegue. Solo viaja si es frágil, que es
    // lo que necesita saber quien lo carga.
    fragil: FRAGIL.test(`${p.nombre} ${p.modelo ?? ""}`),
  };
}

/** En una vCard la coma, el punto y coma y la barra invertida separan campos:
 *  una dirección como "Calle 1 # 2 - 3, Apto 4" partiría el valor en dos. */
const esc = (s: string) => s.replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");

/**
 * Los datos de entrega como vCard, que es lo que va dentro del QR.
 *
 * Se escogió vCard y no texto suelto porque cualquier teléfono, al escanearla,
 * ofrece guardar el contacto con nombre, teléfono y dirección ya escritos: quien
 * tenga que pasar el envío al sistema de la transportadora no vuelve a teclear
 * una dirección larga (que es donde se pierden los paquetes).
 *
 * Lleva EXACTAMENTE lo mismo que ya está impreso al lado en letra grande. Nada de
 * cédula, correo, producto ni valor: el QR va por fuera de la caja y lo puede leer
 * cualquiera, así que no puede saber más que el propio rótulo.
 */
export function vcardDe(r: Rotulo): string {
  const d = r.destinatario;
  // Cada carácter de más engorda el QR, y un QR más denso necesita más tamaño
  // impreso para poder leerse. Con la vCard completa —`N:` repitiendo el nombre,
  // los `TYPE=`, "Colombia" entero— eran 65 módulos: a los 21 mm que caben en el
  // rótulo, cada punto medía 0,32 mm y ningún teléfono lo enfocaba. Recortada son
  // 53 módulos, que a 25 mm dan puntos de 0,47 mm: eso sí se escanea.
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${esc(d.nombre)}`,
    `TEL:${d.telefonoE164}`,
    // ADR: apartado postal; dirección extendida; calle; ciudad; departamento; código postal; país
    `ADR:;;${esc(d.direccion)};${esc(d.ciudad)};${esc(d.departamento ?? "")};;CO`,
    `NOTE:Pedido ${r.orderNumber}`,
    "END:VCARD",
  ].join("\n");
}
