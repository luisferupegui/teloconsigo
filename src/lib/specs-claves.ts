// ─── Qué clave de spec es cuál ───────────────────────────────────────────────
//
// Cada lista escribe sus claves a su manera: Ledacom manda "Ram", "Almacenamiento",
// "Tarjeta Gráfica", "S.O."; el catálogo propio y lo deducido del nombre usan "ram",
// "gpu", "so". Comparadas tal cual no coinciden nunca, y eso ya hizo daño dos veces:
// la ficha de Andrea ignoraba todas las specs de Ledacom, y el saneo de listas le
// añadía a cada producto una copia corta ("ram": "16GB") al lado de la buena ("Ram":
// "16GB DDR5-5200") — la corta quedaba primero y la ficha perdía el DDR5, el NVMe y
// los 165Hz.
//
// Este módulo es el único sitio que decide que dos claves son la misma. Lo usan la
// ficha del asesor y el saneo; con la regla en un solo lugar no pueden divergir.

const ALIAS: Record<string, string> = {
  procesador: "procesador", cpu: "procesador",
  ram: "ram", memoria: "ram", memoriaram: "ram",
  almacenamiento: "almacenamiento", disco: "almacenamiento", discoduro: "almacenamiento", ssd: "almacenamiento",
  pantalla: "pantalla", monitor: "monitor",
  gpu: "gpu", grafica: "gpu", tarjetagrafica: "gpu", tarjetadevideo: "gpu", video: "gpu",
  so: "so", sistema: "so", sistemaoperativo: "so",
  board: "board", placabase: "board", tarjetamadre: "board",
  capacidad: "capacidad", incluye: "incluye",
};

/** La clave sin mayúsculas, tildes ni signos: "Tarjeta Gráfica" → "tarjetagrafica". */
const plana = (k: string) =>
  k.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** El nombre común de una clave: "Ram" → "ram", "Tarjeta Gráfica" → "gpu", "S.O." → "so".
 *  Una clave que no está en la tabla se queda en su forma plana. */
export function claveCanonica(k: string): string {
  const p = plana(k);
  return ALIAS[p] ?? p;
}

/** ¿Estas specs ya traen, con cualquier grafía, la clave `k`? Sin contar la propia `k`. */
export function tieneEquivalente(specs: Record<string, string>, k: string): boolean {
  const c = claveCanonica(k);
  return Object.keys(specs).some((otra) => otra !== k && claveCanonica(otra) === c);
}
