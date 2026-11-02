const formato = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
export function fechaRelativa(fecha) {
  const segundos = (new Date(fecha) - Date.now()) / 1000;
  if (!Number.isFinite(segundos)) return "";
  for (const [unidad, tamano] of [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ])
    if (Math.abs(segundos) >= tamano)
      return formato.format(Math.round(segundos / tamano), unidad);
  return formato.format(Math.round(segundos), "second");
}
