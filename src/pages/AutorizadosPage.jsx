import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import {
  emailFuncionario,
  formatearRut,
  limpiarRut,
  rutValido,
  erroresLegibles,
} from "../utils/cuentas";
import SelectSede from "../components/SelectSede";
import { pluralizar } from "../utils/texto";
import EstadoVacio from "../components/EstadoVacio";
import SkeletonLista from "../components/SkeletonLista";
import { toast } from "sonner";
import { ArrowDown, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import api, { descargar, lista, mensajeError } from "../api";
import { nombreRol } from "../roles";
import ZonaArchivo from "../components/ZonaArchivo";
import Paginacion from "../components/Paginacion";
export default function AutorizadosPage() {
  const { usuario, tieneRol } = useAuth();
  const admin = tieneRol("ADMIN");
  const puedeAgregar = tieneRol("ADMIN", "DIRECTOR");
  const [tipo, setTipo] = useState("estudiantes");
  const [areas, setAreas] = useState([]);
  const [modalFuncionario, setModalFuncionario] = useState(false);
  const [siguientePaso, setSiguientePaso] = useState("");
  const [plantillaError, setPlantillaError] = useState(false);
  const [edicion, setEdicion] = useState(null);
  const [editRol, setEditRol] = useState("");
  const [editActivo, setEditActivo] = useState(true);
  const [editError, setEditError] = useState("");
  const [archivo, setArchivo] = useState(null),
    [resultado, setResultado] = useState(null),
    [datos, setDatos] = useState([]),
    [carreras, setCarreras] = useState([]),
    [sedes, setSedes] = useState([]),
    [sede, setSede] = useState(""),
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
            tipo,
            search,
            rol,
            carrera,
            sede,
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
  }, [tipo, search, rol, carrera, sede, activo, pagina, tamano, version]);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      try {
        const r = await Promise.all(
          [
            "/catalogos/carreras/",
            "/catalogos/sedes/",
            ...(admin ? ["/catalogos/areas/"] : []),
          ].map((url) => api.get(url, { signal: c.signal })),
        );
        setCarreras(r[0].data);
        setSedes(r[1].data);
        setAreas(r[2]?.data || []);
      } catch (e) {
        if (e.code !== "ERR_CANCELED") setError(mensajeError(e));
      }
    }
    cargar();
    return () => c.abort();
  }, [admin]);
  async function plantilla() {
    try {
      await descargar(
        "/admin/autorizados/plantilla/",
        "plantilla-estudiantes.xlsx",
      );
    } catch (e) {
      setError(mensajeError(e));
    }
  }
  async function guardarEdicion(e) {
    e.preventDefault();
    setOcupado(true);
    setEditError("");
    try {
      await api.patch(`/admin/autorizados/${edicion.id}/`, {
        activo: editActivo,
        ...(admin ? { rol: editRol } : {}),
      });
      setEdicion(null);
      setVersion((v) => v + 1);
      toast.success("Autorización actualizada");
    } catch (e) {
      setEditError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  async function importar(e) {
    e.preventDefault();
    if (!archivo) return;
    setOcupado(true);
    setError("");
    setResultado(null);
    setPlantillaError(false);
    try {
      const body = new FormData();
      body.append("archivo", archivo);
      const { data } = await api.post("/admin/autorizados/importar/", body);
      setResultado(data);
      const errores = Array.isArray(data.errores)
        ? data.errores.length
        : data.errores || 0;
      toast.success(
        `Importación terminada: ${data.creados} ${pluralizar(data.creados, "creado", "creados")}, ${data.actualizados} ${pluralizar(data.actualizados, "actualizado", "actualizados")}, ${errores} ${pluralizar(errores, "error", "errores")}`,
      );
      setVersion((v) => v + 1);
    } catch (e) {
      const texto = erroresLegibles(e.response?.data);
      const cambio =
        e.response?.status === 400 && texto.includes("La plantilla cambió");
      setPlantillaError(cambio);
      setError(
        cambio
          ? "La plantilla cambió: descarga la nueva desde el panel"
          : mensajeError(e),
      );
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
      toast.success(u.activo ? "Acceso desactivado" : "Acceso activado");
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setActualizando(null);
    }
  }
  return (
    <>
      <div className="page-heading management-heading">
        <div>
          <span className="eyebrow">GESTIÓN DE ACCESO</span>
          <h1>Comunidad autorizada</h1>
          <p>Administra quiénes pueden acceder a la biblioteca.</p>
        </div>
        {puedeAgregar && (
          <button className="primary" onClick={() => setModalFuncionario(true)}>
            <UserPlus aria-hidden="true" /> Agregar funcionario
          </button>
        )}
      </div>
      <div className="tabs" role="tablist" aria-label="Tipo de autorizados">
        {[
          ["estudiantes", "Estudiantes"],
          ["funcionarios", "Funcionarios"],
        ].map(([v, t]) => (
          <button
            key={v}
            role="tab"
            aria-selected={tipo === v}
            onClick={() => {
              setTipo(v);
              setPagina(1);
              setRol("");
              setError("");
              setPlantillaError(false);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {siguientePaso && (
        <section className="form-panel" role="status">
          <h2>Próximo paso</h2>
          <p>{siguientePaso}</p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${window.location.origin}/solicitar-acceso`,
                );
                toast.success("Enlace copiado");
              } catch {
                toast.error("No se pudo copiar el enlace");
              }
            }}
          >
            Copiar enlace
          </button>
        </section>
      )}
      {tipo === "estudiantes" && (
        <section className="form-panel">
          <div className="row">
            <h2>Importar estudiantes</h2>
            <button onClick={plantilla}>
              Descargar plantilla <ArrowDown aria-hidden="true" />
            </button>
          </div>
          <p>
            Solo correos @inacapmail.cl. El rol siempre es Estudiante. Los
            coordinadores y directores se agregan con el botón Agregar
            funcionario.
          </p>
          <form onSubmit={importar}>
            <ZonaArchivo archivo={archivo} onChange={setArchivo} excel />
            <button className="primary" disabled={!archivo || ocupado}>
              {ocupado ? "Importando…" : "Importar archivo"}
            </button>
          </form>
          {resultado && (
            <div role="status">
              <div className="stats">
                {[
                  ["total", "registro", "registros"],
                  ["creados", "creado", "creados"],
                  ["actualizados", "actualizado", "actualizados"],
                  ["errores", "error", "errores"],
                ].map(([k, singular, plural]) => {
                  const cantidad = Array.isArray(resultado[k])
                    ? resultado[k].length
                    : (resultado[k] ?? 0);
                  return (
                    <div key={k}>
                      <strong>{cantidad}</strong>
                      <span>{pluralizar(cantidad, singular, plural)}</span>
                    </div>
                  );
                })}
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
                            <td data-label="Fila">{e.fila}</td>
                            <td data-label="Motivo">{e.motivo || e.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}
        </section>
      )}
      {error && (
        <div className="error form-panel" role="alert">
          <p>{error}</p>
          {plantillaError && (
            <a
              href="/api/admin/autorizados/plantilla/"
              onClick={(e) => {
                e.preventDefault();
                plantilla();
              }}
            >
              Descargar la nueva plantilla
            </a>
          )}
        </div>
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
          <SelectSede
            sedes={sedes}
            value={sede}
            vacio="Todas las sedes"
            onChange={(e) => {
              setSede(e.target.value);
              setPagina(1);
            }}
          />
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
          <SkeletonLista />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre / correo</th>
                  <th>RUT</th>
                  <th>Rol</th>
                  <th>Carrera</th>
                  <th>Cuenta</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Persona">
                      <b>{u.nombre_completo}</b>
                      <br />
                      {u.email}
                    </td>
                    <td data-label="RUT">{u.rut}</td>
                    <td data-label="Rol">{nombreRol(u.rol)}</td>
                    <td data-label="Carrera">{u.carrera?.nombre || "—"}</td>
                    <td data-label="Cuenta">
                      <span className="badge">
                        {{
                          PENDIENTE_VERIFICACION: "Esperando validación",
                          PENDIENTE_APROBACION: "Pendiente de aprobación",
                          ACTIVA: "Activa",
                          DESACTIVADA: "Desactivada",
                          RECHAZADA: "Rechazada",
                        }[u.estado_cuenta] || "Sin cuenta"}
                      </span>
                    </td>
                    <td data-label="Activo">
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
                    <td data-label="Acciones">
                      <button
                        onClick={() => {
                          setEdicion(u);
                          setEditRol(u.rol);
                          setEditActivo(Boolean(u.activo));
                          setEditError("");
                        }}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!datos.length && !error && (
              <EstadoVacio titulo="No hay personas con estos criterios" />
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
      {modalFuncionario && (
        <Modal
          titulo="Agregar funcionario"
          onClose={() => setModalFuncionario(false)}
        >
          <FormularioFuncionario
            admin={admin}
            usuario={usuario}
            carreras={carreras}
            areas={areas}
            sedes={sedes}
            onGuardado={(data) => {
              setModalFuncionario(false);
              setSiguientePaso(data.siguiente_paso);
              setTipo("funcionarios");
              setPagina(1);
              setRol("");
              setVersion((v) => v + 1);
              toast.success("Funcionario agregado");
            }}
          />
        </Modal>
      )}
      {edicion && (
        <Modal
          titulo="Editar autorización"
          onClose={() => !ocupado && setEdicion(null)}
        >
          <form className="stack" onSubmit={guardarEdicion}>
            <p>{edicion.email}</p>
            {admin && (
              <label>
                Rol a asignar
                <select
                  value={editRol}
                  onChange={(e) => setEditRol(e.target.value)}
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
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={editActivo}
                onChange={(e) => setEditActivo(e.target.checked)}
              />
              Acceso activo
            </label>
            {editError && (
              <p role="alert" className="error">
                {editError}
              </p>
            )}
            <button className="primary" disabled={ocupado}>
              Guardar autorización
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function FormularioFuncionario({
  admin,
  usuario,
  carreras,
  areas,
  sedes,
  onGuardado,
}) {
  const [form, setForm] = useState({
    email: "",
    nombre_completo: "",
    rut: "",
    rol: "COORDINADOR",
    carrera: "",
    area: "",
    sede: admin ? "" : String(usuario.sede?.id || ""),
  });
  const [errores, setErrores] = useState({}),
    [error, setError] = useState(""),
    [ocupado, setOcupado] = useState(false);
  const cambiar = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((e) => ({ ...e, [k]: null }));
  };
  const err = (k) =>
    errores[k] && (
      <span className="field-error" role="alert">
        {erroresLegibles(errores[k])}
      </span>
    );
  const disponibles = admin
    ? carreras
    : carreras.filter(
        (c) => String(c.area?.id ?? c.area) === String(usuario.area?.id),
      );
  async function enviar(e) {
    e.preventDefault();
    setError("");
    const validacion = {};
    if (!emailFuncionario(form.email))
      validacion.email = "Usa un correo @inacap.cl.";
    if (form.rut.trim() && !rutValido(form.rut))
      validacion.rut = "El RUT no es válido.";
    setErrores(validacion);
    if (Object.keys(validacion).length) return;
    setOcupado(true);
    try {
      const body = {
        email: form.email.trim().toLowerCase(),
        nombre_completo: form.nombre_completo.trim(),
        rol: admin ? form.rol : "COORDINADOR",
        sede: Number(admin ? form.sede : usuario.sede.id),
        ...(form.rut.trim()
          ? {
              rut:
                limpiarRut(form.rut).slice(0, -1) +
                "-" +
                limpiarRut(form.rut).at(-1),
            }
          : {}),
        ...(form.rol === "COORDINADOR"
          ? { carrera: Number(form.carrera) }
          : { area: Number(form.area) }),
      };
      const { data } = await api.post("/admin/funcionarios/", body);
      onGuardado(data);
    } catch (e) {
      setErrores(e.response?.status === 400 ? e.response.data : {});
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  return (
    <form className="stack" onSubmit={enviar}>
      <label>
        Correo institucional
        <input
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => cambiar("email", e.target.value)}
        />
        {err("email")}
      </label>
      <label>
        Nombre completo
        <input
          required
          autoComplete="name"
          value={form.nombre_completo}
          onChange={(e) => cambiar("nombre_completo", e.target.value)}
        />
        {err("nombre_completo")}
      </label>
      <label>
        RUT (opcional)
        <input
          value={form.rut}
          maxLength={12}
          onChange={(e) => cambiar("rut", formatearRut(e.target.value))}
        />
        {err("rut")}
      </label>
      <label>
        Rol solicitado
        <select
          disabled={!admin}
          value={form.rol}
          onChange={(e) => cambiar("rol", e.target.value)}
        >
          <option value="COORDINADOR">Coordinador/a</option>
          {admin && <option value="DIRECTOR">Director/a</option>}
        </select>
        {err("rol")}
      </label>
      {form.rol === "COORDINADOR" ? (
        <label>
          Carrera
          <select
            required
            value={form.carrera}
            onChange={(e) => cambiar("carrera", e.target.value)}
          >
            <option value="">Selecciona una carrera</option>
            {disponibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          {err("carrera")}
        </label>
      ) : (
        <label>
          Área
          <select
            required
            value={form.area}
            onChange={(e) => cambiar("area", e.target.value)}
          >
            <option value="">Selecciona un área</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          {err("area")}
        </label>
      )}
      <SelectSede
        required
        disabled={!admin}
        sedes={admin ? sedes : sedes.filter((s) => s.id === usuario.sede?.id)}
        value={form.sede}
        onChange={(e) => cambiar("sede", e.target.value)}
        error={errores.sede && erroresLegibles(errores.sede)}
      />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="primary" disabled={ocupado}>
        {ocupado ? "Guardando…" : "Guardar funcionario"}
      </button>
    </form>
  );
}
