import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { lista, mensajeError } from "../api";
import Modal from "../components/Modal";
import Paginacion from "../components/Paginacion";
export default function RevisionPage() {
  const [datos, setDatos] = useState([]),
    [total, setTotal] = useState(0),
    [pagina, setPagina] = useState(1),
    [tamano, setTamano] = useState(12),
    [version, setVersion] = useState(0),
    [cargando, setCargando] = useState(true),
    [error, setError] = useState(""),
    [aviso, setAviso] = useState(""),
    [modal, setModal] = useState(null),
    [observacion, setObservacion] = useState(""),
    [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const { data } = await api.get("/tesis/pendientes/", {
          params: { page: pagina, page_size: tamano },
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
  }, [pagina, tamano, version]);
  async function resolver(e) {
    e.preventDefault();
    setOcupado(true);
    try {
      await api.post(
        `/tesis/${modal.id}/${modal.accion}/`,
        modal.accion === "rechazar" ? { observacion } : {},
      );
      setAviso(
        modal.accion === "aprobar" ? "Tesis aprobada." : "Tesis rechazada.",
      );
      setModal(null);
      if (datos.length === 1 && pagina > 1) setPagina(pagina - 1);
      else setVersion((v) => v + 1);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GESTIÓN ACADÉMICA</span>
          <h1>Revisión de tesis</h1>
          <p>Revisa los trabajos enviados por nuestra comunidad.</p>
        </div>
      </div>
      {aviso && (
        <p className="notice" role="status">
          {aviso}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {cargando ? (
        <p role="status">Cargando pendientes…</p>
      ) : (
        <div className="stack">
          {datos.map((t) => (
            <article className="list-card" key={t.id}>
              <div>
                <span className="eyebrow">{t.carrera.nombre}</span>
                <h2>{t.titulo}</h2>
                <p>{t.autores.map((a) => a.nombre_completo).join(", ")}</p>
                <small>
                  Subida por {t.subido_por.nombre_completo} ·{" "}
                  {t.creado
                    ? new Date(t.creado).toLocaleDateString("es-CL")
                    : ""}
                </small>
              </div>
              <div className="row">
                <Link to={`/tesis/${t.id}`}>Ver</Link>
                <button
                  className="primary"
                  onClick={() => {
                    setObservacion("");
                    setModal({ id: t.id, accion: "aprobar" });
                  }}
                >
                  Aprobar
                </button>
                <button
                  onClick={() => {
                    setObservacion("");
                    setModal({ id: t.id, accion: "rechazar" });
                  }}
                >
                  Rechazar
                </button>
              </div>
            </article>
          ))}
          {!datos.length && !error && (
            <div className="empty">
              <h2>No hay revisiones pendientes</h2>
            </div>
          )}
        </div>
      )}
      <Paginacion
        pagina={pagina}
        total={total}
        tamano={tamano}
        onPagina={setPagina}
        onTamano={(n) => {
          setTamano(n);
          setPagina(1);
        }}
      />
      {modal && (
        <Modal
          titulo={
            modal.accion === "aprobar" ? "Aprobar tesis" : "Rechazar tesis"
          }
          onClose={() => !ocupado && setModal(null)}
        >
          <form onSubmit={resolver}>
            <p>Confirma la resolución de este trabajo.</p>
            {modal.accion === "rechazar" && (
              <label>
                Observación obligatoria
                <textarea
                  required
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                />
              </label>
            )}
            <button
              className="primary"
              disabled={
                ocupado || (modal.accion === "rechazar" && !observacion.trim())
              }
            >
              Confirmar
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
