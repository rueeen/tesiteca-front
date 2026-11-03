export function rutaInterna(value, respaldo = "/") {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  )
    return respaldo;
  try {
    const u = new URL(value, window.location.origin);
    return u.origin === window.location.origin
      ? u.pathname + u.search + u.hash
      : respaldo;
  } catch {
    return respaldo;
  }
}

export function rutaNotificacion(n) {
  return n.tipo?.toUpperCase() === "SOLICITUD_ACCESO"
    ? "/solicitudes"
    : rutaInterna(n.enlace);
}
