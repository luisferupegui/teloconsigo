import { readFileSync } from "fs";
const d = JSON.parse(readFileSync("data/products-business.json", "utf8"));
const counts = {};
d.forEach(p => { counts[p.usoCaso] = (counts[p.usoCaso] || 0) + 1; });
console.log("\nConteo por categoría:");
Object.entries(counts).sort().forEach(([k, v]) => {
  const bar = "█".repeat(v);
  console.log(`  ${k.padEnd(24)} ${String(v).padStart(2)}  ${bar}`);
});
console.log(`\n  Total: ${d.length} productos`);
