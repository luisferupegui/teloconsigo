/**
 * Test: upload the Janus PDF to the import API directly.
 * Run: node scripts/test-janus-import.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

const PDF_PATH = "C:/Users/AVIDEMO/Downloads/Lista de Precios Janus Junio.pdf";
const API_URL  = "http://localhost:3000/api/admin/import-janus-pdf";

if (!existsSync(PDF_PATH)) {
  console.error("PDF no encontrado:", PDF_PATH);
  process.exit(1);
}

const pdfBuffer = readFileSync(PDF_PATH);
console.log(`PDF leído: ${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB`);

// Build multipart body manually
const boundary = `----FormBoundary${randomBytes(12).toString("hex")}`;
const CRLF = "\r\n";

function part(disposition, contentType, body) {
  const header =
    `--${boundary}${CRLF}` +
    `Content-Disposition: ${disposition}${CRLF}` +
    (contentType ? `Content-Type: ${contentType}${CRLF}` : "") +
    CRLF;
  return [Buffer.from(header), typeof body === "string" ? Buffer.from(body) : body, Buffer.from(CRLF)];
}

const bodyParts = [
  ...part(
    `form-data; name="file"; filename="Lista de Precios Janus Junio.pdf"`,
    "application/pdf",
    pdfBuffer,
  ),
  ...part(`form-data; name="nombre"`, null, "Test Lista Janus Junio"),
  ...part(`form-data; name="aplicarIva"`, null, "false"),
  Buffer.from(`--${boundary}--${CRLF}`),
];
const body = Buffer.concat(bodyParts);
console.log(`Multipart body: ${(body.length / 1024 / 1024).toFixed(1)} MB`);

console.log("Enviando al API…");
const t0 = Date.now();
const res = await fetch(API_URL, {
  method: "POST",
  body,
  headers: {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "Content-Length": String(body.length),
    Cookie: "admin_auth=yes",
  },
});
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
const json = await res.json();

console.log(`\nStatus: ${res.status} (${elapsed}s)`);
if (json.ok) {
  console.log(`✓ Importados: ${json.count} productos`);
  console.log(`Lista ID: ${json.listId}`);
  console.log("\nPrimeros 5 productos:");
  json.preview?.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.nombre}`);
    console.log(`     $${p.precio_costo.toLocaleString("es-CO")} · ${p.categoria}`);
  });
} else {
  console.error("✗ Error:", json.error);
}
