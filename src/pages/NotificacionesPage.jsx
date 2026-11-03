import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { mensajeError } from "../api";
import { useNotificaciones } from "../context/NotificacionesContext";
import { rutaNotificacion } from "../utils/rutas";
import ItemNotificacion from "../components/ItemNotificacion";
import Paginacion from "../components/Paginacion";
import SkeletonLista from "../components/SkeletonLista";
import EstadoVacio from "../components/EstadoVacio";
export default function NotificacionesPage() {
  const [datos, setDatos] = useState([]),
    [total, setTotal] = useState(0),
    [pagina, setPagina] = useState(1),
    [tamano, setTamano] = useState(12),
    [filtro, setFiltro] = useState(""),
    [error, setError] = useState(""),
    [cargando, setCargando] = useState(true),
    [version, setVersion] = useState(0);
  const { marcarLeida, marcarTodas } = useNotificaciones();
  const navigate = useNavigate();
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const { data } = await api.get("/notificaciones/", {
          signal: c.signal,
          params: {
            page: pagina,
            page_size: tamano,
            ...(filtro ? { leida: false } : {}),
          },
        });
        setDatos(data.results);
        setTotal(data.count);
      } catch (e) {
        if (e.code !== "ERR_CANCELED") setError(mensajeError(e));
      } finally {
        if (!c.signal.aborted) setCargando(false);
      }
    }
    cargar();
    return () => c.abort();
  }, [pagina, tamano, filtro, version]);
  async function ver(n) {
    try {
      await marcarLeida(n.id);
      navigate(rutaNotificacion(n));
    } catch (e) {
      toast.error(mensajeError(e));
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MI COMUNIDAD</span>
          <h1>Notificaciones</h1>
          <p>Las novedades de tus tesis, en un solo lugar.</p>
        </div>
        <button
          onClick={async () => {
            try {
              await marcarTodas();
              setVersion((v) => v + 1);
              toast.success("Todas las notificaciones están leídas");
            } catch (e) {
              toast.error(mensajeError(e));
            }
          }}
        >
          Marcar todas como leídas
        </button>
      </div>
      <label className="notification-filter">
        Mostrar
        <select
          value={filtro}
          onChange={(e) => {
            setFiltro(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todas</option>
          <option value="no-leidas">No leídas</option>
        </select>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {cargando ? (
        <SkeletonLista />
      ) : datos.length ? (
        <div className="notification-history">
          {datos.map((n) => (
            <ItemNotificacion key={n.id} item={n} onClick={ver} />
          ))}
        </div>
      ) : (
        <EstadoVacio
          titulo="Estás al día"
          texto="No hay notificaciones con este filtro."
        />
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
    </>
  );
}
