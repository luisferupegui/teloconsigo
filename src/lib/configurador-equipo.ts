import "server-only";
import { loadActiveProducts, costoImposible } from "./supplier-catalog";
import { getPerfil, buildResumen, type ArmadorPerfil, type ArmadorSlot, type ArmadorTier } from "./armador-perfiles";
import {
  opcionesDePlaca, placasParaPerfil, placaRecomendada, socketDeCpu, memoriaDeCpu, tierDe,
  type Plataforma, type PlacaOpcion,
} from "./armador-plataformas";
import { vatiosRecomendados } from "./armador-cotizacion";

// ─── El equipo que recomienda Andrea en el chat ───────────────────────────────
//
// Hay dos caminos para comprar un computador y los dos leen la MISMA guía técnica
// (`armador-perfiles.ts`):
//
//   • El ARMADOR, para quien sabe: elige cada pieza y la web le marca la recomendada para
//     su uso y le impide armar algo incompatible.
//   • El CHAT, para quien no: dice para qué lo quiere y Andrea le propone el equipo.
//
// Antes, en el chat, Andrea no configuraba nada: buscaba en las listas un PC ya armado
// "parecido" y elegía el más barato que cumpliera lo mínimo. Así a un diseñador le llegaba
// un Ryzen 5 con RTX 3050 aunque la guía dice Ryzen 7 / Core i7 con RTX 4060. Ahora el
// equipo se configura primero —con la guía y las reglas de compatibilidad, nunca de
// memoria del modelo— y después se cotiza pieza por pieza: lo que hay en las listas y, lo
// que falta, en la web.
//
// Se proponen TRES niveles del mismo uso, que son la misma escalera de opciones del armador:
// una por debajo de la recomendada, la recomendada y una por encima. El "Recomendado" del
// chat es, pieza por pieza, el "Recomendado" del armador: el cliente no recibe dos
// respuestas distintas según por dónde entre.

export type Nivel = "economico" | "recomendado" | "alto";

export const NIVEL_LABEL: Record<Nivel, string> = {
  economico:   "Económico",
  recomendado: "Recomendado",
  alto:        "Alto rendimiento",
};

const DESPLAZAMIENTO: Record<Nivel, number> = { economico: -1, recomendado: 0, alto: 1 };

export type EquipoConfigurado = {
  nivel: Nivel;
  perfil: ArmadorPerfil;
  plataforma: Plataforma;
  /** El resumen con el formato del armador: "PC Gamer — ensamblado a la medida · Procesador: … ·
   *  Plataforma: AMD". Es lo que entiende `piezasDeConfig`. */
  resumen: string;
};

export type PedidoDeEquipo = {
  uso: string;
  plataforma?: Plataforma;
  /** Sin monitor ni teclado y mouse: el cliente ya los tiene. */
  soloTorre?: boolean;
  /** Lo que el cliente nombró ("RTX 4060", "32GB", "Ryzen 7 7700", "2TB"). Manda sobre la
   *  guía en los tres niveles. */
  preferencias?: string;
};

/** Plataforma por defecto, con el mismo criterio que el armador le explica al cliente:
 *  AMD rinde más por peso en juegos; Intel es muy sólido en oficina, diseño y edición. */
function plataformaPorDefecto(perfilId: string): Plataforma {
  return ["gaming", "gamer-premium", "streaming"].includes(perfilId) ? "amd" : "intel";
}

/** Índice de la opción recomendada de una lista, desplazado por el nivel y acotado. */
function porNivel<T extends ArmadorTier>(opciones: T[], nivel: Nivel): T | undefined {
  if (opciones.length === 0) return undefined;
  const rec = Math.max(0, opciones.findIndex((o) => o.rec));
  const i = Math.min(Math.max(rec + DESPLAZAMIENTO[nivel], 0), opciones.length - 1);
  return opciones[i];
}

/** Las opciones de un slot que son NIVELES de la misma pieza. "+ Disco duro 2TB adicional"
 *  es un agregado, no un nivel del disco principal; "Solo torre" y "Sin monitor" son la
 *  decisión de no llevar la pieza (en el chat la da `soloTorre`), y los monitores curvos son
 *  un gusto que elige el cliente en el armador, no un escalón de la recomendación. */
function niveles(slot: ArmadorSlot, plataforma: Plataforma): ArmadorTier[] {
  return slot.opciones
    .filter((o) => !o.plataforma || o.plataforma === plataforma)
    .filter((o) => !/^\+/.test(o.label) && !/^(solo torre|sin)\b/i.test(o.label) && !/\bcurv[oa]\b/i.test(o.label));
}

const vatios = (label: string) => Number(label.match(/(\d{3,4})\s*W/i)?.[1] ?? 0);

/** La placa que le corresponde al nivel, de las REALES del inventario y del socket del
 *  procesador. Siempre de entrega rápida si existe: nadie debería esperar 6 a 10 días por la
 *  placa que le sugerimos nosotros. Los niveles se mueven UN escalón de gama alrededor de
 *  la recomendada, igual que las demás piezas: saltar a la placa más cara del inventario
 *  le ponía una AORUS Z790 al equipo de oficina "alto". */
function placaPorNivel(aptas: PlacaOpcion[], perfilId: string, nivel: Nivel): string {
  const rapidas = aptas.filter((p) => p.entrega === "rapida");
  const pool = rapidas.length > 0 ? rapidas : aptas;
  if (pool.length === 0) return "";
  const recomendada = placaRecomendada(aptas, perfilId);
  if (nivel === "recomendado") return recomendada;
  const tierRec = tierDe(pool.find((p) => p.label === recomendada)?.chipset ?? "");
  const ordenadas = [...pool].sort((a, b) => tierDe(a.chipset) - tierDe(b.chipset));
  const elegida = nivel === "economico"
    ? [...ordenadas].reverse().find((p) => tierDe(p.chipset) < tierRec)
    : ordenadas.find((p) => tierDe(p.chipset) > tierRec);
  return elegida?.label ?? recomendada;
}

// ── Lo que el cliente nombró ──────────────────────────────────────────────────

type Preferencias = { cpu?: string; gpu?: string; ramGB?: number; disco?: string };

function leerPreferencias(texto: string, perfil: ArmadorPerfil): Preferencias {
  const t = texto ?? "";
  const pref: Preferencias = {};
  // Procesador: solo si el texto nombra un modelo que sabemos ubicar en un socket. "Un
  // Ryzen" a secas no es un procesador: es una preferencia de plataforma.
  const cpu = t.match(/\b(ryzen\s?[3579]\s?\d{4}[a-z0-9]{0,3}|core\s?ultra\s?[579]\s?\d{3}[a-z]{0,2}|(?:core\s?)?i[3579][\s-]?\d{4,5}[a-z]{0,2})\b/i)?.[0];
  if (cpu && socketDeCpu(cpu)) {
    // Si el modelo está en la guía, se usa su nombre tal cual ("Core i5-13400F").
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^core/, "");
    const enGuia = cpusDeLaGuia(perfil).find((o) => norm(o.label) === norm(cpu));
    pref.cpu = enGuia?.label ?? cpu.replace(/\s+/g, " ").trim();
  }
  const gpu = t.match(/\b(rtx|gtx|rx)\s?(\d{4})\s?(ti|super|xtx|xt)?\b/i);
  if (gpu) {
    const suf = gpu[3]?.toLowerCase();
    const sufijo = !suf ? "" : suf === "ti" ? " Ti" : suf === "super" ? " Super" : ` ${suf.toUpperCase()}`;
    pref.gpu = `${gpu[1].toUpperCase()} ${gpu[2]}${sufijo}`;
  }
  const ram = t.match(/\b(8|16|32|64|128)\s?(?:gb|gigas?)\b(?![^,.]*\b(?:ssd|nvme|disco|almacenamiento)\b)/i);
  if (ram) pref.ramGB = Number(ram[1]);
  const disco = t.match(/\b(\d(?:[.,]\d)?)\s?(?:tb|teras?)\b|\b(256|500|512|960)\s?gb\b(?=[^,.]*\b(?:ssd|nvme|disco|almacenamiento)\b)/i);
  if (disco) pref.disco = disco[1] ? `${disco[1].replace(",", ".")}TB SSD NVMe` : `${disco[2]}GB SSD NVMe`;
  return pref;
}

function cpusDeLaGuia(perfil: ArmadorPerfil): ArmadorTier[] {
  return perfil.slots.find((s) => s.key === "cpu")?.opciones ?? [];
}

/** Las configuraciones que Andrea le propone al cliente para ese uso: económica,
 *  recomendada y de alto rendimiento. Dos niveles que salen idénticos (la guía de ese uso
 *  tiene pocas opciones, o el cliente fijó las piezas) se cuentan una vez. */
export function configurarEquipo(pedido: PedidoDeEquipo): EquipoConfigurado[] {
  const perfil = getPerfil(pedido.uso);
  if (!perfil) return [];
  const pref = leerPreferencias(pedido.preferencias ?? "", perfil);
  // El procesador que nombró el cliente decide la plataforma: un Core i7 no va en AMD.
  const plataforma: Plataforma =
    (pref.cpu && (/ryzen|threadripper/i.test(pref.cpu) ? "amd" : "intel"))
    || pedido.plataforma
    || plataformaPorDefecto(perfil.id);

  // Placas REALES de las listas, sin las de costo mal leído (mismo criterio que la página
  // del armador).
  const placas = opcionesDePlaca(loadActiveProducts().filter((p) => !costoImposible(p)), plataforma);

  const vistos = new Set<string>();
  const equipos: EquipoConfigurado[] = [];

  for (const nivel of ["economico", "recomendado", "alto"] as Nivel[]) {
    const sel: Record<string, string> = {};
    const slots: ArmadorSlot[] = [];

    const cpu = pref.cpu ?? porNivel(niveles(perfil.slots.find((s) => s.key === "cpu")!, plataforma), nivel)?.label ?? "";
    const ddr = memoriaDeCpu(cpu) ?? "DDR5";

    for (const slot of perfil.slots) {
      const opciones = niveles(slot, plataforma);
      let valor: string | undefined;

      switch (slot.key) {
        case "cpu":
          valor = cpu;
          break;
        case "gpu":
          // Sin opciones = el perfil va con gráficos integrados (hogar, oficina).
          valor = pref.gpu ?? porNivel(opciones, nivel)?.label;
          break;
        case "ram":
          valor = pref.ramGB ? `${pref.ramGB}GB ${ddr}` : porNivel(opciones, nivel)?.label.replace(/DDR\d/, ddr);
          break;
        case "almacenamiento":
          valor = pref.disco ?? porNivel(opciones, nivel)?.label;
          break;
        case "disco_adicional":
          valor = undefined; // un agregado que el cliente pide, no algo que se le propone
          break;
        case "motherboard": {
          const aptas = placasParaPerfil(placas, perfil.id, socketDeCpu(cpu));
          valor = placaPorNivel(aptas, perfil.id, nivel) || undefined;
          break;
        }
        case "fuente": {
          // La fuente la decide el CONSUMO: la del nivel, pero nunca por debajo de lo que
          // pide la gráfica elegida (con holgura). Una gráfica de gama alta con la fuente
          // del nivel económico es un equipo que se apaga solo.
          const minimo = vatiosRecomendados(sel.gpu ?? "");
          const delNivel = porNivel(opciones, nivel);
          valor = (delNivel && vatios(delNivel.label) >= minimo)
            ? delNivel.label
            : opciones.find((o) => vatios(o.label) >= minimo)?.label ?? opciones[opciones.length - 1]?.label;
          break;
        }
        case "gabinete":
          valor = opciones.find((o) => o.rec)?.label ?? opciones[0]?.label;
          break;
        case "monitor":
          valor = pedido.soloTorre ? undefined : porNivel(opciones, nivel)?.label;
          break;
        case "perifericos":
          valor = pedido.soloTorre ? undefined : (opciones.find((o) => o.rec) ?? opciones[0])?.label;
          break;
        default:
          valor = porNivel(opciones, nivel)?.label;
      }

      if (valor) sel[slot.key] = valor;
      // `buildResumen` omite los slots sin opciones; se le pasa la opción elegida para
      // que la incluya.
      slots.push(valor ? { ...slot, opciones: [{ label: valor }] } : { ...slot, opciones: [] });
    }

    const resumen = `${buildResumen({ ...perfil, slots }, sel)} · Plataforma: ${plataforma.toUpperCase()}`;
    const clave = resumen.replace(/\s+/g, " ");
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    equipos.push({ nivel, perfil, plataforma, resumen });
  }
  return equipos;
}
