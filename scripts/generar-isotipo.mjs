import sharp from "sharp";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const origen = new URL("../src/assets/marca/logo-inacap.webp", import.meta.url);
const destino = new URL(
  "../src/assets/marca/isotipo-inacap.png",
  import.meta.url,
);
const imagen = sharp(fileURLToPath(origen));
const metadata = await imagen.metadata();
assert.equal(
  metadata.width,
  1280,
  "Revisar el recorte si cambia el archivo oficial",
);
assert.equal(
  metadata.height,
  346,
  "Revisar el recorte si cambia el archivo oficial",
);
// Incluye el borde suavizado del cuadrado y una fila transparente; la n queda fuera.
const recorte = { left: 0, top: 0, width: 272, height: 272 };
await imagen
  .extract(recorte)
  .resize(64, 64)
  .png()
  .toFile(fileURLToPath(destino));
console.log(
  "Isotipo generado: 64 × 64 px desde el recorte oficial 0,0–272,272.",
);
