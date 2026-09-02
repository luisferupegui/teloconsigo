// ─── Proveedores conocidos ───────────────────────────────────────────────────
//
// Son SUGERENCIAS del campo de proveedor al importar o al renombrar una lista,
// no una lista cerrada: el campo es libre y sumar un proveedor nuevo no debe
// obligar a tocar código.
//
// Se escriben como nombres propios porque así es como se guardan desde que el
// importador los capitaliza, y así se leen en el panel. El emparejamiento entre
// listas del mismo proveedor va por su lado en minúscula (`claveProveedor`), de
// modo que escribirlo distinto no rompe nada.
//
// Vivían duplicadas en los dos componentes que las usan y se habían
// desincronizado: el importador ofrecía cinco y el renombrado tres.
//
// OJO: este es el ÚNICO sitio de la web donde el nombre del proveedor debe
// aparecer. Es el dato de a quién le compramos y no puede llegar al cliente, ni
// en la ficha, ni en lo que responde Andrea, ni en el `brand` del JSON-LD.

export const PROVEEDORES_CONOCIDOS = [
  "Ledacom",
  "Infoshopcorp",
  "Janus",
  "Compumax",
  "Compuoriente",
];
