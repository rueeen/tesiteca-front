import { useEffect, useState } from "react";
import api, { descargar, lista, mensajeError } from "../api";
import { nombreRol } from "../roles";
import ZonaArchivo from "../components/ZonaArchivo";
import Paginacion from "../components/Paginacion";
export default function AutorizadosPage() {
  const [archivo, setArchivo] = useState(null),
    [resultado, setResultado] = useState(null),
    [datos, setDatos] = useState([]),
    [carreras, setCarreras] = useState([]),
    [busqueda, setBusqueda] = useState(""),
    [search, setSearch] = useState(""),
    [rol, setRol] = useState(""),
    [carrera, setCarrera] = useState(""),
    [activo, setActivo] = useState(""),
    [pagina, setPagina] = useState(1),
    [tamano, setTamano] = useState(12),
    [total, setTotal] = useState(0),
    [error, setError] = useState(""),
    [cargando, setCargando] = useState(true),
    [ocupado, setOcupado] = useState(false),
    [version, setVersion] = useState(0),
    [actualizando, setActualizando] = useState(null);
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
      setCargando(true);
      setError("");
      try {
        const { data } = await api.get("/admin/autorizados/", {
          params: {
            search,
            rol,
            carrera,
            activo,
            page: pagina,
            page_size: tamano,
          },
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
  }, [search, rol, carrera, activo, pagina, tamano, version]);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      try {
        const { data } = await api.get("/catalogos/carreras/", {
          signal: c.signal,
        });
        setCarreras(lista(data));
      } catch (e) {
        if (e.code !== "ERR_CANCELED") setError(mensajeError(e));
      }
    }
    cargar();
    return () => c.abort();
  }, []);
  async function importar(e) {
    e.preventDefault();
    if (!archivo) return;
    setOcupado(true);
    setError("");
    setResultado(null);
    try {
      const body = new FormData();
      body.append("archivo", archivo);
      const { data } = await api.post("/admin/autorizados/importar/", body);
      setResultado(data);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  async function alternar(u) {
    setActualizando(u.id);
    try {
      const { data } = await api.patch(`/admin/autorizados/${u.id}/`, {
        activo: !u.activo,
      });
      setDatos((items) =>
        items.map((x) => (x.id === u.id ? { ...x, ...data } : x)),
      );
      setVersion((v) => v + 1);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setActualizando(null);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GESTIÓN DE ACCESO</span>
          <h1>Comunidad autorizada</h1>
          <p>Administra quiénes pueden acceder a la biblioteca.</p>
        </div>
      </div>
      <section className="form-panel">
        <div className="row">
          <h2>Importar lista blanca</h2>
          <button
            onClick={async () => {
              try {
                await descargar(
                  "/admin/autorizados/plantilla/",
                  "plantilla-autorizados.xlsx",
                );
              } catch (e) {
                setError(mensajeError(e));
              }
            }}
          >
            Descargar plantilla ↓
          </button>
        </div>
        <form onSubmit={importar}>
          <ZonaArchivo archivo={archivo} onChange={setArchivo} excel />
          <button className="primary" disabled={!archivo || ocupado}>
            {ocupado ? "Importando…" : "Importar archivo"}
          </button>
        </form>
        {resultado && (
          <div role="status">
            <div className="stats">
              {["total", "creados", "actualizados", "errores"].map((k) => (
                <div key={k}>
                  <strong>
                    {Array.isArray(resultado[k])
                      ? resultado[k].length
                      : (resultado[k] ?? 0)}
                  </strong>
                  <span>{k}</span>
                </div>
              ))}
            </div>
            {Array.isArray(resultado.errores) &&
              resultado.errores.length > 0 && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fila</th>
                        <th>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.errores.map((e, i) => (
                        <tr key={i}>
                          <td>{e.fila}</td>
                          <td>{e.motivo || e.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="form-panel">
        <h2>Lista de autorizados</h2>
        <div className="form-grid">
          <label>
            Buscar
            <input
              placeholder="Correo, nombre o RUT"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
          <label>
            Rol
            <select
              value={rol}
              onChange={(e) => {
                setRol(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos</option>
              {["ESTUDIANTE", "COORDINADOR", "DIRECTOR", "ADMIN"].map((r) => (
                <option key={r} value={r}>
                  {nombreRol(r)}
                </option>
              ))}
            </select>
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
              {carreras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <select
              value={activo}
              onChange={(e) => {
                setActivo(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
        </div>
        {cargando ? (
          <p role="status">Cargando lista…</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre / correo</th>
                  <th>RUT</th>
                  <th>Rol</th>
                  <th>Carrera</th>
                  <th>Activo</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b>{u.nombre_completo}</b>
                      <br />
                      {u.email}
                    </td>
                    <td>{u.rut}</td>
                    <td>{nombreRol(u.rol)}</td>
                    <td>{u.carrera?.nombre || "—"}</td>
                    <td>
                      <button
                        role="switch"
                        aria-checked={Boolean(u.activo)}
                        aria-label={`Acceso de ${u.nombre_completo || u.email}`}
                        className={`switch ${u.activo ? "on" : ""}`}
                        disabled={actualizando === u.id}
                        onClick={() => alternar(u)}
                      >
                        {u.activo ? "Sí" : "No"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!datos.length && !error && (
              <p className="empty">No hay personas con estos criterios.</p>
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
      </section>
    </>
  );
}
