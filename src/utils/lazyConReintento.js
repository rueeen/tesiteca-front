import { lazy } from "react";

const MARCA = "tesiteca:recarga-chunk";
export function esErrorChunk(error) {
  const texto = String(error?.message || error || "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|Failed to load module script|MIME(?:[- ]type)?|Loading chunk .+ failed|ChunkLoadError/i.test(
    texto,
  );
}

export function recargarPorChunk(error) {
  if (!esErrorChunk(error)) return false;
  try {
    const anterior = Number(sessionStorage.getItem(MARCA));
    const ahora = Date.now();
    if (anterior && ahora - anterior < 30000) return false;
    sessionStorage.setItem(MARCA, String(ahora));
  } catch {
    // Sin una marca persistente no podemos garantizar que no haya un bucle.
    return false;
  }
  window.location.reload();
  return true;
}

export default function lazyConReintento(cargar) {
  return lazy(async () => {
    try {
      return await cargar();
    } catch (error) {
      if (recargarPorChunk(error)) return new Promise(() => {});
      throw error;
    }
  });
}
