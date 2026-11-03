// Los tokens de enlaces viven solo en memoria y se eliminan de la URL antes de montar React.
const enlaces = new Map();
export function capturarEnlaceCuenta() {
  const ruta = window.location.pathname;
  if (!["/verificar-correo", "/restablecer"].includes(ruta)) return;
  const p = new URLSearchParams(window.location.search);
  if (p.has("token") || p.has("uid"))
    enlaces.set(ruta, { token: p.get("token") || "", uid: p.get("uid") || "" });
  if (window.location.search)
    window.history.replaceState(
      window.history.state,
      "",
      ruta + window.location.hash,
    );
}
export function leerEnlaceCuenta(ruta) {
  capturarEnlaceCuenta();
  return enlaces.get(ruta) || { token: "", uid: "" };
}
export function borrarEnlaceCuenta(ruta) {
  enlaces.delete(ruta);
}
