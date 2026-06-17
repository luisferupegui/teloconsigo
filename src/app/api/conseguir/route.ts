import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const FROM    = "Te Lo Consigo <ventas@teloconsigo.co>";
const DEST    = "ventas@teloconsigo.co";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      nombre:      string;
      telefono:    string;
      correo?:     string;
      descripcion: string;
      presupuesto: string;
      ciudad?:     string;
    };

    const { nombre, telefono, correo, descripcion, presupuesto, ciudad } = body;

    if (!nombre?.trim() || !telefono?.trim() || !descripcion?.trim()) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const key = process.env.RESEND_API_KEY;
    if (!key) {
      // Sin key configurada: igual devolvemos éxito pero no enviamos
      console.warn("[conseguir] RESEND_API_KEY no configurada — correo no enviado");
      return NextResponse.json({ ok: true, warn: "no_key" });
    }

    const resend = new Resend(key);
    const fecha  = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      dateStyle: "full",
      timeStyle: "short",
    });

    await resend.emails.send({
      from: FROM,
      to:   DEST,
      replyTo: correo || undefined,
      subject: `📦 Solicitud "Te lo conseguimos" — ${nombre}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#18181b">
          <div style="background:#0d1e3a;padding:24px 32px;border-radius:12px 12px 0 0">
            <h1 style="color:#fff;margin:0;font-size:20px">📦 Nueva solicitud — Te lo conseguimos</h1>
            <p style="color:#94a3b8;margin:4px 0 0;font-size:13px">${fecha}</p>
          </div>

          <div style="background:#f8fafc;padding:24px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">

            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr style="border-bottom:1px solid #e2e8f0">
                <td style="padding:10px 0;color:#64748b;font-weight:600;width:140px">Nombre</td>
                <td style="padding:10px 0;color:#18181b;font-weight:700">${nombre}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0">
                <td style="padding:10px 0;color:#64748b;font-weight:600">WhatsApp / Tel.</td>
                <td style="padding:10px 0;color:#18181b"><a href="https://wa.me/${telefono.replace(/\D/g,"")}" style="color:#1e6cff;text-decoration:none">${telefono}</a></td>
              </tr>
              ${correo ? `
              <tr style="border-bottom:1px solid #e2e8f0">
                <td style="padding:10px 0;color:#64748b;font-weight:600">Correo</td>
                <td style="padding:10px 0;color:#18181b"><a href="mailto:${correo}" style="color:#1e6cff">${correo}</a></td>
              </tr>` : ""}
              ${ciudad ? `
              <tr style="border-bottom:1px solid #e2e8f0">
                <td style="padding:10px 0;color:#64748b;font-weight:600">Ciudad</td>
                <td style="padding:10px 0;color:#18181b">${ciudad}</td>
              </tr>` : ""}
              <tr style="border-bottom:1px solid #e2e8f0">
                <td style="padding:10px 0;color:#64748b;font-weight:600">Presupuesto</td>
                <td style="padding:10px 0;color:#18181b">${presupuesto}</td>
              </tr>
            </table>

            <div style="margin-top:20px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px">
              <p style="margin:0 0 6px;color:#64748b;font-weight:600;font-size:13px">¿Qué necesita conseguir?</p>
              <p style="margin:0;color:#18181b;font-size:14px;line-height:1.6;white-space:pre-wrap">${descripcion}</p>
            </div>

          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[conseguir] Error al enviar correo:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
