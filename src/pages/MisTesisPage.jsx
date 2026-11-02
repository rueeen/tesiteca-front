import EstadoVacio from "../components/EstadoVacio";
import SkeletonLista from "../components/SkeletonLista";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { lista, mensajeError } from "../api";
import EstadoBadge from "../components/EstadoBadge";
import Paginacion from "../components/Paginacion";
export default function MisTesisPage() {
  const [datos, setDatos] = useState([]),
    [total, setTotal] = useState(0),
    [pagina, setPagina] = useState(1),
    [tamano, setTamano] = useState(12),
    [cargando, setCargando] = useState(true),
    [error, setError] = useState("");
  const [version, setVersion] = useState(0),
    [enviando, setEnviando] = useState(null);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const { data } = await api.get("/tesis/mis-tesis/", {
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
  async function reenviar(t) {
    setEnviando(t.id);
    setError("");
    try {
      await api.post(`/tesis/${t.id}/reenviar/`);
      toast.success("Tesis reenviada");
      setVersion((v) => v + 1);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(null);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MI ESPACIO</span>
          <h1>Mis tesis</h1>
          <p>
            Consulta el estado de tus trabajos y continúa compartiendo
            conocimiento.
          </p>
        </div>
        <Link className="button primary" to="/subir">
          + Subir tesis
        </Link>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {cargando ? (
        <SkeletonLista />
      ) : (
        <>
          <div className="stack">
            {datos.map((t) => (
              <article className="list-card" key={t.id}>
                <div>
                  <h2>
                    <Link to={`/tesis/${t.id}`}>{t.titulo}</Link>
                  </h2>
                  <p>
                    {t.anio} ·{" "}
                    {t.creado
                      ? new Date(t.creado).toLocaleDateString("es-CL")
                      : ""}
                  </p>
                  <EstadoBadge
                    estado={t.estado}
                    estado_nombre={t.estado_nombre}
                  />
                  {t.estado === "RECHAZADA" && (
                    <p className="error">{t.observacion_revision}</p>
                  )}
                </div>
                <div className="row">
                  <Link to={`/tesis/${t.id}`}>
                    Ver detalle <ArrowRight aria-hidden="true" />
                  </Link>
                  {t.puede_reenviar && (
                    <button
                      disabled={enviando === t.id}
                      onClick={() => reenviar(t)}
                    >
                      Reenviar
                    </button>
                  )}
                  {t.puede_editar && (
                    <Link to={`/tesis/${t.id}/editar`}>Editar</Link>
                  )}
                </div>
              </article>
            ))}
            {!datos.length && !error && (
              <EstadoVacio
                titulo="Aún no tienes tesis"
                texto="Tu próximo aporte comienza aquí."
                accion="Subir tesis"
                destino="/subir"
              />
            )}
          </div>
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
        </>
      )}
    </>
  );
}
