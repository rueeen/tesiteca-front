import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api, { mensajeError } from "../api";
import CampoPassword from "../components/CampoPassword";
import FortalezaPassword from "../components/FortalezaPassword";
import SelectSede from "../components/SelectSede";
import {
  emailInstitucional,
  emailFuncionario,
  formatearRut,
  limpiarRut,
  rutValido,
  reglasPassword,
  erroresLegibles,
} from "../utils/cuentas";
export default function SolicitarAccesoPage() {
  const location = useLocation();
  const [form, setForm] = useState({
      email: new URLSearchParams(location.search).get("email") || "",
      nombre_completo: "",
      rut: "",
      sede: "",
      carrera: "",
      password: "",
      password2: "",
      rol_solicitado: "COORDINADOR",
      mensaje: "",
      acepta: false,
    }),
    [catalogos, setCatalogos] = useState({ sedes: [], carreras: [] }),
    [errores, setErrores] = useState({}),
    [error, setError] = useState(""),
    [catalogoError, setCatalogoError] = useState(""),
    [ocupado, setOcupado] = useState(false),
    [exito, setExito] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      try {
        const r = await Promise.all(
          ["/catalogos/sedes/", "/catalogos/carreras/"].map((url) =>
            api.get(url, { signal: c.signal, sinSesion: true }),
          ),
        );
        setCatalogos({ sedes: r[0].data, carreras: r[1].data });
      } catch (e) {
        if (e.code !== "ERR_CANCELED") setCatalogoError(mensajeError(e));
      }
    }
    cargar();
    return () => c.abort();
  }, []);
  const funcionario = emailFuncionario(form.email);
  function cambiar(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((e) => ({ ...e, [k]: null }));
  }
  const err = (k) =>
    errores[k] && (
      <span className="field-error" role="alert">
        {erroresLegibles(errores[k])}
      </span>
    );
  async function enviar(e) {
    e.preventDefault();
    const validacion = {};
    if (!emailInstitucional(form.email))
      validacion.email = "Usa tu correo institucional.";
    if (!rutValido(form.rut))
      validacion.rut = "El RUT no es válido. Revisa el dígito verificador.";
    if (
      !reglasPassword(form.password, {
        nombre: form.nombre_completo,
        email: form.email,
      }).every((r) => r.cumple)
    )
      validacion.password = "La contraseña no cumple todas las reglas.";
    if (form.password !== form.password2)
      validacion.password2 = "Las contraseñas no coinciden.";
    if (!form.acepta) validacion.acepta = "Debes aceptar el uso académico.";
    setErrores(validacion);
    setError("");
    if (Object.keys(validacion).length) return;
    setOcupado(true);
    try {
      const rut = limpiarRut(form.rut);
      const body = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        password2: form.password2,
        nombre_completo: form.nombre_completo.trim(),
        rut: `${rut.slice(0, -1)}-${rut.at(-1)}`,
        carrera: Number(form.carrera),
        sede: Number(form.sede),
        ...(funcionario
          ? { rol_solicitado: form.rol_solicitado, mensaje: form.mensaje }
          : {}),
      };
      await api.post("/auth/registro/", body, { sinSesion: true });
      setForm((f) => ({ ...f, password: "", password2: "" }));
      setExito(true);
    } catch (e) {
      setErrores(e.response?.status === 400 ? e.response.data : {});
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  if (exito)
    return (
      <section className="empty">
        <h1>Revisa tu correo (también spam) para validar tu cuenta</h1>
        <p>Tras validarlo, tu solicitud será revisada por la coordinación.</p>
        <Link className="button primary" to="/login">
          Volver al login
        </Link>
      </section>
    );
  return (
    <section className="account-form form-panel">
      <span className="eyebrow">COMUNIDAD INACAP</span>
      <h1>Solicitar acceso</h1>
      <p>Completa tus datos para solicitar una cuenta.</p>
      {catalogoError && (
        <p role="alert" className="error">
          {catalogoError}
        </p>
      )}
      <form onSubmit={enviar}>
        <div className="form-grid">
          <label>
            Correo institucional
            <input
              type="email"
              autoComplete="email"
              required
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
            RUT
            <input
              required
              value={form.rut}
              placeholder="12.345.678-5"
              maxLength={12}
              onChange={(e) => cambiar("rut", formatearRut(e.target.value))}
            />
            {err("rut")}
          </label>
          <SelectSede
            sedes={catalogos.sedes}
            value={form.sede}
            onChange={(e) => cambiar("sede", e.target.value)}
            required
            error={errores.sede && erroresLegibles(errores.sede)}
          />
          <label>
            Carrera
            <select
              required
              value={form.carrera}
              onChange={(e) => cambiar("carrera", e.target.value)}
            >
              <option value="">Selecciona una carrera</option>
              {catalogos.carreras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {err("carrera")}
          </label>
          {funcionario && (
            <>
              <label>
                Rol solicitado
                <select
                  value={form.rol_solicitado}
                  onChange={(e) => cambiar("rol_solicitado", e.target.value)}
                >
                  <option value="COORDINADOR">Coordinador/a</option>
                  <option value="DIRECTOR">Director/a</option>
                </select>
                <small>
                  Si la dirección ya te registró, tu rol se asignará
                  automáticamente
                </small>
                {err("rol_solicitado")}
              </label>
              <label className="full">
                Mensaje para el administrador (opcional)
                <textarea
                  maxLength={500}
                  value={form.mensaje}
                  onChange={(e) => cambiar("mensaje", e.target.value)}
                />
                <small>{form.mensaje.length}/500</small>
                {err("mensaje")}
              </label>
            </>
          )}
          <CampoPassword
            value={form.password}
            onChange={(e) => cambiar("password", e.target.value)}
            error={errores.password && erroresLegibles(errores.password)}
          />
          <CampoPassword
            label="Confirmar contraseña"
            value={form.password2}
            onChange={(e) => cambiar("password2", e.target.value)}
            error={errores.password2 && erroresLegibles(errores.password2)}
          />
          <div className="full">
            <FortalezaPassword
              password={form.password}
              nombre={form.nombre_completo}
              email={form.email}
            />
          </div>
          <label className="check full">
            <input
              type="checkbox"
              required
              checked={form.acepta}
              onChange={(e) => cambiar("acepta", e.target.checked)}
            />
            Entiendo que las tesis son de uso académico exclusivo y que cada
            lectura queda registrada con mi correo
          </label>
          {err("acepta")}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Link to="/login">Ya tengo una cuenta</Link>
          <button
            className="primary"
            disabled={ocupado || Boolean(catalogoError)}
          >
            {ocupado ? "Enviando…" : "Enviar solicitud"}
          </button>
        </div>
      </form>
    </section>
  );
}
