export type Category = {
  slug: string;
  nombre: string;
  descripcion: string;
  emoji: string;
  imagen: string;
};

// Imágenes desde Unsplash (libres de uso) optimizadas para web
const U = (id: string, w = 400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const categories: Category[] = [
  {
    slug: "procesadores",
    nombre: "Procesadores",
    descripcion: "CPUs Intel y AMD para todo presupuesto",
    emoji: "🧠",
    imagen: U("photo-1591488320449-011701bb6704"),
  },
  {
    slug: "tarjetas-graficas",
    nombre: "Tarjetas gráficas",
    descripcion: "GPU NVIDIA y AMD para gaming y trabajo",
    emoji: "🎮",
    imagen: U("photo-1591405351990-4726e331f141"),
  },
  {
    slug: "placas-madre",
    nombre: "Placas madre",
    descripcion: "Boards AM5, AM4, LGA1700 y más",
    emoji: "🔌",
    imagen: U("photo-1518770660439-4636190af475"),
  },
  {
    slug: "memoria-ram",
    nombre: "Memoria RAM",
    descripcion: "DDR4 y DDR5 de alto rendimiento",
    emoji: "💾",
    imagen: U("photo-1591799264318-7e6ef8ddb7ea"),
  },
  {
    slug: "almacenamiento",
    nombre: "Almacenamiento",
    descripcion: "SSD NVMe, SATA y discos duros",
    emoji: "💿",
    imagen: U("photo-1597872200969-2b65d56bd16b"),
  },
  {
    slug: "fuentes-de-poder",
    nombre: "Fuentes de poder",
    descripcion: "PSU certificadas 80+ Bronze a Titanium",
    emoji: "⚡",
    imagen: U("photo-1601737487795-dab272f52420"),
  },
  {
    slug: "gabinetes",
    nombre: "Gabinetes",
    descripcion: "Chasis ATX, mATX e ITX",
    emoji: "📦",
    imagen: U("photo-1587202372634-32705e3bf49c"),
  },
  {
    slug: "refrigeracion",
    nombre: "Refrigeración",
    descripcion: "Aire, líquida y ventiladores",
    emoji: "❄️",
    imagen: U("photo-1587202372616-b43abea06c2a"),
  },
  {
    slug: "monitores",
    nombre: "Monitores",
    descripcion: "Gaming, profesionales y ultrawide",
    emoji: "🖥️",
    imagen: U("photo-1527443224154-c4a3942d3acf"),
  },
  {
    slug: "perifericos",
    nombre: "Periféricos",
    descripcion: "Teclados, mouse, audífonos y más",
    emoji: "⌨️",
    imagen: U("photo-1587829741301-dc798b83add3"),
  },
];
