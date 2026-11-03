export const pluralizar = (cantidad, singular, plural) =>
  Number(cantidad) === 1 ? singular : plural;

// Normalización conservadora de texto pegado; contrastar con la función del backend.
export function normalizarResumen(valor) {
  return String(valor ?? "")
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00ad/g, "")
    .trim()
    .split(/\n[\t ]*\n+/)
    .map((parrafo) =>
      parrafo
        .replace(/(\p{L})-\n[\t ]*(?=\p{Ll})/gu, "$1")
        .replace(/\n/g, " ")
        .replace(/[\t ]+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n\n");
}
