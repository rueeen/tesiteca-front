import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { descargar, mensajeError, urlSegura } from "../api";
import { useAuth } from "../context/AuthContext";
import EstadoBadge from "../components/EstadoBadge";
import Modal from "../components/Modal";
export default function TesisDetallePage() {
  const { id } = useParams(),
    navigate = useNavigate();
  const { usuario, tieneRol } = useAuth();
  const [t, setT] = useState(null),
    [error, setError] = useState(""),
    [modal, setModal] = useState(""),
    [observacion, setObservacion] = useState(""),
    [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      try {
        const { data } = await api.get(`/tesis/${id}/`, { signal: c.signal });
        setT(data);
      } catch (e) {
        if (e.code !== "ERR_CANCELED") setError(mensajeError(e));
      }
    }
    cargar();
    return () => c.abort();
  }, [id]);
  async function accion() {
    setOcupado(true);
    setError("");
    try {
      if (modal === "eliminar") {
        await api.delete(`/tesis/${id}/`);
        navigate("/mis-tesis");
      } else {
        await api.post(
          `/tesis/${id}/${modal}/`,
          modal === "rechazar" ? { observacion } : {},
        );
        const { data } = await api.get(`/tesis/${id}/`);
        setT(data);
      }
      setModal("");
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  async function material(m) {
    try {
      if (m.tipo === "ARCHIVO")
        await descargar(
          `/materiales/${m.id}/descargar/`,
          m.nombre || "material",
        );
      else {
        const { data } = await api.post(`/materiales/${m.id}/acceso/`);
        const url = urlSegura(data.url);
        if (!url) throw Error();
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      }
    } catch (e) {
      setError(mensajeError(e));
    }
  }
  if (!t)
    return (
      <p role={error ? "alert" : "status"}>{error || "Cargando tesis…"}</p>
    );
  const autor =
    t.es_autor === true ||
    String(t.subido_por?.id || t.subido_por) === String(usuario.id) ||
    t.autores?.some(
      (a) =>
        (a.usuario != null && a.usuario === usuario.id) ||
        (usuario.email && a.email === usuario.email),
    );
  const editable = autor && ["BORRADOR", "RECHAZADA"].includes(t.estado);
  return (
    <>
      <Link className="back" to="/">
        ← Volver a la biblioteca
      </Link>
      <article className="detail">
        <span className="eyebrow">
          {t.carrera?.nombre || t.carrera} · {t.anio}
        </span>
        <h1>{t.titulo}</h1>
        <p className="lead">
          {t.autores?.map((a) => a.nombre || a).join(" · ")}
        </p>
        <EstadoBadge estado={t.estado} />
        <dl className="metadata">
          {[
            ["Sede", t.sede?.nombre || t.sede],
            ["Tipo", t.tipo?.nombre || t.tipo],
            ["Profesor guía", t.profesor_guia?.nombre || t.profesor_guia],
            ["Año / semestre", `${t.anio} / ${t.semestre || "—"}`],
            ["Páginas", t.numero_paginas],
            [
              "Publicación",
              t.fecha_publicacion
                ? new Date(t.fecha_publicacion).toLocaleDateString("es-CL")
                : "—",
            ],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v || "—"}</dd>
            </div>
          ))}
        </dl>
        <Link className="button primary" to={`/tesis/${id}/leer`}>
          Leer tesis →
        </Link>
        <h2>Resumen</h2>
        <p className="full-abstract">{t.resumen}</p>
        <div className="tags">
          {t.palabras_clave?.map((p) => (
            <Link
              key={p.id || p}
              to={`/?palabra_clave=${encodeURIComponent(p.nombre || p)}`}
            >
              {p.nombre || p}
            </Link>
          ))}
        </div>
        <h2>Material adicional</h2>
        <div className="stack">
          {t.materiales?.length ? (
            t.materiales.map((m) => (
              <div className="material" key={m.id}>
                <b>
                  {m.tipo === "REPOSITORIO" ? "⌘ GitHub · " : ""}
                  {m.nombre || m.tipo}
                </b>
                {m.restringido ? (
                  <p>
                    🔒 Disponible solo para estudiantes de{" "}
                    {m.carrera?.nombre || t.carrera?.nombre || "esta carrera"}
                  </p>
                ) : m.tipo === "ENLACE" && urlSegura(m.url) ? (
                  <a
                    href={urlSegura(m.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir enlace ↗
                  </a>
                ) : (
                  <button onClick={() => material(m)}>
                    {m.tipo === "ARCHIVO"
                      ? "Descargar archivo"
                      : "Abrir repositorio ↗"}
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="muted">Sin material adicional.</p>
          )}
        </div>
        {editable && (
          <section className="notice">
            <h3>Gestionar mi tesis</h3>
            {t.observacion && <p>{t.observacion}</p>}
            <div className="row">
              <Link className="button" to={`/tesis/${id}/editar`}>
                Editar
              </Link>
              <button onClick={() => setModal("reenviar")}>
                Reenviar a revisión
              </button>
              <button className="danger" onClick={() => setModal("eliminar")}>
                Eliminar
              </button>
            </div>
          </section>
        )}
        {tieneRol("COORDINADOR", "DIRECTOR", "ADMIN") &&
          t.estado === "EN_REVISION" && (
            <div className="row">
              <button className="primary" onClick={() => setModal("aprobar")}>
                Aprobar
              </button>
              <button onClick={() => setModal("rechazar")}>Rechazar</button>
            </div>
          )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </article>
      {modal && (
        <Modal
          titulo={`${modal[0].toUpperCase() + modal.slice(1)} tesis`}
          onClose={() => !ocupado && setModal("")}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              accion();
            }}
          >
            <p>¿Confirmas esta acción?</p>
            {modal === "rechazar" && (
              <label>
                Observación
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
                ocupado || (modal === "rechazar" && !observacion.trim())
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
