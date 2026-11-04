import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { mensajeError } from "../api";
import VisorPdf from "../components/VisorPdf";
export default function VisorPage() {
  const { id } = useParams();
  const [url, setUrl] = useState(""),
    [progreso, setProgreso] = useState(null),
    [error, setError] = useState(""),
    [intento, setIntento] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    let local;
    setUrl("");
    setError("");
    setProgreso(null);
    async function cargar() {
      try {
        const { data } = await api.get(`/tesis/${id}/pdf/`, {
          responseType: "blob",
          timeout: 0,
          signal: c.signal,
          onDownloadProgress: (e) =>
            setProgreso(
              e.total ? Math.round((e.loaded / e.total) * 100) : null,
            ),
        });
        if (c.signal.aborted) return;
        local = URL.createObjectURL(data);
        setUrl(local);
      } catch (e) {
        if (e.code !== "ERR_CANCELED") setError(mensajeError(e));
      }
    }
    cargar();
    return () => {
      c.abort();
      if (local) URL.revokeObjectURL(local);
    };
  }, [id, intento]);
  // Punto de extensión: seleccionar aquí un visor según el tipo de archivo de la API.
  return (
    <>
      <Link className="back" to={`/tesis/${id}`}>
        <ArrowLeft aria-hidden="true" /> Volver al detalle
      </Link>
      {error ? (
        <section className="empty" role="alert">
          <h2>{error}</h2>
          <button className="primary" onClick={() => setIntento((i) => i + 1)}>
            Reintentar
          </button>
        </section>
      ) : url ? (
        <VisorPdf url={url} />
      ) : (
        <div className="empty" role="status">
          <h2>Preparando tu lectura</h2>
          <p>Descargando PDF {progreso !== null ? `${progreso}%` : ""}</p>
          <progress max="100" value={progreso ?? undefined} />
        </div>
      )}
    </>
  );
}
