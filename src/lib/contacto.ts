// ─── Cómo se contacta al negocio: un solo sitio ──────────────────────────────
//
// El teléfono estaba escrito a mano en DIEZ archivos —el pie de página, el botón
// flotante, contacto, garantía, devoluciones, preguntas frecuentes, la vista
// rápida de un producto, los datos que Google publica y las dos despedidas de
// Andrea— y en tres formas distintas: con espacios para leerlo, en E.164 para el
// enlace `tel:` y sin el "+" porque es como lo quiere wa.me.
//
// Cambiarlo obligaba a encontrar las diez, y el día que se olvidara una, la web
// seguiría mandando clientes a una línea que ya no es nuestra. Eso no se nota:
// nadie escribe para avisar de que no le contestaron.
//
// Este módulo no importa nada a propósito: lo usan componentes de cliente y de
// servidor, y así entra en cualquiera de los dos sin arrastrar equipaje.

export const CONTACTO = {
  /** E.164, que es lo que piden `tel:` y los datos estructurados de Google. */
  telefono: "+573126686577",
  /** Como se lee en pantalla. */
  telefonoVisible: "+57 312 6686577",
  /** Sin "+" ni espacios: wa.me no acepta otra cosa. */
  whatsapp: "573126686577",
  email: "contacto@teloconsigo.co",
  /** El correo con el que se cierra una cotización. */
  emailVentas: "ventas@teloconsigo.co",
} as const;

/** Enlace de WhatsApp. El mensaje se codifica aquí: escrito a mano en la URL era
 *  ilegible y a la primera tilde mal escapada el chat se abre en blanco. */
export const whatsappUrl = (mensaje?: string) =>
  `https://wa.me/${CONTACTO.whatsapp}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""}`;
