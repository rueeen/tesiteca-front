export default function SkeletonLista({ detalle = false }) {
  return (
    <div
      className={detalle ? "skeleton-detail" : "grid"}
      role="status"
      aria-label={detalle ? "Cargando detalle" : "Cargando lista"}
    >
      {Array.from({ length: detalle ? 1 : 3 }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
