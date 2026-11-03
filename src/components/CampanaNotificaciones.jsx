import { bloquearScroll } from "../utils/scroll";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { useNotificaciones } from "../context/NotificacionesContext";
import { rutaNotificacion } from "../utils/rutas";
import { mensajeError } from "../api";
import ItemNotificacion from "./ItemNotificacion";
export default function CampanaNotificaciones() {
  const [abierto, setAbierto] = useState(false);
  const {
    noLeidas,
    recientes,
    conectado,
    error,
    marcarLeida,
    marcarTodas,
    recargar,
  } = useNotificaciones();
  const ref = useRef(),
    panel = useRef();
  const navigate = useNavigate(),
    location = useLocation();
  useEffect(() => setAbierto(false), [location.key]);
  useEffect(() => {
    if (!abierto) return;
    const antes = document.activeElement;
    panel.current?.focus();
    function cerrar(e) {
      if (e.key === "Escape") {
        setAbierto(false);
        return;
      }
      if (e.key === "Tab" && window.matchMedia("(max-width:767px)").matches) {
        const items = [...panel.current.querySelectorAll("button,a[href]")];
        const primero = items[0],
          ultimo = items.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === primero ||
            document.activeElement === panel.current)
        ) {
          e.preventDefault();
          ultimo?.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero?.focus();
        }
      }
    }
    function fuera(e) {
      if (!ref.current?.contains(e.target)) setAbierto(false);
    }
    const desbloquear = window.matchMedia("(max-width:767px)").matches
      ? bloquearScroll()
      : () => {};
    document.addEventListener("keydown", cerrar);
    document.addEventListener("pointerdown", fuera);
    return () => {
      desbloquear();
      document.removeEventListener("keydown", cerrar);
      document.removeEventListener("pointerdown", fuera);
      antes?.focus();
    };
  }, [abierto]);
  async function ver(n) {
    try {
      await marcarLeida(n.id);
      navigate(rutaNotificacion(n));
      setAbierto(false);
    } catch (e) {
      toast.error(mensajeError(e));
    }
  }
  return (
    <div className="notification-bell" ref={ref}>
      <button
        className="icon-button"
        aria-label={`Notificaciones, ${noLeidas} sin leer`}
        aria-expanded={abierto}
        aria-controls="panel-notificaciones"
        onClick={() => {
          setAbierto(!abierto);
          if (!abierto) recargar();
        }}
      >
        <Bell aria-hidden="true" />
        {noLeidas > 0 && (
          <span className="notification-badge">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>
      {abierto && (
        <section
          className="notification-panel"
          id="panel-notificaciones"
          aria-label="Centro de notificaciones"
          tabIndex={-1}
          ref={panel}
        >
          <div className="row">
            <h2>Notificaciones</h2>
            <button
              className="icon-button"
              aria-label="Cerrar notificaciones"
              onClick={() => setAbierto(false)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <p className="transport-status">
            {conectado ? "En vivo" : "Actualización periódica"}
          </p>
          {error && (
            <p role="status" className="muted">
              {error}
            </p>
          )}
          <button
            className="quiet"
            onClick={async () => {
              try {
                await marcarTodas();
                toast.success("Todas las notificaciones están leídas");
              } catch (e) {
                toast.error(mensajeError(e));
              }
            }}
          >
            Marcar todas como leídas
          </button>
          <div className="notification-list">
            {recientes.map((n) => (
              <ItemNotificacion key={n.id} item={n} onClick={ver} />
            ))}
            {!recientes.length && (
              <p className="empty-small">Aún no tienes notificaciones.</p>
            )}
          </div>
          <Link className="button wide" to="/notificaciones">
            Ver todas
          </Link>
        </section>
      )}
    </div>
  );
}
