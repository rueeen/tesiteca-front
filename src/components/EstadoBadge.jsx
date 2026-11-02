const nombres = {
  BORRADOR: "Borrador",
  EN_REVISION: "En revisión",
  PUBLICADA: "Publicada",
  RECHAZADA: "Rechazada",
};
export default function EstadoBadge({ estado }) {
  return (
    <span className={`badge ${estado || ""}`}>{nombres[estado] || estado}</span>
  );
}
