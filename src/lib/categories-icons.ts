import type { LucideIcon } from "lucide-react";
import {
  Cpu, Laptop, CircuitBoard, MemoryStick, Gamepad2, Zap, Monitor,
  Thermometer, Box, Wifi, Mouse, Headphones, Video, HardDrive,
  Shield, Keyboard, Printer, Package, Server, Camera, Tablet, Smartphone,
  Speaker, Router, Fan, Battery, Cable, Disc, Projector, Watch,
} from "lucide-react";

// Registro de iconos disponibles para las categorías de la tienda.
//
// La taxonomía vive en `data/categories.json` (editable desde el panel), y ahí el
// icono se guarda como TEXTO ("Cpu"). Aquí se traduce ese texto al componente real.
// Es lo que permite que una categoría creada desde el panel tenga icono sin tocar
// código, y que este módulo lo pueda usar también un componente de cliente.

export const ICONOS: Record<string, LucideIcon> = {
  Cpu, Laptop, CircuitBoard, MemoryStick, Gamepad2, Zap, Monitor,
  Thermometer, Box, Wifi, Mouse, Headphones, Video, HardDrive,
  Shield, Keyboard, Printer, Package, Server, Camera, Tablet, Smartphone,
  Speaker, Router, Fan, Battery, Cable, Disc, Projector, Watch,
};

/** Nombres de icono que el panel ofrece al crear o editar una categoría. */
export const NOMBRES_ICONO = Object.keys(ICONOS).sort();

/** Componente del icono. Si el nombre no existe (o falta), cae en uno neutro. */
export function iconoDe(nombre?: string): LucideIcon {
  return (nombre && ICONOS[nombre]) || Package;
}

/** Añade el componente `Icon` a cada categoría. Las páginas ya renderizaban
 *  `<cat.Icon />` cuando la taxonomía era código; esto conserva esa forma para que
 *  el paso a datos no obligue a reescribir cada JSX. */
export function conIconos<T extends { icon: string }>(cats: T[]): (T & { Icon: LucideIcon })[] {
  return cats.map((c) => ({ ...c, Icon: iconoDe(c.icon) }));
}
