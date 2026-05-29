import { readFileSync } from "fs";
const data = JSON.parse(readFileSync("data/products-business.json", "utf8"));

console.log("PRECIOS GENERADOS:\n");
data.filter(p => p.precio).forEach(p => {
  const base = p.precioIvaIncluido ? p.precio : Math.round(p.precio * 1.19);
  const pct = p.precioDesde ? Math.round((p.precioDesde / base - 1) * 100) : 0;
  const nombre = p.nombre.slice(0, 32).padEnd(33);
  const uso = p.usoCaso.padEnd(22);
  const proveedor = String(p.precio).padStart(9);
  const final = p.precioDesde ? String(p.precioDesde).padStart(10) : "      null";
  console.log(`${uso} ${nombre} costo:${proveedor} → venta:${final}  (+${pct}%)`);
});
console.log(`\nTotal: ${data.length} productos`);
