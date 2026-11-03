import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import api, { lista, mensajeError } from "../api";
import Modal from "../components/Modal";
import Paginacion from "../components/Paginacion";
import SkeletonLista from "../components/SkeletonLista";
import { erroresLegibles } from "../utils/cuentas";
export default function AdminSedesPage() {
  const [datos, setDatos] = useState([]),
    [regiones, setRegiones] = useState([]),
    [total, setTotal] = useState(0),
    [pagina, setPagina] = useState(1),
    [tamano, setTamano] = useState(12),
    [version, setVersion] = useState(0),
    [cargando, setCargando] = useState(true),
    [error, setError] = useState(""),
    [modal, setModal] = useState(null),
    [form, setForm] = useState({
      nombre: "",
      ciudad: "",
      region: "",
      orden: 0,
      activa: true,
    }),
    [errores, setErrores] = useState({}),
    [ocupado, setOcupado] = useState(false),
    [actualizando, setActualizando] = useState(null);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      try {
        const { data } = await api.get("/catalogos/regiones/", {
          signal: c.signal,
        });
        setRegiones(data);
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
      try {
        const { data } = await api.get("/admin/sedes/", {
          signal: c.signal,
          params: { page: pagina, page_size: tamano },
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
  function abrir(s) {
    setErrores({});
    setError("");
    setModal({ id: s?.id || null });
    setForm(
      s
        ? {
            nombre: s.nombre,
            ciudad: s.ciudad,
            region: String(s.region.id),
            orden: s.orden,
            activa: s.activa,
          }
        : { nombre: "", ciudad: "", region: "", orden: 0, activa: true },
    );
  }
  async function guardar(e) {
    e.preventDefault();
    setOcupado(true);
    setError("");
    setErrores({});
    try {
      await api.request({
        method: modal.id ? "patch" : "post",
        url: modal.id ? `/admin/sedes/${modal.id}/` : "/admin/sedes/",
        data: {
          ...form,
          nombre: form.nombre.trim(),
          ciudad: form.ciudad.trim(),
          region: Number(form.region),
          orden: Number(form.orden),
        },
      });
      toast.success(modal.id ? "Sede actualizada" : "Sede creada");
      setModal(null);
      setVersion((v) => v + 1);
    } catch (e) {
      setErrores(e.response?.data || {});
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  async function alternar(s) {
    setActualizando(s.id);
    try {
      await api.patch(`/admin/sedes/${s.id}/`, { activa: !s.activa });
      setVersion((v) => v + 1);
      toast.success("Estado de sede actualizado");
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setActualizando(null);
    }
  }
  const err = (k) =>
    errores[k] && (
      <span role="alert" className="field-error">
        {erroresLegibles(errores[k])}
      </span>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRACIÓN</span>
          <h1>Administrar sedes</h1>
          <p>
            Carga la lista oficial de sedes. También puedes importarla con{" "}
            <code>python manage.py importar_sedes</code>
          </p>
        </div>
        <button className="primary" onClick={() => abrir(null)}>
          <Plus aria-hidden="true" />
          Crear sede
        </button>
      </div>
      {error && !modal && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {cargando ? (
        <SkeletonLista />
      ) : (
        <div className="table-wrap form-panel">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Ciudad</th>
                <th>Región</th>
                <th>Orden</th>
                <th>Activa</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((s) => (
                <tr key={s.id}>
                  <td data-label="Nombre">{s.nombre}</td>
                  <td data-label="Ciudad">{s.ciudad}</td>
                  <td data-label="Región">{s.region.nombre}</td>
                  <td data-label="Orden">{s.orden}</td>
                  <td data-label="Activa">
                    <button
                      role="switch"
                      aria-checked={s.activa}
                      aria-label={`Sede ${s.nombre} activa`}
                      disabled={actualizando === s.id}
                      onClick={() => alternar(s)}
                    >
                      {s.activa ? "Sí" : "No"}
                    </button>
                  </td>
                  <td data-label="Acciones">
                    <button
                      aria-label={`Editar sede ${s.nombre}`}
                      onClick={() => abrir(s)}
                    >
                      <Pencil aria-hidden="true" />
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!datos.length && <p>No hay sedes registradas.</p>}
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
      {modal && (
        <Modal
          titulo={modal.id ? "Editar sede" : "Crear sede"}
          onClose={() => !ocupado && setModal(null)}
        >
          <form className="stack" onSubmit={guardar}>
            {["nombre", "ciudad"].map((k) => (
              <label key={k}>
                {k === "nombre" ? "Nombre de sede" : "Ciudad"}
                <input
                  required
                  value={form[k]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [k]: e.target.value }))
                  }
                />
                {err(k)}
              </label>
            ))}
            <label>
              Región
              <select
                required
                value={form.region}
                onChange={(e) =>
                  setForm((f) => ({ ...f, region: e.target.value }))
                }
              >
                <option value="">Selecciona una región</option>
                {regiones.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
              {err("region")}
            </label>
            <label>
              Orden
              <input
                type="number"
                min="0"
                required
                value={form.orden}
                onChange={(e) =>
                  setForm((f) => ({ ...f, orden: e.target.value }))
                }
              />
              {err("orden")}
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={form.activa}
                onChange={(e) =>
                  setForm((f) => ({ ...f, activa: e.target.checked }))
                }
              />
              Sede activa
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="primary" disabled={ocupado}>
              Guardar sede
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
