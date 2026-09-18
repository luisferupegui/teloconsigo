// ─── El nombre de un producto tal como lo lee un cliente ─────────────────────
//
// Las listas de proveedor traen nombres pensados para el mayorista, no para quien
// compra. Aquí se les quita lo que no es producto. Vive aparte porque lo usan la
// ficha de Andrea y el buscador de la web: los dos le muestran nombres de las
// listas al cliente, y si cada uno limpiara a su manera, el mismo producto se
// llamaría distinto según por dónde se entre.

/** Ruido comercial que no le importa al cliente y ensucia la ficha:
 *  "+ Servicio", "Onsite", "Carry-In", "No Vpro", "194 AI TOPS". */
const RUIDO_COMERCIAL = /\s*(?:\+\s*servicio\b|\bonsite\b|\bcarry[\s-]?in\b|\bno\s*vpro\b|\b\d+\s*ai\s*tops\b|\bpremier\b)/gi;

/** Las notas de IVA que la lista imprime junto al PRECIO ("Excluido de IVA", "IVA
 *  Incluido", "GamePad con IVA") y que un importador se tragó como parte del nombre:
 *  el cliente llegó a leer "GamePad con IVA Portátil ROG Strix G16". El IVA no es un
 *  producto, y decirle "con IVA" a quien compra un equipo excluido es falso. La
 *  primera regla se lleva la palabra que la nota arrastra delante ("GamePad con IVA"
 *  entera), la segunda cualquier otra nota suelta. */
const NOTA_IVA_INICIAL = /^\s*(?:[\p{L}\d]+\s+)?(?:(?:con|sin)\s+iva|iva\s+incluido|excluido\s+de\s+iva)\s+/iu;
const NOTA_IVA = /\s*\b(?:excluido\s+de\s+iva|iva\s+incluido|incluye\s+iva|(?:con|sin|m[aá]s)\s+iva)\b/gi;

/** El nombre sin notas de IVA ni ruido comercial. */
export function limpiarNombreProducto(nombre: string): string {
  return nombre
    .replace(NOTA_IVA_INICIAL, "")
    .replace(NOTA_IVA, "")
    .replace(RUIDO_COMERCIAL, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s\-+/]+$/, "")
    .trim();
}
