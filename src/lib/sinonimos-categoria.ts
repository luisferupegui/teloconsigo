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

// ─── Categorías que las LISTAS nombran de otra forma ─────────────────────────
//
// La tabla de arriba se construye desde los términos de búsqueda, así que solo cubre las
// categorías que alguien escribiría en un buscador. Las listas de proveedor archivan con
// otros nombres —"perifericos", "software", "tableta", "all-in-one"…— y esas categorías se
// quedaban SIN NINGUNA palabra puente: `palabrasDeCategoria("perifericos")` devolvía
// "perifericos" y ya.
//
// El efecto en el cliente: los 25 productos Logitech de la lista viven en "perifericos", y
// una "Diadema G335 Alámbrica 3.5mm" no dice "audífonos" por ningún lado. Quien escribía
// "audífonos para oficina" no la encontraba nunca — puntuaba cero y el primer filtro la
// eliminaba, aunque la teníamos disponible con entrega en 1-3 días.
//
// Cada entrada lista TODO lo que un cliente podría escribir para llegar a esos productos.
const EXTRA: Record<string, string> = {
  "perifericos":                 "periferico perifericos accesorio accesorios teclado teclados mouse raton ratones audifonos auriculares diadema diademas headset combo",
  "software":                    "software licencia licencias windows office antivirus suscripcion",
  "camara":                      "camara camaras webcam camara web video",
  "streaming":                   "streaming camara webcam microfono micro capturadora aro de luz podcast",
  "tableta":                     "tableta tabletas tablet tablets ipad",
  "all-in-one":                  "all in one aio todo en uno computador equipo escritorio pc",
  "todo-en-uno":                 "all in one aio todo en uno computador equipo escritorio pc",
  "pc-equipos-de-marca":         "computador computadores equipo escritorio pc torre marca optiplex thinkcentre prodesk",
  "escritorio-alto-rendimiento": "escritorio torre pc computador computadores equipo gamer gaming workstation estacion de trabajo",
  "proteccion":                  "proteccion ups regulador reguladores multitoma supresor bateria respaldo",
  "mini-pc":                     "mini pc minipc nuc mini computador barebone computador equipo",
};

/** Todas las formas de nombrar la categoría de un producto, para añadirlas al texto sobre el
 *  que se busca. Así un cliente que escribe "placa madre" encuentra un "MSI PRO B650M". */
export function palabrasDeCategoria(categoria: string): string {
  return PALABRAS[categoria] ?? EXTRA[categoria] ?? categoria;
}
