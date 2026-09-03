// ─── De un nombre de producto a su categoría de tienda ───────────────────────
//
// EL NOMBRE MANDA. Antes se decidía por la sección del catálogo (la columna del
// PDF donde caía el producto) y el nombre solo servía de respaldo. Era frágil por
// dos razones que se vieron juntas:
//
//   • Las secciones cambian con un banner suelto ("Sonido", "Otros Productos")
//     que no lleva la cabecera "Ref … Valor", así que no se detectaba y la
//     columna seguía arrastrando la sección anterior.
//   • Aunque se detectara, la sección es una pista sobre DÓNDE está impreso el
//     producto, no sobre qué es.
//
// El resultado eran cosas como "Parlante Genius SP-U125" clasificado en `mouse`
// y "HUB USB 3.0 X4" en `teclado`. Un nombre de producto, en cambio, se describe
// a sí mismo: un parlante dice "Parlante".
//
// EL ORDEN DE ESTA TABLA ES LA REGLA. Gana la primera que coincida, así que lo
// más específico va antes que lo más general: "Caja Para Disco 2.5\" HDD" es una
// caja (accesorio) aunque diga "Disco" y "HDD"; "Soporte TV Pared" es un soporte
// aunque diga "TV".

const REGLAS: [RegExp, string][] = [
  // ── Software: antes que nada, porque sus nombres mencionan de todo ──────────
  [/antivirus|\beset\b|kaspersky|norton|mcafee|avast|bitdefender/i,            "antivirus"],
  [/licencia|\blic\.|windows\s*\d|office|microsoft\s*365|\besd\b/i,            "licencia"],

  // ── Cosas que NOMBRAN otro producto sin serlo ──────────────────────────────
  // Van primero a propósito: "Caja Para Disco HDD" no es almacenamiento y
  // "Soporte TV Pared" no es un monitor.
  [/\bcaja\b|carcasa|enclosure|\bcase\b\s*(para|de)\b/i,                       "accesorios"],
  // El padmouse va ANTES que "soporte": un "PadMouse con soporte para muñeca"
  // es un pad, no un soporte.
  [/mousepad|pad\s*mouse|padmouse/i,                                           "mouse"],
  [/soporte|\bbrazo\b|elevador|\brack\s*(de\s*)?pared\b/i,                     "accesorios"],
  [/base\s*refrigerante|base\s*(para\s*)?port[aá]til.*ventilador/i,            "refrigeracion"],

  // ── Familias claras ────────────────────────────────────────────────────────
  [/impresora|multifuncional|t[oó]ner|cartucho|plotter/i,                      "impresora"],
  // También en inglés: los catálogos mezclan idiomas dentro de la misma línea
  // ("Xiaomi Type-C Earphones"), y con reglas solo en español caían en accesorios.
  // "Cabina" es como se llama en Colombia a un parlante amplificado. Sin ella,
  // una "Cabina Jaltech BT 6.5\"" caía en accesorios.
  [/parlante|altavoz|cabina|barra\s*de\s*sonido|aud[ií]fono|auricular|diadema|headset|micr[oó]fono|earphone|earbud|headphone|speaker/i, "auriculares"],
  [/webcam|c[aá]mara\s*web|c[aá]mara|\bnvr\b|grabador\sde\sv[íi]deo/i,                                        "camara"],
  // "Combo" en estas listas es siempre teclado + mouse. Va con teclado, que es
  // como lo trata el resto del sistema; el margen de ambos es el mismo, así que
  // la elección no cambia el precio.
  [/teclado|keyboard|\bcombo\b/i,                                              "teclado"],
  [/\bmouse\b|rat[oó]n\b|mousepad|pad\s*mouse/i,                               "mouse"],
  [/monitor|\bpantalla\b/i,                                                    "monitor"],
  [/\bups\b|regulador\s*de\s*voltaje|\bregulador\b|multitoma|supresor|no.?break/i, "proteccion"],
  [/router|\bswitch\b|access\s*point|punto\s*de\s*acceso|repetidor|antena|firewall|\bpoe\b/i, "redes"],
  [/refrigeraci[oó]n|disipador|\bcooler\b|ventilador/i,                        "refrigeracion"],
  [/fuente\s*de\s*(poder|alimentaci[oó]n)|\bpsu\b|80\s*plus/i,                 "fuente-poder"],
  // El chipset con el sufijo comercial: "ASUS TUF X870 PLUS GAMING WIFI",
  // "ASROCK B860 PRO - RS WIFI", "GIGABYTE H610M - H DDR4". Sin esta regla
  // caían en `redes` por el "WIFI" del rótulo de la página y acababan
  // ofreciéndose entre los routers.
  [/motherboard|mainboard|placa\s*(base|madre)|tarjeta\s*madre|\bboard\b/i,    "motherboard"],
  [/\b[abhxz]\d{3}[a-z]{0,2}\b.*\b(plus|wifi|tomahawk|aorus|steel\s*legend|prime|pro@S*-?@S*rs|ddr[45])\b/i, "motherboard"],
  [/tarjeta\s*(de\s*)?(video|gr[aá]fica)|\brtx\b|\bgtx\b|radeon|geforce|\bgpu\b/i, "tarjeta-grafica"],
  [/procesador|\bcpu\b|\bryzen\b|core\s*i[3579]|\bxeon\b/i,                    "procesador"],
  [/\bddr[2345]\b|sodimm|udimm|memoria\s*ram/i,                                "memoria-ram"],
  [/\bssd\b|\bnvme\b|\bhdd\b|disco\s*(duro|s[oó]lido)|\bm\.?2\b/i,             "almacenamiento"],
  [/memoria\s*usb|pen\s*drive|flash\s*drive|micro\s*sd|tarjeta\s*sd/i,         "accesorios"],
  [/\bhub\b|docking|\bdock\b|replicador|adaptador|convertidor|\bcable\b|extensi[oó]n/i, "accesorios"],
];

/** La categoría que dice el NOMBRE del producto. `null` si no la dice. */
export function categoriaPorNombre(nombre: string): string | null {
  return REGLAS.find(([re]) => re.test(nombre))?.[1] ?? null;
}

/** Sección del catálogo → categoría, para cuando el nombre no se define solo
 *  ("EVIL G Model BK01"). Es un respaldo, no la primera opción. */
const POR_SECCION: [RegExp, string][] = [
  [/teclado|combo/i,                 "teclado"],
  [/mouse|padmouse/i,                "mouse"],
  [/sonido|parlante|audio|diadema/i, "auriculares"],
  [/c[aá]mara/i,                     "camara"],
  [/monitor|pantalla/i,              "monitor"],
  [/impresor|t[oó]ner|tinta/i,       "impresora"],
  [/memoria|\bram\b|ddr/i,           "memoria-ram"],
  [/disco|almacenamiento|ssd|nvme/i, "almacenamiento"],
  [/procesador|cpu/i,                "procesador"],
  [/board|tarjeta madre/i,           "motherboard"],
  [/video|gr[aá]fica|gpu/i,          "tarjeta-grafica"],
  [/fuente|poder/i,                  "fuente-poder"],
  [/red|router|switch|wifi/i,        "redes"],
  [/port[aá]til|laptop/i,            "portatil"],
  [/ups|regulador|energ[ií]a/i,      "proteccion"],
];

/** Categoría de un producto de lista: primero lo que dice su nombre; si el
 *  nombre no se pronuncia, la sección donde estaba impreso; y si tampoco,
 *  accesorios. */
export function categoriaDeProducto(nombre: string, seccion?: string): string {
  return categoriaPorNombre(nombre)
    ?? (seccion ? POR_SECCION.find(([re]) => re.test(seccion))?.[1] ?? null : null)
    ?? "accesorios";
}
