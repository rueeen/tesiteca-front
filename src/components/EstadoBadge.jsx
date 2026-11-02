const nombres = {
  BORRADOR: "Borrador",
  EN_REVISION: "En revisión",
  PUBLICADA: "Publicada",
  RECHAZADA: "Rechazada",
};
export default function EstadoBadge({ estado, estado_nombre }) {
  return (
    <span className={`badge ${estado || ""}`}>
      {estado_nombre || nombres[estado] || estado}
    </span>
  );
}
