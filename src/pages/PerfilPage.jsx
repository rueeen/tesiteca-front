import { useState } from "react";
import { toast } from "sonner";
import api, { mensajeError } from "../api";
import { useAuth } from "../context/AuthContext";
import { nombreRol } from "../roles";
import CampoPassword from "../components/CampoPassword";
import FortalezaPassword from "../components/FortalezaPassword";
import { erroresLegibles, reglasPassword } from "../utils/cuentas";
export default function PerfilPage() {
  const { usuario, actualizarAccess } = useAuth();
  const [form, setForm] = useState({ actual: "", nueva: "", nueva2: "" }),
    [errores, setErrores] = useState({}),
    [error, setError] = useState(""),
    [ocupado, setOcupado] = useState(false);
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
    </>
  );
}
