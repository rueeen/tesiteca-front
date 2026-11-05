import { useState } from "react";
import { toast } from "sonner";
import api, { mensajeError, descargar } from "../api";
import { useAuth } from "../context/AuthContext";
import { nombreRol } from "../roles";
import Modal from "../components/Modal";
import { TEXTO_ELIMINACION } from "../utils/privacidad";
import CampoPassword from "../components/CampoPassword";
import FortalezaPassword from "../components/FortalezaPassword";
import { erroresLegibles, reglasPassword } from "../utils/cuentas";
export default function PerfilPage() {
  const { usuario, actualizarAccess, actualizarUsuario, cerrarSesionLocal } =
    useAuth();
  const [form, setForm] = useState({ actual: "", nueva: "", nueva2: "" }),
    [errores, setErrores] = useState({}),
    [error, setError] = useState(""),
    [ocupado, setOcupado] = useState(false);
  const [nombre, setNombre] = useState(usuario.nombre_completo),
    [privacidadError, setPrivacidadError] = useState(""),
    [privacidadOcupada, setPrivacidadOcupada] = useState(false);
  const [eliminar, setEliminar] = useState(false),
    [passwordEliminar, setPasswordEliminar] = useState(""),
    [confirmacion, setConfirmacion] = useState(""),
    [eliminarError, setEliminarError] = useState("");
  async function guardarNombre(e) {
    e.preventDefault();
    setPrivacidadError("");
    setPrivacidadOcupada(true);
    try {
      const { data } = await api.patch("/cuenta/perfil/", {
        nombre_completo: nombre.trim(),
      });
      actualizarUsuario({
        nombre_completo: data?.nombre_completo || nombre.trim(),
      });
      toast.success("Nombre actualizado");
    } catch (e) {
      setPrivacidadError(
        e.response?.data?.nombre_completo
          ? erroresLegibles(e.response.data.nombre_completo)
          : mensajeError(e),
      );
    } finally {
      setPrivacidadOcupada(false);
    }
  }
  async function misDatos() {
    setPrivacidadError("");
    setPrivacidadOcupada(true);
    try {
      await descargar("/cuenta/mis-datos/", "mis-datos-tesiteca.json");
    } catch (e) {
      setPrivacidadError(mensajeError(e));
    } finally {
      setPrivacidadOcupada(false);
    }
  }
  async function eliminarCuenta(e) {
    e.preventDefault();
    if (confirmacion !== "ELIMINAR" || !passwordEliminar) return;
    setPrivacidadOcupada(true);
    setEliminarError("");
    try {
      await api.post("/cuenta/eliminar/", {
        password: passwordEliminar,
        confirmacion,
      });
      cerrarSesionLocal();
      toast.success("Tu cuenta fue eliminada");
    } catch (e) {
      setEliminarError(
        e.response?.status === 409
          ? "No puedes eliminar tu cuenta porque eres el último administrador. Designa otro administrador antes de continuar."
          : mensajeError(e),
      );
    } finally {
      setPrivacidadOcupada(false);
    }
  }
  function cambiar(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  async function enviar(e) {
    e.preventDefault();
    setErrores({});
    setError("");
    if (
      !reglasPassword(form.nueva, {
        nombre: usuario.nombre_completo,
        email: usuario.email,
      }).every((r) => r.cumple)
    ) {
      setErrores({ nueva: "La contraseña no cumple todas las reglas." });
      return;
    }
    if (form.nueva !== form.nueva2) {
      setErrores({ nueva2: "Las contraseñas no coinciden." });
      return;
    }
    setOcupado(true);
    try {
      const { data } = await api.post("/auth/cambiar-password/", form);
      actualizarAccess(data.access);
      setForm({ actual: "", nueva: "", nueva2: "" });
      toast.success("Contraseña actualizada");
    } catch (e) {
      setErrores(e.response?.data || {});
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MI CUENTA</span>
          <h1>Mi perfil</h1>
        </div>
      </div>
      <section className="form-panel">
        <dl className="metadata">
          {[
            ["Nombre", usuario.nombre_completo],
            ["Correo", usuario.email],
            ["RUT", usuario.rut],
            ["Rol", nombreRol(usuario.rol)],
            ["Carrera", usuario.carrera?.nombre || "—"],
            ["Nivel", usuario.carrera?.nivel_formacion?.nombre || "—"],
            ["Sede", usuario.sede?.nombre || "—"],
            ["Región", usuario.sede?.region?.nombre || "—"],
            ["Estado", usuario.estado_cuenta],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p>Correo validado ✓</p>
        <h2>Cambiar contraseña</h2>
        <form className="stack password-change" onSubmit={enviar}>
          <CampoPassword
            label="Contraseña actual"
            autoComplete="current-password"
            value={form.actual}
            onChange={(e) => cambiar("actual", e.target.value)}
            error={erroresLegibles(errores.actual)}
          />
          <CampoPassword
            label="Nueva contraseña"
            value={form.nueva}
            onChange={(e) => cambiar("nueva", e.target.value)}
            error={erroresLegibles(errores.nueva)}
          />
          <CampoPassword
            label="Confirmar nueva contraseña"
            value={form.nueva2}
            onChange={(e) => cambiar("nueva2", e.target.value)}
            error={erroresLegibles(errores.nueva2)}
          />
          <FortalezaPassword
            password={form.nueva}
            nombre={usuario.nombre_completo}
            email={usuario.email}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={ocupado}>
            Cambiar contraseña
          </button>
        </form>
      </section>
      <section className="form-panel">
        <h2>Privacidad y datos</h2>
        <form className="stack password-change" onSubmit={guardarNombre}>
          <label>
            Nombre completo
            <input
              required
              maxLength={200}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
          <p>
            Para corregir el RUT, la carrera o la sede, contacta a tu
            coordinación
          </p>
          <button
            className="primary"
            disabled={privacidadOcupada || !nombre.trim()}
          >
            Guardar nombre
          </button>
        </form>
        <button onClick={misDatos} disabled={privacidadOcupada}>
          Descargar mis datos
        </button>
        {privacidadError && (
          <p className="error" role="alert">
            {privacidadError}
          </p>
        )}
        <div className="danger-zone">
          <h3>Eliminar mi cuenta</h3>
          <p>{TEXTO_ELIMINACION}</p>
          <button
            className="danger"
            onClick={() => {
              setEliminar(true);
              setPasswordEliminar("");
              setConfirmacion("");
              setEliminarError("");
            }}
          >
            Eliminar mi cuenta
          </button>
        </div>
      </section>
      {eliminar && (
        <Modal
          titulo="Eliminar mi cuenta"
          onClose={() => !privacidadOcupada && setEliminar(false)}
        >
          <p>{TEXTO_ELIMINACION}</p>
          <form className="stack" onSubmit={eliminarCuenta}>
            <CampoPassword
              label="Contraseña para eliminar cuenta"
              autoComplete="current-password"
              value={passwordEliminar}
              onChange={(e) => setPasswordEliminar(e.target.value)}
            />
            <label>
              Escribe ELIMINAR para confirmar
              <input
                required
                autoComplete="off"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
              />
            </label>
            {eliminarError && (
              <p className="error" role="alert">
                {eliminarError}
              </p>
            )}
            <button
              className="danger"
              disabled={
                privacidadOcupada ||
                confirmacion !== "ELIMINAR" ||
                !passwordEliminar
              }
            >
              Confirmar eliminación
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
