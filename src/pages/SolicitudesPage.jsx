import { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { mensajeError } from "../api";
import { useAuth } from "../context/AuthContext";
import { useNotificaciones } from "../context/NotificacionesContext";
import { nombreRol } from "../roles";
import Modal from "../components/Modal";
import SelectSede from "../components/SelectSede";
import Paginacion from "../components/Paginacion";
import SkeletonLista from "../components/SkeletonLista";
import EstadoVacio from "../components/EstadoVacio";
export default function SolicitudesPage() {
  const { usuario, tieneRol } = useAuth();
  const { recargar } = useNotificaciones();
  const admin = tieneRol("ADMIN");
  const [estado, setEstado] = useState("PENDIENTE"),
    [busqueda, setBusqueda] = useState(""),
    [search, setSearch] = useState(""),
    [carrera, setCarrera] = useState(""),
    [sede, setSede] = useState(admin ? "" : String(usuario.sede?.id || "")),
    [catalogos, setCatalogos] = useState({ sedes: [], carreras: [] }),
    [datos, setDatos] = useState([]),
    [total, setTotal] = useState(0),
    [pagina, setPagina] = useState(1),
    [tamano, setTamano] = useState(12),
    [version, setVersion] = useState(0),
    [cargando, setCargando] = useState(true),
    [error, setError] = useState(""),
    [modal, setModal] = useState(null),
    [motivo, setMotivo] = useState(""),
    [ajuste, setAjuste] = useState({
      rol: "ESTUDIANTE",
      carrera: "",
      sede: "",
    }),
    [ocupado, setOcupado] = useState(false),
    [modalError, setModalError] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(busqueda);
      setPagina(1);
    }, 400);
    return () => clearTimeout(t);
  }, [busqueda]);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      try {
        const r = await Promise.all(
          ["/catalogos/carreras/", "/catalogos/sedes/"].map((url) =>
            api.get(url, { signal: c.signal }),
          ),
        );
        setCatalogos({ carreras: r[0].data, sedes: r[1].data });
      } catch (e) {
        if (e.code !== "ERR_CANCELED") setError(mensajeError(e));
      }
    }
    cargar();
    return () => c.abort();
  }, []);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const { data } = await api.get("/solicitudes/", {
          signal: c.signal,
          params: {
            estado,
            search,
            carrera,
            sede,
            page: pagina,
            page_size: tamano,
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
  }, [estado, search, carrera, sede, pagina, tamano, version]);
  function abrir(s, accion) {
    setModal({ solicitud: s, accion });
    setMotivo("");
    setModalError("");
    setAjuste({
      rol: s.rol_solicitado,
      carrera: String(s.carrera?.id || ""),
      sede: String(s.sede?.id || ""),
    });
  }
  async function resolver(e) {
    e.preventDefault();
    if (modal.accion === "rechazar" && !motivo.trim()) {
      setModalError("Escribe un motivo de rechazo.");
      return;
    }
    setOcupado(true);
    setModalError("");
    try {
      const s = modal.solicitud;
      const body =
        modal.accion === "rechazar"
          ? { motivo: motivo.trim() }
          : s.puede_cambiar_rol
            ? {
                rol: ajuste.rol,
                carrera: ajuste.carrera ? Number(ajuste.carrera) : null,
                sede: Number(ajuste.sede),
              }
            : {};
      const { data } = await api.post(
        `/solicitudes/${s.id}/${modal.accion}/`,
        body,
      );
      toast.success(
        modal.accion === "aprobar"
          ? data.estado_cuenta === "PENDIENTE_VERIFICACION"
            ? "Aprobada. Se activará cuando valide su correo."
            : "Solicitud aprobada"
          : "Solicitud rechazada",
      );
      setModal(null);
      if (datos.length === 1 && pagina > 1) setPagina((p) => p - 1);
      else setVersion((v) => v + 1);
      await recargar();
    } catch (e) {
      setModalError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  const sedesVisibles = admin
    ? catalogos.sedes
    : catalogos.sedes.filter((s) => s.id === usuario.sede?.id);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">COMUNIDAD INACAP</span>
          <h1>Solicitudes de acceso</h1>
          <p>Revisa las cuentas solicitadas para tu comunidad.</p>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Estado de solicitudes">
        {[
          ["PENDIENTE", "Pendientes"],
          ["APROBADA", "Aprobadas"],
          ["RECHAZADA", "Rechazadas"],
        ].map(([v, t]) => (
          <button
            key={v}
            role="tab"
            aria-selected={estado === v}
            onClick={() => {
              setEstado(v);
              setPagina(1);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="form-panel form-grid">
        <label>
          Buscar solicitudes
          <input
            placeholder="Nombre, correo o RUT"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <label>
          Carrera
          <select
            value={carrera}
            onChange={(e) => {
              setCarrera(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todas</option>
            {catalogos.carreras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <SelectSede
          sedes={sedesVisibles}
          value={sede}
          disabled={!admin}
          vacio={admin ? "Todas las sedes" : "Mi sede"}
          onChange={(e) => {
            setSede(e.target.value);
            setPagina(1);
          }}
        />
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {cargando ? (
        <SkeletonLista />
      ) : datos.length ? (
        <div className="stack">
          {datos.map((s) => (
            <article className="list-card request-card" key={s.id}>
              <div>
                <span className="badge">{s.estado}</span>
                {s.estado === "APROBADA" && s.correo_validado === false && (
                  <span className="badge">Esperando validación de correo</span>
                )}
                <h2>{s.usuario.nombre_completo}</h2>
                <p>
                  {s.usuario.email} · {s.usuario.rut}
                </p>
                <p>
                  {nombreRol(s.rol_solicitado)} ·{" "}
                  {s.carrera?.nombre || "Sin carrera"} ·{" "}
                  {s.sede?.nombre || "Sin sede"}
                </p>
                {s.mensaje && <p className="request-message">{s.mensaje}</p>}
                <small>{new Date(s.creada).toLocaleDateString("es-CL")}</small>
                {s.motivo_rechazo && (
                  <p className="error">{s.motivo_rechazo}</p>
                )}
              </div>
              {s.estado === "PENDIENTE" && (
                <div className="row">
                  <button
                    className="primary"
                    onClick={() => abrir(s, "aprobar")}
                  >
                    Aprobar solicitud
                  </button>
                  <button onClick={() => abrir(s, "rechazar")}>
                    Rechazar solicitud
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EstadoVacio titulo="No hay solicitudes con estos criterios" />
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
            modal.accion === "aprobar"
              ? "Aprobar solicitud"
              : "Rechazar solicitud"
          }
          onClose={() => !ocupado && setModal(null)}
        >
          <form className="stack" onSubmit={resolver}>
            <p>
              {modal.solicitud.usuario.nombre_completo} ·{" "}
              {modal.solicitud.usuario.email}
            </p>
            {modal.accion === "rechazar" ? (
              <label>
                Motivo de rechazo
                <textarea
                  required
                  maxLength={300}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
                <small>{motivo.length}/300</small>
              </label>
            ) : modal.solicitud.puede_cambiar_rol ? (
              <>
                <label>
                  Rol a asignar
                  <select
                    value={ajuste.rol}
                    onChange={(e) =>
                      setAjuste((a) => ({ ...a, rol: e.target.value }))
                    }
                  >
                    {["ESTUDIANTE", "COORDINADOR", "DIRECTOR", "ADMIN"].map(
                      (r) => (
                        <option key={r} value={r}>
                          {nombreRol(r)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Carrera a asignar
                  <select
                    value={ajuste.carrera}
                    onChange={(e) =>
                      setAjuste((a) => ({ ...a, carrera: e.target.value }))
                    }
                  >
                    <option value="">Sin carrera</option>
                    {catalogos.carreras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <SelectSede
                  label="Sede a asignar"
                  required
                  sedes={admin ? catalogos.sedes : sedesVisibles}
                  value={ajuste.sede}
                  onChange={(e) =>
                    setAjuste((a) => ({ ...a, sede: e.target.value }))
                  }
                />
              </>
            ) : (
              <p>¿Confirmas la aprobación?</p>
            )}
            {modalError && (
              <p role="alert" className="error">
                {modalError}
              </p>
            )}
            <button
              className="primary"
              disabled={
                ocupado || (modal.accion === "rechazar" && !motivo.trim())
              }
            >
              Confirmar resolución
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
