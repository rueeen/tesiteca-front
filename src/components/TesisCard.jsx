import { ArrowUpRight, GitFork } from "lucide-react";
import { Link } from "react-router-dom";
export default function TesisCard({ tesis: t }) {
  const nivel = t.carrera?.nivel_formacion?.nombre;
  const sede = t.sede?.nombre;
  return (
    <article className="thesis-card">
      <div className="row">
        <span className="eyebrow">{t.tipo?.nombre}</span>
        <span className="year">{t.periodo_texto}</span>
      </div>
      <h3>
        <Link to={`/tesis/${t.id}`}>{t.titulo}</Link>
      </h3>
      <p className="authors">{(t.autores || []).join(" · ")}</p>
      <p className="abstract">{t.resumen}</p>
      <div className="tags">
        {(t.palabras_clave || []).map((p) => (
          <Link key={p} to={`/?palabra_clave=${encodeURIComponent(p)}`}>
            {p}
          </Link>
        ))}
      </div>
      <footer>
        <b>{t.carrera?.nombre}</b>
        {(nivel || sede) && (
          <small>
            {[nivel, sede && `Sede ${sede.replace(/^Sede\s+/i, "")}`]
              .filter(Boolean)
              .join(" · ")}
          </small>
        )}
        <small>Prof. guía: {t.profesor_guia}</small>
        <div className="row">
          <Link to={`/tesis/${t.id}`}>
            Ver tesis{" "}
            <span aria-hidden="true">
              <ArrowUpRight aria-hidden="true" />
            </span>
          </Link>
          {t.tiene_repositorio && (
            <span title="Incluye repositorio">
              <GitFork aria-hidden="true" /> Repositorio
            </span>
          )}
        </div>
      </footer>
    </article>
  );
}
