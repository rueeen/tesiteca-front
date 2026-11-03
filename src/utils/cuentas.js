export const emailInstitucional = (email) =>
  /^[^\s@]+@(inacapmail\.cl|inacap\.cl)$/i.test(email.trim());
export const emailFuncionario = (email) =>
  /^[^\s@]+@inacap\.cl$/i.test(email.trim());
export function limpiarRut(valor) {
  return valor.replace(/[^0-9kK]/g, "").toUpperCase();
}
export function formatearRut(valor) {
  const limpio = limpiarRut(valor);
  if (limpio.length < 2) return limpio;
  return (
    limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".") +
    "-" +
    limpio.at(-1)
  );
}
export function rutValido(valor) {
  const limpio = limpiarRut(valor);
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  if (/^0+$/.test(cuerpo)) return false;
  let suma = 0,
    multiplo = 2;
  for (const digito of [...cuerpo].reverse()) {
    suma += Number(digito) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  return (
    (resto === 11 ? "0" : resto === 10 ? "K" : String(resto)) === limpio.at(-1)
  );
}
const normalizar = (t) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
export function reglasPassword(password, { nombre = "", email = "" } = {}) {
  const p = normalizar(password);
  const palabras = normalizar(nombre + " " + email.split("@")[0])
    .split(/[^a-z0-9]+/)
    .filter((s) => s.length >= 3);
  return [
    {
      id: "longitud",
      texto: "Mínimo 10 caracteres",
      cumple: password.length >= 10,
    },
    {
      id: "numeros",
      texto: "No puede contener solo números",
      cumple: password.length > 0 && !/^\d+$/.test(password),
    },
    {
      id: "similitud",
      texto: "No debe parecerse a tu nombre o correo",
      cumple: password.length > 0 && !palabras.some((s) => p.includes(s)),
    },
  ];
}
export function erroresLegibles(valor) {
  if (Array.isArray(valor)) return valor.flatMap(erroresLegibles).join(" ");
  if (valor && typeof valor === "object")
    return Object.entries(valor)
      .map(([k, v]) => `${k}: ${erroresLegibles(v)}`)
      .join(" ");
  return valor == null ? "" : String(valor);
}
