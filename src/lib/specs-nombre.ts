// ─── Specs deducidas del NOMBRE de un producto ────────────────────────────────
//
// Las listas de proveedor casi nunca traen specs estructuradas: la información viene
// dentro del nombre, y cada proveedor lo escribe a su manera —"16GB DDR5 / 512GB SSD",
// "(16/512)", "E14" para catorce pulgadas—. Estas funciones son las que lo interpretan.
//
// Viven en su propio módulo porque las usan DOS sitios: la ficha que ve el cliente y el
// completador que decide qué productos necesitan consulta. Tenerlas duplicadas ya falló:
// la copia no conocía la notación "(16/512)" y daba por incompletos equipos que sí traían
// memoria y disco, lo que habría gastado consultas de pago en datos que ya teníamos.

/** Quita del nombre el tramo de la tarjeta gráfica.
 *
 *  La VRAM no es la RAM del equipo, y confundirlas tiene consecuencias: un portátil
 *  "TUF Gaming A15 Ryzen 5 7535HS RTX 3050 4GB" se leía como si tuviera 4GB de memoria,
 *  no llegaba al mínimo de 16GB que se le exige a un equipo de trabajo pesado y quedaba
 *  FUERA de las búsquedas de diseño o edición. De los diez portátiles con gráfica
 *  dedicada de las listas, nueve desaparecían por esto. */
export function sinVram(nombre: string): string {
  return nombre.replace(/\b(?:rtx|gtx|radeon\s*rx|rx)\s*\d{3,4}\s*(?:ti|super)?\s*\d{0,2}\s*gb?/gi, " ");
}

/** RAM y almacenamiento declarados en el nombre de un equipo, en GB. Cubre las formas que
 *  conviven en los datos:
 *    "16GB DDR4 SSD 512GB SATA"  → 16 / 512   (Janus, verboso)
 *    "16GB 512GB"                → 16 / 512   (catálogo: RAM primero, es la convención)
 *    "(16/512)"                  → 16 / 512   (abreviatura de Ledacom)
 *    "SSD 2TB"                   → · / 2048
 *  Sin esto no se puede saber si dos equipos con el mismo CPU son la misma configuración. */
export function ramYDisco(nombre: string): { ram: number | null; disco: number | null } {
  const n = nombre.toLowerCase();

  const corto = n.match(/\(\s*(\d{1,3})\s*\/\s*(\d{1,4})\s*(tb|gb)?\s*\)/);
  if (corto) {
    let disco = parseInt(corto[2], 10);
    if (corto[3] === "tb" || disco <= 8) disco *= 1024; // "(16/2tb)" y "(16/2)" = 2TB
    return { ram: parseInt(corto[1], 10), disco };
  }

  const caps: { gb: number; i: number }[] = [];
  const re = /(\d+(?:[.,]\d+)?)\s*(tb|gb)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(n)) !== null) {
    caps.push({ gb: parseFloat(m[1].replace(",", ".")) * (m[2] === "tb" ? 1024 : 1), i: m.index });
  }
  if (caps.length === 0) return { ram: null, disco: null };

  // RAM: la capacidad pegada a "ram/ddr"; si no, la primera que sea de tamaño de RAM.
  const pegadaARam = caps.find((c) => /\b(ram|ddr[2345]|dimm)\b/.test(n.slice(Math.max(0, c.i - 14), c.i + 18)));
  const ram = pegadaARam?.gb ?? caps.find((c) => c.gb <= 128)?.gb ?? null;
  // Disco: la primera capacidad que no es la RAM y tiene tamaño de disco.
  const disco = caps.find((c) => c.gb !== ram && c.gb >= 120)?.gb ?? null;
  return { ram, disco };
}

/** Tamaño de pantalla SOLO si el nombre lo dice: en pulgadas explícitas ("15,6\"",
 *  "PANTALLA 16\"") o en el código de serie pegado a las letras (E14, V14, A15). Ese
 *  código es la convención del fabricante. NO se deduce de nada más: "Win 11" lleva un
 *  11 que no es una pantalla, y preferimos no poner el dato antes que inventarlo. */
export function pantallaDesdeNombre(n: string): string | null {
  const explicita = n.match(/\b(1[1-7])(?:[.,](\d))?\s*(?:"|''|pulg)/i);
  if (explicita) return `${explicita[1]}${explicita[2] ? `.${explicita[2]}` : ""}"`;
  // Los fabricantes ponen el tamaño en el nombre comercial: "Victus 15-fb3019la",
  // "Legion 5 15AHP10", "Vivobook 16X". Sin leerlo, esos portátiles se presentaban SIN
  // pantalla, que es de las tres cosas que un cliente mira antes de comprar. Se exige que
  // el número esté pegado a un guion o a un código de modelo para no confundirlo con
  // cualquier cifra suelta.
  // El descarte de GB/TB es imprescindible: sin él, los "16GB" de la memoria se leían como
  // una pantalla de 16 pulgadas.
  const comercial = n.match(/\b(1[1-7])(?=-|(?![GT]B\b)[A-Z]{2,})/);
  const serie = n.match(/\b[A-Za-z]{1,4}(1[1-7])\b/) ?? comercial;
  if (!serie) return null;
  // El código de serie da el tamaño redondeado: en portátiles un "15" es 15.6" y un "17"
  // es 17.3" (convención de todos los fabricantes). Los demás sí son exactos.
  const pulg = serie[1];
  return pulg === "15" ? '15.6"' : pulg === "17" ? '17.3"' : `${pulg}"`;
}
