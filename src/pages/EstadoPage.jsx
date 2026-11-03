import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import api, { mensajeError } from "../api";
export default function EstadoPage() {
  const [salud, setSalud] = useState(null),
    [error, setError] = useState(""),
    [cargando, setCargando] = useState(true),
    [intento, setIntento] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const { data } = await api.get("/salud/", {
          signal: c.signal,
          sinSesion: true,
          silenciarRed: true,
        });
        setSalud(data);
      } catch (e) {
        if (e.code !== "ERR_CANCELED") {
          setSalud(null);
          setError(mensajeError(e));
        }
      } finally {
        if (!c.signal.aborted) setCargando(false);
      }
    }
    cargar();
    return () => c.abort();
  }, [intento]);
  return (
    <section className="detail">
      <span className="eyebrow">TESITECA · INACAP ARICA</span>
      <h1>Estado del servicio</h1>
      <p>Información de conexión de la biblioteca.</p>
      {cargando && <p role="status">Comprobando el servicio…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <dl className="metadata">
        <div>
          <dt>Estado</dt>
          <dd>
            {cargando ? "Comprobando…" : salud?.estado || "No disponible"}
          </dd>
        </div>
        <div>
          <dt>Versión del backend</dt>
          <dd>{salud?.version || "No informada"}</dd>
        </div>
        <div>
          <dt>Proxy firmado</dt>
          <dd>
            {salud?.via_proxy === true ? (
              <>
                <CheckCircle2 aria-hidden="true" className="exito" /> Verificado
              </>
            ) : (
              <>
                <XCircle aria-hidden="true" className="rechazo" /> No verificado
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Notificaciones</dt>
          <dd>Actualización periódica</dd>
        </div>
        <div>
          <dt>Versión del front</dt>
          <dd>{__FRONT_VERSION__}</dd>
        </div>
      </dl>
      <button onClick={() => setIntento((v) => v + 1)} disabled={cargando}>
        <RefreshCw aria-hidden="true" />
        Volver a comprobar
      </button>
    </section>
  );
}
