// ─── Cómo llama la gente a cada categoría ─────────────────────────────────────
//
// El nombre de un producto casi nunca dice de qué tipo es. En las listas hay 37 procesadores
// y solo DOS se llaman "PROCESADOR…"; el resto son "AMD RYZEN 5 5600G" o "INTEL CORE I5
// 12400". Con las placas pasa igual: 24 motherboards y dos que dicen "BOARD".
//
// Además cada documento agrupa a su manera —el de Infoshop titula "PROCESADORES AMD" y
// "PROCESADORES INTEL", o "BOARDS ASUS"— mientras el catálogo agrupa por tipo. Sin un puente
// entre ambas formas de nombrar, buscar "board" o "procesador" devolvía casi nada.
//
// Esta tabla es ese puente, y la usan los dos buscadores: el del panel y el de Andrea.

const SINONIMOS: [RegExp, string][] = [
  [/^(procesador(es)?|cpu|micro|microprocesador)$/,             "procesador"],
  [/^(board|boards|placa|placas|motherboard|mainboard|madre)$/, "motherboard"],
  [/^(ram|memoria|memorias|dimm|sodimm)$/,                      "memoria-ram"],
  [/^(disco|discos|almacenamiento|ssd|nvme|hdd|dd)$/,           "almacenamiento"],
  [/^(grafica|graficas|gpu|video|vga)$/,                        "tarjeta-grafica"],
  [/^(monitor|monitores|pantalla|pantallas)$/,                  "monitor"],
  [/^(fuente|fuentes|psu|poder)$/,                              "fuente-poder"],
  [/^(cooler|coolers|ventilador|ventiladores|refrigeracion|disipador)$/, "refrigeracion"],
  [/^(portatil|portatiles|laptop|laptops|notebook)$/,           "portatil"],
  [/^(servidor|servidores|server)$/,                            "servidor"],
  [/^(impresora|impresoras|toner)$/,                            "impresora"],
  [/^(teclado|teclados)$/,                                      "teclado"],
  [/^(mouse|raton|ratones)$/,                                   "mouse"],
  [/^(audifonos|auriculares|diadema|diademas|headset)$/,        "auriculares"],
  [/^(red|redes|router|switch|wifi)$/,                          "redes"],
  [/^(accesorio|accesorios)$/,                                  "accesorios"],
  [/^(escritorio|torre|pc|computador|computadores|equipo)$/,    "escritorio"],
];

/** La categoría que nombra un término de búsqueda. `null` si no nombra ninguna. */
export function categoriaDeTermino(token: string): string | null {
  return SINONIMOS.find(([re]) => re.test(token))?.[1] ?? null;
}

// Índice inverso: categoría → todas las palabras con que la gente la nombra. Se calcula una
// vez, al cargar el módulo.
const PALABRAS: Record<string, string> = {};
for (const [re, cat] of SINONIMOS) {
  // Se recuperan las alternativas del propio patrón: son la lista de sinónimos.
  const alternativas = re.source.replace(/^\^\(|\)\$$/g, "").split("|")
    .map((a) => a.replace(/\(es\)\?/g, "es").replace(/[()?]/g, ""))
    .filter(Boolean);
  PALABRAS[cat] = [...new Set([...alternativas, cat])].join(" ");
}

/** Todas las formas de nombrar la categoría de un producto, para añadirlas al texto sobre el
 *  que se busca. Así un cliente que escribe "placa madre" encuentra un "MSI PRO B650M". */
export function palabrasDeCategoria(categoria: string): string {
  return PALABRAS[categoria] ?? categoria;
}
