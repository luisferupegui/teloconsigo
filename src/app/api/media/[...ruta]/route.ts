import { NextRequest } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";

// ─── Imágenes SUBIDAS DESDE EL PANEL ─────────────────────────────────────────
//
// EL PROBLEMA. Next.js lee el contenido de `public/` UNA SOLA VEZ, al arrancar el
// servidor de producción, y guarda la lista de archivos en memoria
// (`router-utils/filesystem.js`: `recursiveReadDir(publicFolderPath)` →
// `publicFolderItems`). Cada petición se resuelve contra ESA lista. Un archivo que
// aparece en el disco DESPUÉS del arranque no está en la lista, así que devuelve 404
// aunque exista — hasta el siguiente reinicio.
//
// En desarrollo no pasa (ahí se mira el disco en cada petición), y por eso subir una
// imagen funcionaba en local y fallaba "en la web": el admin subía la foto de un
// producto o de una línea, el panel mostraba la miniatura rota, y el archivo estaba
// perfectamente guardado en el volumen.
//
// LA SOLUCIÓN. Un `fallback` rewrite en next.config.ts manda aquí todo lo que pida
// `/productos/*` o `/lineas/*` y NO haya encontrado como archivo estático. Es decir:
// lo que venía con el build se sigue sirviendo estático (rápido, sin pasar por Node)
// y solo lo subido después llega a esta ruta, que sí mira el disco.
//
// Por eso este handler NO necesita conocer las URLs: no cambia ni una sola referencia
// del resto del código.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Solo estas raíces. Son las que el panel escribe en caliente; el resto de `public/`
// viene con el build y nunca llega hasta aquí.
//
// `lineas-subidas` no está en `public/` sino en `data/lineas-img/`: ese directorio SÍ
// es volumen persistente en Railway, así que una imagen subida desde el panel sobrevive
// al siguiente deploy (ver src/lib/line-images.ts).
const RAICES: Record<string, string> = {
  productos:        path.join(process.cwd(), "public", "productos"),
  lineas:           path.join(process.cwd(), "public", "lineas"),
  "lineas-subidas": path.join(process.cwd(), "data", "lineas-img"),
};

const TIPOS: Record<string, string> = {
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ruta: string[] }> },
) {
  const { ruta } = await params;
  const partes = (ruta ?? []).map((s) => decodeURIComponent(s));

  // Recorrido de directorios: ni "..", ni rutas absolutas, ni nombres vacíos.
  if (partes.length < 2) return new Response("No encontrado", { status: 404 });
  const base = RAICES[partes[0]];
  if (!base) return new Response("No encontrado", { status: 404 });
  if (partes.some((s) => !s || s === "." || s === ".." || s.includes("/") || s.includes("\\"))) {
    return new Response("No encontrado", { status: 404 });
  }

  const tipo = TIPOS[path.extname(partes[partes.length - 1]).toLowerCase()];
  if (!tipo) return new Response("No encontrado", { status: 404 });

  const abs = path.join(base, ...partes.slice(1));
  // Cinturón y tirantes: aunque los filtros de arriba ya lo impiden, se comprueba que
  // la ruta resuelta siga dentro de su raíz.
  if (!abs.startsWith(base + path.sep)) return new Response("No encontrado", { status: 404 });

  let info;
  try {
    info = await stat(abs);
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
  if (!info.isFile()) return new Response("No encontrado", { status: 404 });

  // Mismo criterio de caché que aplica Next a `public/`: estos archivos se reemplazan
  // desde el panel y el navegador tiene que enterarse. El `?v=` de las URLs hace el
  // resto del trabajo.
  return new Response(Readable.toWeb(createReadStream(abs)) as ReadableStream, {
    headers: {
      "Content-Type":   tipo,
      "Content-Length": String(info.size),
      "Cache-Control":  "public, max-age=0, must-revalidate",
      "Last-Modified":  info.mtime.toUTCString(),
    },
  });
}
