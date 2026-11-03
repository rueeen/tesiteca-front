// Nunca exponemos mensajes internos o detail en inglés al usuario.
export function mensajeError(error) {
  const status = error.response?.status;
  if (!status)
    return "No pudimos conectarnos. Revisa tu conexión e intenta nuevamente.";
  if (status === 401) return "Tu sesión expiró. Vuelve a ingresar.";
  if (
    status === 403 &&
    error.response?.data?.detail === "Acceso solo a través del sitio oficial"
  )
    return "No se pudo conectar con el servidor de la biblioteca.";
  if (status === 403) return "No tienes acceso a esta tesis";
  if (status === 502 || status === 503)
    return "El servidor no está disponible en este momento. Intenta en unos minutos.";
  if (status === 504) return "El servidor tardó demasiado en responder.";
  if (status === 404) return "Esta tesis no existe o fue retirada";
  if (status === 413) return "El archivo es demasiado grande";
  if (status === 429) return "Demasiados intentos, espera unos minutos";
  if (status >= 500)
    return "El servicio no está disponible. Intenta nuevamente en unos minutos.";
  return "Revisa los datos del formulario e intenta nuevamente.";
}

export const MENSAJE_SUBIDA_AGOTADA =
  "La subida tardó demasiado. Antes de reintentar, revisa en Mis tesis si quedó registrada.";
export function mensajeErrorSubida(error) {
  return error.response?.status === 504
    ? MENSAJE_SUBIDA_AGOTADA
    : mensajeError(error);
}
