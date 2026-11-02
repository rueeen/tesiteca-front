import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { lista, mensajeError } from "../api";
import PanelFiltros from "../components/PanelFiltros";
import TesisCard from "../components/TesisCard";
import Paginacion from "../components/Paginacion";
export default function BibliotecaPage() {
  const [params, setParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState(params.get("search") || "");
  const [datos, setDatos] = useState([]),
    [total, setTotal] = useState(0),
    [cargando, setCargando] = useState(true),
    [error, setError] = useState(""),
    [intento, setIntento] = useState(0);
  const [catalogos, setCatalogos] = useState({
      carreras: [],
      tipos: [],
      profesores: [],
    }),
    [errorCatalogo, setErrorCatalogo] = useState("");
  const results = useRef();
  const query = params.toString();
  const pagina = Math.max(1, Number(params.get("page")) || 1),
    tamano = [12, 24, 48].includes(Number(params.get("page_size")))
      ? Number(params.get("page_size"))
      : 12;
  function cambiar(key, value) {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      value ? p.set(key, value) : p.delete(key);
      if (key !== "page") p.delete("page");
      return p;
    });
  }
  useEffect(() => {
    setBusqueda(params.get("search") || "");
  }, [params.get("search")]);
  useEffect(() => {
    if (busqueda === (params.get("search") || "")) return;
    const t = setTimeout(() => cambiar("search", busqueda), 400);
    return () => clearTimeout(t);
  }, [busqueda, query]);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const { data } = await api.get("/tesis/", {
          params: new URLSearchParams(query),
          signal: c.signal,
        });
        setDatos(lista(data));
        setTotal(data.count ?? lista(data).length);
      } catch (e) {
        if (e.code !== "ERR_CANCELED") setError(mensajeError(e));
      } finally {
        if (!c.signal.aborted) setCargando(false);
      }
    }
    cargar();
    return () => c.abort();
  }, [query, intento]);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      try {
        const r = await Promise.all(
          [
            "/catalogos/carreras/",
            "/catalogos/tipos/",
            "/catalogos/profesores-guia/",
          ].map((url) => api.get(url, { signal: c.signal })),
        );
        setCatalogos({
          carreras: lista(r[0].data),
          tipos: lista(r[1].data),
          profesores: lista(r[2].data),
        });
      } catch (e) {
        if (e.code !== "ERR_CANCELED")
          setErrorCatalogo("No se pudieron cargar los catálogos.");
      }
    }
    cargar();
    return () => c.abort();
  }, []);
  const activos = [...params.entries()].filter(
    ([k]) => !["page", "page_size", "ordering", "search"].includes(k),
  );
  const etiquetas = {
    carrera: "Carrera",
    tipo: "Tipo",
    anio_desde: "Desde",
    anio_hasta: "Hasta",
    profesor_guia: "Profesor",
    palabra_clave: "Palabra",
    con_repositorio: "Con repositorio",
    en_contenido: "En contenido",
  };
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">REPOSITORIO ACADÉMICO · SEDE ARICA</span>
          <h1>
            Conocimiento que inspira.
            <br />
            <em>Ideas que transforman.</em>
          </h1>
          <p>Descubre el talento y la investigación de nuestra comunidad.</p>
        </div>
        <div className="hero-mark" aria-hidden="true">
          <svg
            viewBox="0 0 100 100"
            width="100"
            height="100"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
          >
            <path d="M25 75 75 25M25 25h50v50" />
          </svg>
        </div>
      </section>
      <section className="search-panel">
        <label className="searchbox">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Buscar tesis"
            placeholder="Busca por título, autor o palabra clave…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <span className="search-hint">Explorar biblioteca</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={params.get("en_contenido") === "true"}
            onChange={(e) =>
              cambiar("en_contenido", e.target.checked ? "true" : "")
            }
          />
          Buscar también dentro del contenido
        </label>
      </section>
      <div className="library-layout">
        <PanelFiltros
          filtros={params}
          catalogos={catalogos}
          onChange={cambiar}
          onLimpiar={() => {
            setBusqueda("");
            setParams({});
          }}
        />
        <section ref={results} className="results">
          {errorCatalogo && (
            <p role="alert" className="error">
              {errorCatalogo}
            </p>
          )}
          <div className="resultbar">
            <div>
              <span className="eyebrow">EXPLORA LA COLECCIÓN</span>
              <h2>{cargando ? "Buscando…" : `${total} resultados`}</h2>
            </div>
            <label>
              Ordenar por
              <select
                value={params.get("ordering") || "-fecha_publicacion"}
                onChange={(e) => cambiar("ordering", e.target.value)}
              >
                {[
                  ["-fecha_publicacion", "Más recientes"],
                  ["-anio", "Año: descendente"],
                  ["anio", "Año: ascendente"],
                  ["titulo", "Título: A–Z"],
                  ["-titulo", "Título: Z–A"],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="tags active-tags">
            {activos.map(([k, v]) => {
              const item = [...catalogos.carreras, ...catalogos.tipos].find(
                (i) => String(i.id) === v,
              );
              return (
                <button
                  key={k}
                  onClick={() => cambiar(k, "")}
                  aria-label={`Quitar ${etiquetas[k] || k}`}
                >
                  {etiquetas[k] || k}:{" "}
                  {["carrera", "tipo"].includes(k)
                    ? item?.nombre || v
                    : v === "true"
                      ? "Sí"
                      : v}{" "}
                  ×
                </button>
              );
            })}
          </div>
          {cargando ? (
            <div className="grid" role="status" aria-label="Cargando tesis">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div className="skeleton" key={n} />
              ))}
            </div>
          ) : error ? (
            <div className="empty" role="alert">
              <h3>No pudimos cargar la biblioteca</h3>
              <p>{error}</p>
              <button onClick={() => setIntento(intento + 1)}>
                Reintentar
              </button>
            </div>
          ) : datos.length ? (
            <>
              <div className="grid">
                {datos.map((t) => (
                  <TesisCard key={t.id} tesis={t} />
                ))}
              </div>
              <Paginacion
                pagina={pagina}
                total={total}
                tamano={tamano}
                onPagina={(n) => {
                  cambiar("page", String(n));
                  results.current?.scrollIntoView({ behavior: "smooth" });
                }}
                onTamano={(n) => cambiar("page_size", String(n))}
              />
            </>
          ) : (
            <div className="empty">
              <h3>No encontramos tesis con estos criterios</h3>
              <p>Prueba con otra búsqueda o limpia los filtros.</p>
              <button
                onClick={() => {
                  setBusqueda("");
                  setParams({});
                }}
              >
                Limpiar búsqueda y filtros
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
