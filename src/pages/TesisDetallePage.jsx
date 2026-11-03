import ResumenTesis from "../components/ResumenTesis";
import { toast } from "sonner";
import SkeletonLista from "../components/SkeletonLista";
import EstadoVacio from "../components/EstadoVacio";
import { ArrowLeft, ArrowRight, ArrowUpRight, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { descargar, mensajeError, urlSegura } from "../api";
import EstadoBadge from "../components/EstadoBadge";
import Modal from "../components/Modal";
export default function TesisDetallePage() {
  const { id } = useParams(),
    navigate = useNavigate();
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
      toast.success(
        {
          aprobar: "Tesis aprobada",
          rechazar: "Tesis rechazada",
          reenviar: "Tesis reenviada",
          eliminar: "Tesis eliminada",
        }[modal],
      );
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
        await descargar(`/materiales/${m.id}/descargar/`, m.titulo);
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
    return error ? (
      <EstadoVacio error titulo={error} />
    ) : (
      <SkeletonLista detalle />
    );
  return (
    <>
      <Link className="back" to="/">
        <ArrowLeft aria-hidden="true" /> Volver a la biblioteca
      </Link>
      <article className="detail">
        <span className="eyebrow">
          {t.carrera.nombre} · {t.anio}
        </span>
        <h1>{t.titulo}</h1>
        <p className="lead">
          {t.autores.map((a) => a.nombre_completo).join(" · ")}
        </p>
        {t.estado !== "PUBLICADA" && (
          <EstadoBadge estado={t.estado} estado_nombre={t.estado_nombre} />
        )}
        <dl className="metadata">
          {[
            ["Sede", t.sede?.nombre || "—"],
            ["Tipo", t.tipo.nombre],
            ["Profesor guía", t.profesor_guia],
            ["Período académico", t.periodo_texto],
            ["Nivel de formación", t.carrera?.nivel_formacion?.nombre || "—"],
            ["Páginas", t.num_paginas],
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
          Leer tesis <ArrowRight aria-hidden="true" />
        </Link>
        <h2>Resumen</h2>
        <ResumenTesis texto={t.resumen} />
        <div className="tags">
          {t.palabras_clave?.map((p) => (
            <Link key={p} to={`/?palabra_clave=${encodeURIComponent(p)}`}>
              {p}
            </Link>
          ))}
        </div>
        <h2>Material adicional</h2>
        <div className="stack">
          {t.materiales?.length ? (
            t.materiales.map((m) => (
              <div className="material" key={m.id}>
                <b>
                  {m.tipo === "REPOSITORIO" ? " GitHub · " : ""}
                  {m.titulo}
                </b>
                {m.restringido ? (
                  <p>
                    <LockKeyhole aria-hidden="true" /> Disponible solo para
                    estudiantes de {t.carrera.nombre}
                  </p>
                ) : m.tipo === "ENLACE" && urlSegura(m.url) ? (
                  <a
                    href={urlSegura(m.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir enlace <ArrowUpRight aria-hidden="true" />
                  </a>
                ) : (
                  <button onClick={() => material(m)}>
                    {m.tipo === "ARCHIVO"
                      ? "Descargar archivo"
                      : "Abrir repositorio "}
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="muted">Sin material adicional.</p>
          )}
        </div>
        {(t.puede_editar || t.puede_reenviar) && (
          <section className="notice">
            <h3>Gestionar mi tesis</h3>
            {t.observacion_revision && <p>{t.observacion_revision}</p>}
            <div className="row">
              {t.puede_editar && (
                <Link className="button" to={`/tesis/${id}/editar`}>
                  Editar
                </Link>
              )}
              {t.puede_reenviar && (
                <button onClick={() => setModal("reenviar")}>
                  Reenviar a revisión
                </button>
              )}
              {t.puede_editar && (
                <button className="danger" onClick={() => setModal("eliminar")}>
                  Eliminar
                </button>
              )}
            </div>
          </section>
        )}
        {t.puede_revisar && (
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
