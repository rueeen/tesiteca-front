export const pluralizar = (cantidad, singular, plural) =>
  Number(cantidad) === 1 ? singular : plural;

// Algoritmo compartido con la especificación del backend; solo para vista previa.
export function normalizarResumen(valor) {
  if (!valor) return "";
  const lineas = String(valor)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\t]/g, " ")
    .split("\n")
    .map((l) => l.trim());
  const parrafos = [];
  let actual = "";
  function cerrar() {
    if (actual) parrafos.push(actual);
    actual = "";
  }
  for (const linea of lineas) {
    if (!linea) {
      cerrar();
      continue;
    }
    if (/^([-•*]|\d{1,2}[.)])\s+/.test(linea)) {
      cerrar();
      actual = linea;
      continue;
    }
    if (!actual) {
      actual = linea;
      continue;
    }
    if (actual.endsWith("-") && /[\p{L}\p{N}]/u.test(actual.at(-2) || "")) {
      actual =
        (/\p{Ll}/u.test(linea[0]) ? actual.slice(0, -1) : actual) + linea;
      continue;
    }
    const fin = actual.replace(/[)"”»']+$/u, "").at(-1);
    const inicio = linea[0];
    if (
      /[.!?:;]/.test(fin || "") &&
      (/[¿¡"“«'(0-9]/.test(inicio) || /\p{Lu}/u.test(inicio))
    ) {
      cerrar();
      actual = linea;
    } else actual += " " + linea;
  }
  cerrar();
  return parrafos
    .map((p) => p.replace(/ {2,}/g, " "))
    .join("\n\n")
    .trim();
}
