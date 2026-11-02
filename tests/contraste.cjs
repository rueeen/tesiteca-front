const assert = require("node:assert/strict");
const fs = require("node:fs");
const css = fs.readFileSync("src/styles/tokens.css", "utf8");
const variables = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);
function color(n) {
  let v = variables[n];
  if (v.startsWith("var(")) return color(v.slice(6, -1));
  if (v.length === 4) v = "#" + [...v.slice(1)].map((x) => x + x).join("");
  return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
}
function luminancia(n) {
  return color(n)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
}
for (const [texto, fondo] of [
  ["gris-900", "gris-50"],
  ["gris-600", "blanco"],
  ["gris-600", "gris-50"],
  ["blanco", "inacap-rojo"],
  ["inacap-rojo", "rojo-50"],
  ["exito", "exito-suave"],
  ["advertencia", "advertencia-suave"],
  ["error", "error-suave"],
  ["info", "info-suave"],
]) {
  const a = luminancia(texto),
    b = luminancia(fondo),
    ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  assert.ok(ratio >= 4.5, `${texto}/${fondo}: ${ratio.toFixed(2)}`);
}
console.log("PASS contraste: 9 pares principales cumplen WCAG AA.");
