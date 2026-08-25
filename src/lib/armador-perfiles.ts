import type { Plataforma, Entrega } from "./armador-plataformas";

// ─── Armador de PC — datos de perfiles y configuraciones recomendadas ─────────
//
// FUENTE DE VERDAD: estas recomendaciones salen de los documentos técnicos
// ("Guía Técnica PC de Escritorio Cliente" y "Catálogo Maestro de Configuraciones
// PC") — las MISMAS que alimentan la guía por perfil de Andrea en
// src/app/api/asesor/route.ts. Si cambian los criterios técnicos, actualiza AMBOS.
//
// El armador NO maneja precios: el cliente arma la configuración por niveles y
// Andrea cotiza el ensamblado final (torre + monitor si aplica). Por eso aquí
// solo hay specs/niveles, nunca cifras.

export type ArmadorTier = {
  /** Texto que ve el cliente y que viaja a Andrea (ej: "Ryzen 7 7800X3D"). */
  label: string;
  /** Nivel recomendado por los documentos para ESTE perfil. */
  rec?: boolean;
  /** Si está, la opción SOLO se muestra cuando el cliente eligió esa plataforma.
   *  Es lo que impide armar un imposible (un Core i5 con una placa AM5). */
  plataforma?: Plataforma;
  /** Tiempo de entrega. El cliente nunca sabe si hay stock: solo ve la fecha. */
  entrega?: Entrega;
};

export type ArmadorSlot = {
  key: string;
  label: string;
  /** Clave de ícono lucide-react (mapeada en la página). */
  icon: string;
  /** Opciones por nivel. Vacío + `nota` ⇒ se muestra como informativo sin elegir. */
  opciones: ArmadorTier[];
  /** Para componentes no seleccionables (ej: gráficos integrados en Hogar). */
  nota?: string;
  /** Si true, el cliente puede dejarlo sin elegir (opcional). */
  opcional?: boolean;
};

export type ArmadorPerfil = {
  id: string;
  label: string;
  icon: string;
  tagline: string;
  /** Consejo profesional mostrado en el paso de configuración. */
  tip: string;
  slots: ArmadorSlot[];
};

// Slots reutilizables ───────────────────────────────────────────────────────
const DISCO_ADICIONAL: ArmadorSlot = {
  key: "disco_adicional", label: "Disco adicional", icon: "HardDrive", opcional: true,
  opciones: [
    { label: "Sin disco adicional", rec: true },
    { label: "+ SSD SATA 1TB" },
    { label: "+ SSD M.2 NVMe 1TB" },
    { label: "+ SSD M.2 NVMe 2TB" },
    { label: "+ Disco duro 2TB" },
    { label: "+ Disco duro 4TB" },
    { label: "+ Unidad óptica DVD-RW" },
  ],
};

const REFRIG_AIRE: ArmadorSlot = {
  key: "refrigeracion", label: "Refrigeración", icon: "Snowflake",
  opciones: [{ label: "Aire (incluida)", rec: true }],
};
const REFRIG_LIQ240: ArmadorSlot = {
  key: "refrigeracion", label: "Refrigeración", icon: "Snowflake",
  opciones: [
    { label: "Aire de alto desempeño" },
    { label: "Líquida 240mm", rec: true },
    { label: "Líquida 360mm" },
  ],
};
const PERIF_BASICO: ArmadorSlot = {
  key: "perifericos", label: "Teclado y mouse", icon: "Keyboard",
  opciones: [
    { label: "Combo alámbrico", rec: true },
    { label: "Combo inalámbrico" },
    { label: "Solo torre (sin periféricos)" },
  ],
};
const PERIF_INALAM: ArmadorSlot = {
  key: "perifericos", label: "Teclado y mouse", icon: "Keyboard",
  opciones: [
    { label: "Combo alámbrico" },
    { label: "Combo inalámbrico", rec: true },
    { label: "Solo torre (sin periféricos)" },
  ],
};
const PERIF_GAMER: ArmadorSlot = {
  key: "perifericos", label: "Teclado y mouse", icon: "Keyboard",
  opciones: [
    { label: "Combo gamer alámbrico" },
    { label: "Combo gamer inalámbrico", rec: true },
    { label: "Solo torre (sin periféricos)" },
  ],
};
const GPU_INTEGRADA: ArmadorSlot = {
  key: "gpu", label: "Tarjeta gráfica", icon: "Component",
  opciones: [],
  nota: "Gráficos integrados — este perfil no requiere tarjeta dedicada.",
};

export const PERFILES: ArmadorPerfil[] = [
  // 1 ─ HOGAR Y ESTUDIO ──────────────────────────────────────────────────────
  {
    id: "hogar",
    label: "Hogar y estudio",
    icon: "Home",
    tagline: "Navegar, Office, clases, streaming",
    tip: "Para uso diario, 16GB de RAM y un SSD hacen que todo abra al instante. No necesitas tarjeta de video dedicada.",
    slots: [
      { key: "cpu", label: "Procesador", icon: "Cpu", opciones: [
        { label: "Ryzen 3 5300G", plataforma: "amd" },
        { label: "Ryzen 5 5600G", plataforma: "amd", rec: true },
        { label: "Ryzen 7 5700G", plataforma: "amd" },
        { label: "Core i3-12100", plataforma: "intel" },
        { label: "Core i5-12400", plataforma: "intel", rec: true },
        { label: "Core i5-14400", plataforma: "intel" },
        { label: "Core Ultra 5 225", plataforma: "intel" },
      ]},
      GPU_INTEGRADA,
      { key: "ram", label: "Memoria RAM", icon: "MemoryStick", opciones: [
        { label: "8GB DDR4" },
        { label: "16GB DDR4", rec: true },
        { label: "32GB DDR4" },
      ]},
      { key: "almacenamiento", label: "Almacenamiento", icon: "HardDrive", opciones: [
        { label: "256GB SSD" },
        { label: "512GB SSD NVMe", rec: true },
        { label: "1TB SSD NVMe" },
        { label: "+ Disco duro 1TB adicional" },
      ]},
      DISCO_ADICIONAL,
      { key: "motherboard", label: "Motherboard", icon: "CircuitBoard", opciones: [] },
      { key: "monitor", label: "Monitor", icon: "Monitor", opciones: [
        { label: "21.5\" FHD" },
        { label: "24\" FHD", rec: true },
        { label: "27\" FHD" },
      ]},
      REFRIG_AIRE,
      PERIF_BASICO,
    ],
  },

  // 2 ─ OFICINA ───────────────────────────────────────────────────────────────
  {
    id: "oficina",
    label: "Oficina",
    icon: "Briefcase",
    tagline: "ERP (Siigo/Helisa/SAP), Excel, multitarea",
    tip: "Con 32GB corres el ERP, hojas de cálculo grandes y el navegador con muchas pestañas sin que el equipo se ponga lento.",
    slots: [
      { key: "cpu", label: "Procesador", icon: "Cpu", opciones: [
        { label: "Ryzen 5 5600G", plataforma: "amd", rec: true },
        { label: "Ryzen 7 5700G", plataforma: "amd" },
        { label: "Ryzen 7 7700", plataforma: "amd" },
        { label: "Core i5-12400", plataforma: "intel", rec: true },
        { label: "Core i7-12700", plataforma: "intel" },
        { label: "Core i7-14700", plataforma: "intel" },
        { label: "Core Ultra 5 245K", plataforma: "intel" },
      ]},
      GPU_INTEGRADA,
      { key: "ram", label: "Memoria RAM", icon: "MemoryStick", opciones: [
        { label: "16GB DDR4" },
        { label: "32GB DDR4", rec: true },
        { label: "64GB DDR4" },
      ]},
      { key: "almacenamiento", label: "Almacenamiento", icon: "HardDrive", opciones: [
        { label: "512GB SSD NVMe" },
        { label: "1TB SSD NVMe", rec: true },
        { label: "2TB SSD NVMe" },
        { label: "+ Disco duro 2TB adicional" },
      ]},
      DISCO_ADICIONAL,
      { key: "motherboard", label: "Motherboard", icon: "CircuitBoard", opciones: [] },
      { key: "monitor", label: "Monitor", icon: "Monitor", opciones: [
        { label: "24\" FHD", rec: true },
        { label: "27\" FHD" },
        { label: "Doble 24\" FHD" },
      ]},
      REFRIG_AIRE,
      PERIF_INALAM,
    ],
  },

  // 3 ─ DISEÑO GRÁFICO ────────────────────────────────────────────────────────
  {
    id: "diseno",
    label: "Diseño gráfico",
    icon: "Palette",
    tagline: "Photoshop, Illustrator, CorelDRAW",
    tip: "La tarjeta de video acelera los filtros y el renderizado de Photoshop. Un monitor IPS calibrado es clave para que los colores sean fieles.",
    slots: [
      { key: "cpu", label: "Procesador", icon: "Cpu", opciones: [
        { label: "Ryzen 5 7600", plataforma: "amd" },
        { label: "Ryzen 7 7700", plataforma: "amd", rec: true },
        { label: "Ryzen 9 7900X", plataforma: "amd" },
        { label: "Core i5-14600K", plataforma: "intel" },
        { label: "Core i7-14700K", plataforma: "intel", rec: true },
        { label: "Core i9-14900K", plataforma: "intel" },
        { label: "Core Ultra 7 265K", plataforma: "intel" },
      ]},
      { key: "gpu", label: "Tarjeta gráfica", icon: "Component", opciones: [
        { label: "RTX 4060", rec: true },
        { label: "RTX 5060 Ti" },
        { label: "RTX 5070" },
      ]},
      { key: "ram", label: "Memoria RAM", icon: "MemoryStick", opciones: [
        { label: "16GB DDR5" },
        { label: "32GB DDR5", rec: true },
        { label: "64GB DDR5" },
      ]},
      { key: "almacenamiento", label: "Almacenamiento", icon: "HardDrive", opciones: [
        { label: "512GB SSD Gen4" },
        { label: "1TB SSD Gen4", rec: true },
        { label: "2TB SSD Gen4" },
        { label: "+ Disco duro 2TB adicional" },
      ]},
      DISCO_ADICIONAL,
      { key: "motherboard", label: "Motherboard", icon: "CircuitBoard", opciones: [] },
      { key: "monitor", label: "Monitor", icon: "Monitor", opciones: [
        { label: "24\" IPS" },
        { label: "27\" IPS calibrado", rec: true },
        { label: "27\" 4K IPS" },
      ]},
      REFRIG_LIQ240,
      PERIF_INALAM,
    ],
  },

  // 4 ─ DESARROLLO DE SOFTWARE ────────────────────────────────────────────────
  {
    id: "desarrollo",
    label: "Desarrollo de software",
    icon: "Terminal",
    tagline: "IDEs, compilación, Docker, máquinas virtuales",
    tip: "Con 32GB tienes el IDE, varios contenedores Docker y el navegador abiertos a la vez. La tarjeta dedicada es opcional salvo que trabajes con IA.",
    slots: [
      { key: "cpu", label: "Procesador", icon: "Cpu", opciones: [
        { label: "Ryzen 5 7600", plataforma: "amd" },
        { label: "Ryzen 7 7700", plataforma: "amd", rec: true },
        { label: "Ryzen 9 7900X", plataforma: "amd" },
        { label: "Core i5-14600K", plataforma: "intel" },
        { label: "Core i7-14700K", plataforma: "intel", rec: true },
        { label: "Core i9-14900K", plataforma: "intel" },
        { label: "Core Ultra 7 265K", plataforma: "intel" },
      ]},
      { key: "gpu", label: "Tarjeta gráfica", icon: "Component", opcional: true, opciones: [
        { label: "Gráficos integrados", rec: true },
        { label: "RTX 4060" },
        { label: "RTX 5060 Ti" },
      ]},
      { key: "ram", label: "Memoria RAM", icon: "MemoryStick", opciones: [
        { label: "16GB DDR5" },
        { label: "32GB DDR5", rec: true },
        { label: "64GB DDR5" },
      ]},
      { key: "almacenamiento", label: "Almacenamiento", icon: "HardDrive", opciones: [
        { label: "512GB SSD Gen4" },
        { label: "1TB SSD Gen4", rec: true },
        { label: "2TB SSD Gen4" },
        { label: "+ Disco duro 2TB adicional" },
      ]},
      DISCO_ADICIONAL,
      { key: "motherboard", label: "Motherboard", icon: "CircuitBoard", opciones: [] },
      { key: "monitor", label: "Monitor", icon: "Monitor", opciones: [
        { label: "27\" FHD" },
        { label: "Doble 24\" FHD", rec: true },
        { label: "27\" 1440p" },
      ]},
      REFRIG_LIQ240,
      PERIF_INALAM,
    ],
  },

  // 5 ─ GAMING ────────────────────────────────────────────────────────────────
  {
    id: "gaming",
    label: "PC Gamer",
    icon: "Gamepad2",
    tagline: "Juegos AAA y eSports en 1080p–1440p",
    tip: "Los procesadores X3D eliminan los tirones en juegos competitivos. Con una RTX 50 y 32GB tienes FPS de sobra en cualquier título actual.",
    slots: [
      { key: "cpu", label: "Procesador", icon: "Cpu", opciones: [
        { label: "Ryzen 5 7600", plataforma: "amd", rec: true },
        { label: "Ryzen 7 7700", plataforma: "amd" },
        { label: "Ryzen 7 7800X3D", plataforma: "amd" },
        { label: "Core i5-13400F", plataforma: "intel", rec: true },
        { label: "Core i5-14600KF", plataforma: "intel" },
        { label: "Core i7-14700KF", plataforma: "intel" },
        { label: "Core Ultra 7 265K", plataforma: "intel" },
      ]},
      { key: "gpu", label: "Tarjeta gráfica", icon: "Component", opciones: [
        { label: "RTX 5060", rec: true },
        { label: "RTX 5060 Ti" },
        { label: "RTX 5070" },
      ]},
      { key: "ram", label: "Memoria RAM", icon: "MemoryStick", opciones: [
        { label: "16GB DDR5" },
        { label: "32GB DDR5", rec: true },
        { label: "64GB DDR5" },
      ]},
      { key: "almacenamiento", label: "Almacenamiento", icon: "HardDrive", opciones: [
        { label: "512GB SSD Gen4" },
        { label: "1TB SSD NVMe Gen4", rec: true },
        { label: "2TB SSD Gen4" },
        { label: "+ Disco duro 2TB adicional" },
      ]},
      DISCO_ADICIONAL,
      { key: "motherboard", label: "Motherboard", icon: "CircuitBoard", opciones: [] },
      { key: "monitor", label: "Monitor", icon: "Monitor", opciones: [
        { label: "24\" FHD 144Hz", rec: true },
        { label: "27\" FHD 165Hz" },
        { label: "27\" 1440p 180Hz" },
      ]},
      REFRIG_LIQ240,
      PERIF_GAMER,
    ],
  },

  // 6 ─ GAMER PREMIUM ─────────────────────────────────────────────────────────
  {
    id: "gamer-premium",
    label: "Gamer Premium",
    icon: "Trophy",
    tagline: "AAA en 4K, eSports competitivo, máximo FPS",
    tip: "Tope de gama: X3D + RTX 5080/5090 para 4K sin concesiones. La refrigeración líquida mantiene el rendimiento estable en sesiones largas.",
    slots: [
      { key: "cpu", label: "Procesador", icon: "Cpu", opciones: [
        { label: "Ryzen 7 7800X3D", plataforma: "amd", rec: true },
        { label: "Ryzen 7 9800X3D", plataforma: "amd" },
        { label: "Ryzen 9 7950X3D", plataforma: "amd" },
        { label: "Core i7-14700K", plataforma: "intel", rec: true },
        { label: "Core i9-14900K", plataforma: "intel" },
        { label: "Core i9-14900KS", plataforma: "intel" },
        { label: "Core Ultra 9 285K", plataforma: "intel" },
      ]},
      { key: "gpu", label: "Tarjeta gráfica", icon: "Component", opciones: [
        { label: "RTX 5070 Ti", rec: true },
        { label: "RTX 5080" },
        { label: "RTX 5090" },
      ]},
      { key: "ram", label: "Memoria RAM", icon: "MemoryStick", opciones: [
        { label: "32GB DDR5", rec: true },
        { label: "64GB DDR5" },
      ]},
      { key: "almacenamiento", label: "Almacenamiento", icon: "HardDrive", opciones: [
        { label: "1TB SSD Gen4", rec: true },
        { label: "2TB SSD Gen4/Gen5" },
        { label: "+ Disco duro 2TB adicional" },
      ]},
      DISCO_ADICIONAL,
      { key: "motherboard", label: "Motherboard", icon: "CircuitBoard", opciones: [] },
      { key: "monitor", label: "Monitor", icon: "Monitor", opciones: [
        { label: "27\" 1440p 165Hz", rec: true },
        { label: "27\" 1440p 240Hz" },
        { label: "32\" 4K 144Hz" },
      ]},
      REFRIG_LIQ240,
      PERIF_GAMER,
    ],
  },

  // 7 ─ STREAMING ─────────────────────────────────────────────────────────────
  {
    id: "streaming",
    label: "Streaming",
    icon: "Radio",
    tagline: "Jugar y transmitir a la vez (OBS/Streamlabs)",
    tip: "La RTX codifica el stream por hardware (NVENC) sin robarle FPS al juego. Con 32–64GB el equipo mueve juego, OBS y chat sin trabarse.",
    slots: [
      { key: "cpu", label: "Procesador", icon: "Cpu", opciones: [
        { label: "Ryzen 7 7800X3D", plataforma: "amd", rec: true },
        { label: "Ryzen 9 7900X", plataforma: "amd" },
        { label: "Ryzen 9 7950X", plataforma: "amd" },
        { label: "Core i7-14700K", plataforma: "intel", rec: true },
        { label: "Core i9-14900K", plataforma: "intel" },
        { label: "Core Ultra 9 285K", plataforma: "intel" },
      ]},
      { key: "gpu", label: "Tarjeta gráfica", icon: "Component", opciones: [
        { label: "RTX 5070", rec: true },
        { label: "RTX 5070 Ti" },
        { label: "RTX 5080" },
      ]},
      { key: "ram", label: "Memoria RAM", icon: "MemoryStick", opciones: [
        { label: "32GB DDR5", rec: true },
        { label: "64GB DDR5" },
      ]},
      { key: "almacenamiento", label: "Almacenamiento", icon: "HardDrive", opciones: [
        { label: "1TB SSD Gen4", rec: true },
        { label: "2TB SSD Gen4" },
        { label: "+ Disco duro 2TB adicional" },
      ]},
      DISCO_ADICIONAL,
      { key: "motherboard", label: "Motherboard", icon: "CircuitBoard", opciones: [] },
      { key: "monitor", label: "Monitor", icon: "Monitor", opciones: [
        { label: "27\" FHD 144Hz", rec: true },
        { label: "Doble 27\" (juego + chat)" },
        { label: "27\" 1440p 165Hz" },
      ]},
      REFRIG_LIQ240,
      PERIF_GAMER,
    ],
  },

  // 8 ─ EDICIÓN DE VIDEO ──────────────────────────────────────────────────────
  {
    id: "edicion",
    label: "Edición de video",
    icon: "Clapperboard",
    tagline: "Premiere, DaVinci, After Effects, 4K/8K",
    tip: "Más VRAM = más capas de efectos sin trabar la línea de tiempo. Con 64GB de RAM los proyectos 4K fluyen sin cortes.",
    slots: [
      { key: "cpu", label: "Procesador", icon: "Cpu", opciones: [
        { label: "Ryzen 7 7700", plataforma: "amd" },
        { label: "Ryzen 9 7900X", plataforma: "amd", rec: true },
        { label: "Ryzen 9 7950X", plataforma: "amd" },
        { label: "Core i7-14700K", plataforma: "intel" },
        { label: "Core i9-14900K", plataforma: "intel", rec: true },
        { label: "Core Ultra 9 285K", plataforma: "intel" },
      ]},
      { key: "gpu", label: "Tarjeta gráfica", icon: "Component", opciones: [
        { label: "RTX 4070", rec: true },
        { label: "RTX 5070" },
        { label: "RTX 5070 Ti" },
      ]},
      { key: "ram", label: "Memoria RAM", icon: "MemoryStick", opciones: [
        { label: "32GB DDR5" },
        { label: "64GB DDR5", rec: true },
        { label: "128GB DDR5" },
      ]},
      { key: "almacenamiento", label: "Almacenamiento", icon: "HardDrive", opciones: [
        { label: "1TB SSD Gen4" },
        { label: "2TB SSD Gen4", rec: true },
        { label: "4TB SSD Gen4" },
        { label: "+ Disco duro 4TB adicional" },
      ]},
      DISCO_ADICIONAL,
      { key: "motherboard", label: "Motherboard", icon: "CircuitBoard", opciones: [] },
      { key: "monitor", label: "Monitor", icon: "Monitor", opciones: [
        { label: "27\" IPS" },
        { label: "27\" 4K IPS", rec: true },
        { label: "32\" 4K IPS" },
      ]},
      REFRIG_LIQ240,
      PERIF_INALAM,
    ],
  },

  // 9 ─ IA / DATA SCIENCE ─────────────────────────────────────────────────────
  {
    id: "ia",
    label: "IA / Desarrollo",
    icon: "BrainCircuit",
    tagline: "Modelos locales, ML, Data Science, Docker",
    tip: "La VRAM es el recurso crítico para correr modelos de IA localmente: a más VRAM, modelos más grandes sin depender de la nube.",
    slots: [
      { key: "cpu", label: "Procesador", icon: "Cpu", opciones: [
        { label: "Ryzen 9 7900X", plataforma: "amd" },
        { label: "Ryzen 9 7950X", plataforma: "amd", rec: true },
        { label: "Threadripper 7960X", plataforma: "amd" },
        { label: "Core i9-14900K", plataforma: "intel", rec: true },
        { label: "Xeon W5-2455X", plataforma: "intel" },
        { label: "Core Ultra 9 285K", plataforma: "intel" },
      ]},
      { key: "gpu", label: "Tarjeta gráfica", icon: "Component", opciones: [
        { label: "RTX 5070 Ti (16GB)", rec: true },
        { label: "RTX 5080" },
        { label: "RTX 5090 (32GB)" },
      ]},
      { key: "ram", label: "Memoria RAM", icon: "MemoryStick", opciones: [
        { label: "64GB DDR5", rec: true },
        { label: "128GB DDR5" },
      ]},
      { key: "almacenamiento", label: "Almacenamiento", icon: "HardDrive", opciones: [
        { label: "1TB SSD Gen4" },
        { label: "2TB SSD Gen4", rec: true },
        { label: "4TB SSD Gen4" },
        { label: "+ Disco duro 4TB adicional" },
      ]},
      DISCO_ADICIONAL,
      { key: "motherboard", label: "Motherboard", icon: "CircuitBoard", opciones: [] },
      { key: "monitor", label: "Monitor", icon: "Monitor", opciones: [
        { label: "27\" 1440p" },
        { label: "Doble 27\" 1440p", rec: true },
        { label: "32\" 4K" },
      ]},
      REFRIG_LIQ240,
      PERIF_INALAM,
    ],
  },
];

export function getPerfil(id: string): ArmadorPerfil | undefined {
  return PERFILES.find((p) => p.id === id);
}

/** Construye la descripción que viaja a Andrea para cotizar el ensamblado. */
export function buildResumen(
  perfil: ArmadorPerfil,
  seleccion: Record<string, string>,
): string {
  const partes = perfil.slots
    .filter((s) => s.opciones.length > 0) // omite los informativos (gráficos integrados)
    .map((s) => {
      const val = seleccion[s.key];
      if (!val) return null;
      // "Disco adicional: Sin disco adicional" es ruido en la cotización: si el cliente
      // no quiso disco extra, la pieza simplemente no va en la lista que ve Andrea.
      if (s.key === "disco_adicional" && /^sin /i.test(val)) return null;
      return `${s.label}: ${val}`;
    })
    .filter(Boolean);
  return `${perfil.label} — ensamblado a la medida · ${partes.join(" · ")}`;
}
