// Nunca exponemos mensajes internos o detail en inglés al usuario.
export function mensajeError(error) {
  const status = error.response?.status;
  if (!status)
    return "No pudimos conectarnos. Revisa tu conexión e intenta nuevamente.";
  if (status === 401) return "Tu sesión expiró. Vuelve a ingresar.";
  if (status === 403) return "No tienes acceso a esta tesis";
  if (status === 404) return "Esta tesis no existe o fue retirada";
  if (status === 413) return "El archivo es demasiado grande";
  if (status === 429) return "Demasiados intentos, espera unos minutos";
  if (status >= 500)
    return "El servicio no está disponible. Intenta nuevamente en unos minutos.";
  return "Revisa los datos del formulario e intenta nuevamente.";
}
