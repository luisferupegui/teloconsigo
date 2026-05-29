import type { LucideIcon } from "lucide-react";
import {
  Cpu, Laptop, CircuitBoard, MemoryStick, Gamepad2, Zap, Monitor,
  Thermometer, Box, Wifi, Mouse, Headphones, Video, HardDrive,
  Shield, Keyboard, Printer,
} from "lucide-react";

export type Category = {
  slug: string;
  nombre: string;
  descripcion: string;
  Icon: LucideIcon;
};

export const categories: Category[] = [
  {
    slug: "procesadores",
    nombre: "Procesadores",
    descripcion: "CPUs Intel y AMD para todo presupuesto",
    Icon: Cpu,
  },
  {
    slug: "portatiles",
    nombre: "Portátiles",
    descripcion: "Movilidad y potencia para cada necesidad",
    Icon: Laptop,
  },
  {
    slug: "motherboards",
    nombre: "Motherboards",
    descripcion: "Boards AM5, AM4, LGA1700 y más",
    Icon: CircuitBoard,
  },
  {
    slug: "memoria-ram",
    nombre: "Memoria RAM",
    descripcion: "DDR4 y DDR5 de alto rendimiento",
    Icon: MemoryStick,
  },
  {
    slug: "tarjetas-graficas",
    nombre: "Tarjetas Gráficas",
    descripcion: "GPU NVIDIA y AMD para gaming y diseño",
    Icon: Gamepad2,
  },
  {
    slug: "fuentes-de-poder",
    nombre: "Fuentes de Poder",
    descripcion: "PSU certificadas 80+ Bronze a Titanium",
    Icon: Zap,
  },
  {
    slug: "monitores",
    nombre: "Monitores",
    descripcion: "Gaming, profesionales y ultrawide",
    Icon: Monitor,
  },
  {
    slug: "refrigeracion",
    nombre: "Refrigeración",
    descripcion: "Aire, líquida y ventiladores",
    Icon: Thermometer,
  },
  {
    slug: "equipos-escritorio",
    nombre: "Equipos de Escritorio",
    descripcion: "PCs completos listos para trabajar",
    Icon: Box,
  },
  {
    slug: "redes",
    nombre: "Redes",
    descripcion: "Routers, switches y accesorios de red",
    Icon: Wifi,
  },
  {
    slug: "mouse-pad",
    nombre: "Mouse & Pad Mouse",
    descripcion: "Precisión y control en cada movimiento",
    Icon: Mouse,
  },
  {
    slug: "auriculares-audio",
    nombre: "Auriculares & Audio",
    descripcion: "Sonido inmersivo de alta calidad",
    Icon: Headphones,
  },
  {
    slug: "kits-streaming",
    nombre: "Kits de Streaming",
    descripcion: "Todo lo que necesitas para crear contenido",
    Icon: Video,
  },
  {
    slug: "almacenamiento",
    nombre: "Almacenamiento",
    descripcion: "SSD NVMe, SATA y discos duros",
    Icon: HardDrive,
  },
  {
    slug: "proteccion-accesorios",
    nombre: "Protección y Accesorios",
    descripcion: "Protege y complementa tus dispositivos",
    Icon: Shield,
  },
  {
    slug: "teclados",
    nombre: "Teclados",
    descripcion: "Comodidad y precisión para cada uso",
    Icon: Keyboard,
  },
  {
    slug: "impresoras",
    nombre: "Impresoras",
    descripcion: "Impresiones nítidas para hogar y oficina",
    Icon: Printer,
  },
];
