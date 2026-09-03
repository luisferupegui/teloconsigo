import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// ─── La sesión del panel, firmada ────────────────────────────────────────────
//
// La cookie valía la cadena constante "yes" y `proxy.ts` comprobaba
// literalmente eso:
//
//     request.cookies.get("admin_auth")?.value === "yes"
//
// El login la emitía con `httpOnly`, que impide LEERLA desde JavaScript, pero no
// impide FABRICARLA: escribir `document.cookie = "admin_auth=yes"` en la consola
// del navegador creaba una cookie con ese nombre y ese valor, y el servidor no
// podía distinguirla de la buena. Cualquiera entraba al panel sin usuario ni
// contraseña — catálogo, precios, márgenes, pedidos y usuarios.
//
// Ahora la cookie lleva un dato firmado con un secreto del servidor. Falsificarla
// exige el secreto, y el secreto no sale del servidor.
//
// El formato es `payload.firma`, ambos en base64url:
//
//     eyJ1IjoiQWRtaW4iLCJleHAiOjE3...  .  qXsF3nK9…
//     └─ quién y hasta cuándo ─┘         └─ HMAC-SHA256 ─┘
//
// Se firma el payload entero, así que cambiar el usuario o alargar la caducidad
// invalida la firma. La comparación es en tiempo constante para no filtrar por
// cuánto tarda en fallar.

const COOKIE = "admin_auth";
const HORAS = 8;

/**
 * El secreto con el que se firma.
 *
 * `ADMIN_SESSION_SECRET` manda si está definido: es lo que hay que poner en
 * producción para poder rotarlo sin tocar las credenciales.
 *
 * Si no está, se deriva del propio fichero de credenciales. No es una
 * ocurrencia: ese fichero ya es secreto —contiene los hashes scrypt—, existe
 * dondequiera que corra la app, y no hay que configurar nada para que esto
 * funcione desde el primer despliegue. Que cambiar una contraseña invalide las
 * sesiones abiertas es, además, el comportamiento deseable.
 *
 * Si no hubiera ni una cosa ni la otra, se falla CERRADO: sin secreto no se
 * firma nada y no se valida nada, así que nadie entra. Es preferible quedarse
 * fuera del panel a dejarlo abierto.
 */
function secreto(): string | null {
  const delEntorno = process.env.ADMIN_SESSION_SECRET?.trim();
  if (delEntorno) return delEntorno;

  try {
    const archivo = path.join(process.cwd(), "data", "admin-users.json");
    const contenido = fs.readFileSync(archivo, "utf-8").trim();
    if (!contenido) return null;
    // Se deriva, no se usa tal cual: el secreto de firma no debe ser el mismo
    // material que guarda las contraseñas.
    return crypto.createHash("sha256").update("sesion-admin:" + contenido).digest("hex");
  } catch {
    return null;
  }
}

const b64 = (b: Buffer) => b.toString("base64url");

function firmar(payload: string, clave: string): string {
  return b64(crypto.createHmac("sha256", clave).update(payload).digest());
}

/** El valor de la cookie para un usuario que acaba de autenticarse. `null` si
 *  el servidor no tiene con qué firmar. */
export function crearSesion(usuario: string): { valor: string; maxAge: number } | null {
  const clave = secreto();
  if (!clave) return null;

  const maxAge = HORAS * 60 * 60;
  const payload = b64(
    Buffer.from(JSON.stringify({ u: usuario, exp: Date.now() + maxAge * 1000 })),
  );
  return { valor: `${payload}.${firmar(payload, clave)}`, maxAge };
}

/** Quién es el dueño de esta cookie, o `null` si no es válida, está caducada o
 *  viene falsificada. */
export function leerSesion(valor: string | undefined | null): { usuario: string } | null {
  const clave = secreto();
  if (!clave || !valor) return null;

  const corte = valor.lastIndexOf(".");
  if (corte <= 0) return null;
  const payload = valor.slice(0, corte);
  const firma = valor.slice(corte + 1);

  const esperada = firmar(payload, clave);
  // Longitudes distintas hacen que `timingSafeEqual` lance, así que se comprueba
  // antes; comparar antes por longitud no filtra nada que no se vea ya.
  if (firma.length !== esperada.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;

  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (typeof u !== "string" || typeof exp !== "number" || Date.now() > exp) return null;
    return { usuario: u };
  } catch {
    return null;
  }
}

export const COOKIE_SESION = COOKIE;

/**
 * Las opciones con las que se emite y se borra la cookie, en un solo sitio para
 * que el logout no se desincronice del login.
 *
 * SIN `maxAge` la cookie es de SESIÓN: el navegador la borra al cerrarse. Antes
 * se emitía con ocho horas de vida, así que cerrar el navegador —o el portátil
 * en una oficina compartida— dejaba la sesión abierta y el siguiente que abriera
 * la página entraba al panel sin escribir nada.
 *
 * El límite de ocho horas no se pierde: va firmado dentro del propio dato, así
 * que una cookie robada tampoco vale más allá de ese plazo.
 *
 * Con `maxAge` 0 se borra, que es lo que hace el logout.
 */
export function opcionesCookie(maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    ...(maxAge === undefined ? {} : { maxAge }),
    secure: process.env.NODE_ENV === "production",
  };
}
