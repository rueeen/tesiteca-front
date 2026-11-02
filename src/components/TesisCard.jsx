import { Link } from "react-router-dom";
export default function TesisCard({ tesis: t }) {
  return (
    <article className="thesis-card">
      <div className="row">
        <span className="eyebrow">{t.tipo?.nombre || t.tipo || "TESIS"}</span>
        <span className="year">{t.anio}</span>
      </div>
      <h3>
        <Link to={`/tesis/${t.id}`}>{t.titulo}</Link>
      </h3>
      <p className="authors">
        {t.autores
          ?.map((a) => (typeof a === "string" ? a : a.nombre))
          .join(" · ")}
      </p>
      <p className="abstract">{t.resumen}</p>
      <div className="tags">
        {(t.palabras_clave || []).map((p) => (
          <Link
            key={p.id || p}
            to={`/?palabra_clave=${encodeURIComponent(p.nombre || p)}`}
          >
            {p.nombre || p}
          </Link>
        ))}
      </div>
      <footer>
        <b>{t.carrera?.nombre || t.carrera}</b>
        <small>
          Prof. guía:{" "}
          {t.profesor_guia?.nombre || t.profesor_guia || "No indicado"}
        </small>
        <div className="row">
          <Link to={`/tesis/${t.id}`}>
            Ver tesis <span aria-hidden="true">↗</span>
          </Link>
          {t.tiene_repositorio && (
            <span title="Incluye repositorio">⌘ Repositorio</span>
          )}
        </div>
      </footer>
    </article>
  );
}
