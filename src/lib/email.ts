import "server-only";
import { Resend } from "resend";
import type { Order } from "./orders";

const FROM = "Andrea · teloconsigo.co <ventas@teloconsigo.co>";
const NOTIFY_TO = "ventas@teloconsigo.co";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

function formatCOP(n: number) {
  return "$" + n.toLocaleString("es-CO") + " COP";
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "full",
    timeStyle: "short",
  });
}

/** Notificación interna al equipo de ventas */
export async function sendOrderNotification(order: Order): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const { cliente, producto } = order;
  const proveedorLabel = producto.proveedor === "eeuu"
    ? "Bodega EE.UU. (entrega 6–10 días hábiles)"
    : "Disponibilidad local (entrega 3–5 días hábiles)";

  await resend.emails.send({
    from: FROM,
    to: NOTIFY_TO,
    subject: `🛍️ Pedido #${order.orderNumber} — ${producto.nombre} · ${cliente.nombre}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#18181b">
        <div style="background:#1e6cff;padding:20px 28px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">🛍️ Pedido #${order.orderNumber} · teloconsigo.co</h1>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">${formatFecha(order.fecha)}</p>
        </div>
        <div style="border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px">

          <h2 style="font-size:15px;margin:0 0 12px;color:#3f3f46">Datos del cliente</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:5px 0;color:#71717a;width:130px">Nombre</td><td><strong>${cliente.nombre}</strong></td></tr>
            <tr><td style="padding:5px 0;color:#71717a">Cédula</td><td>${cliente.cedula}</td></tr>
            <tr><td style="padding:5px 0;color:#71717a">Dirección</td><td>${cliente.direccion}, ${cliente.ciudad}</td></tr>
            <tr><td style="padding:5px 0;color:#71717a">Teléfono</td><td>${cliente.telefono}</td></tr>
            <tr><td style="padding:5px 0;color:#71717a">Correo</td><td>${cliente.email}</td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0">

          <h2 style="font-size:15px;margin:0 0 12px;color:#3f3f46">Producto solicitado</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:5px 0;color:#71717a;width:130px">Producto</td><td><strong>${producto.nombre}</strong>${producto.modelo ? ` (${producto.modelo})` : ""}</td></tr>
            <tr><td style="padding:5px 0;color:#71717a">Cantidad</td><td>${producto.cantidad} unidad${producto.cantidad !== 1 ? "es" : ""}</td></tr>
            <tr><td style="padding:5px 0;color:#71717a">Valor total</td><td><strong style="color:#1e6cff">${formatCOP(producto.precioCOP * producto.cantidad)}</strong></td></tr>
            <tr><td style="padding:5px 0;color:#71717a">Proveedor</td><td>${proveedorLabel}</td></tr>
          </table>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:13px;color:#166534">
            <strong>Estado:</strong> Pendiente de confirmación
          </div>

          <p style="font-size:12px;color:#a1a1aa;margin-top:20px">
            N° de orden: <strong>${order.orderNumber}</strong> · ID: ${order.id}
          </p>
        </div>
      </div>
    `,
  }).catch(() => { /* fallo silencioso — pedido ya quedó guardado */ });
}

/** Confirmación automática al cliente */
export async function sendClientConfirmation(order: Order): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const { cliente, producto } = order;
  const firstName = cliente.nombre.split(" ")[0];

  await resend.emails.send({
    from: FROM,
    to: cliente.email,
    subject: `Orden #${order.orderNumber} confirmada · teloconsigo.co`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#18181b">
        <div style="background:#1e6cff;padding:20px 28px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">¡Hola, ${firstName}! 🙌</h1>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">teloconsigo.co · Tecnología que buscas, al precio que mereces</p>
        </div>
        <div style="border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px">

          <p style="font-size:15px;line-height:1.6">
            Recibimos tu solicitud. En breve un representante de nuestro equipo
            te contactará al número <strong>${cliente.telefono}</strong> para confirmar
            el pedido y coordinar el pago. 😊
          </p>

          <hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0">

          <h2 style="font-size:15px;margin:0 0 12px;color:#3f3f46">Resumen de tu solicitud</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:5px 0;color:#71717a;width:120px">N° de orden</td><td><strong style="color:#1e6cff">#${order.orderNumber}</strong></td></tr>
            <tr><td style="padding:5px 0;color:#71717a">Producto</td><td><strong>${producto.nombre}</strong></td></tr>
            <tr><td style="padding:5px 0;color:#71717a">Cantidad</td><td>${producto.cantidad} unidad${producto.cantidad !== 1 ? "es" : ""}</td></tr>
            <tr><td style="padding:5px 0;color:#71717a">Valor</td><td><strong style="color:#1e6cff">${formatCOP(producto.precioCOP * producto.cantidad)}</strong></td></tr>
          </table>

          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:13px;color:#1e40af">
            ¿Tienes alguna duda? Escríbenos a <a href="mailto:ventas@teloconsigo.co" style="color:#1e6cff">ventas@teloconsigo.co</a>
          </div>

          <p style="font-size:13px;color:#71717a;margin-top:24px">
            Gracias por confiar en teloconsigo.co 🚀
          </p>
        </div>
      </div>
    `,
  }).catch(() => { /* fallo silencioso */ });
}
