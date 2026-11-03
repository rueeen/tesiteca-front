import { useState } from "react";
import { Link } from "react-router-dom";
import api, { mensajeError } from "../api";
import CampoPassword from "../components/CampoPassword";
import FortalezaPassword from "../components/FortalezaPassword";
import { reglasPassword, erroresLegibles } from "../utils/cuentas";
import { leerEnlaceCuenta, borrarEnlaceCuenta } from "../utils/enlacesCuenta";
export default function RestablecerPage() {
  const [enlace] = useState(() => leerEnlaceCuenta("/restablecer"));
  const [password, setPassword] = useState(""),
    [password2, setPassword2] = useState(""),
    [errores, setErrores] = useState({}),
    [error, setError] = useState(""),
    [exito, setExito] = useState(false),
    [ocupado, setOcupado] = useState(false);
  async function enviar(e) {
    e.preventDefault();
    setError("");
    setErrores({});
    if (!reglasPassword(password).every((r) => r.cumple)) {
      setErrores({ password: "La contraseña no cumple todas las reglas." });
      return;
    }
    if (password !== password2) {
      setErrores({ password2: "Las contraseñas no coinciden." });
      return;
    }
    setOcupado(true);
    try {
      await api.post(
        "/auth/restablecer/",
        { ...enlace, password, password2 },
        { sinSesion: true },
      );
      borrarEnlaceCuenta("/restablecer");
      setPassword("");
      setPassword2("");
      setExito(true);
    } catch (e) {
      setErrores(e.response?.data || {});
      setError(
        "No fue posible restablecer la contraseña. Revisa el enlace y los datos.",
      );
    } finally {
      setOcupado(false);
    }
  }
  return (
    <section className="account-form form-panel">
      <h1>Restablecer contraseña</h1>
      {exito ? (
        <>
          <h2>Tu contraseña fue actualizada</h2>
          <Link className="button primary" to="/login">
            Ingresar
          </Link>
        </>
      ) : !enlace.uid || !enlace.token ? (
        <>
          <p role="alert" className="error">
            El enlace de recuperación está incompleto.
          </p>
          <Link to="/recuperar">Solicitar un enlace nuevo</Link>
        </>
      ) : (
        <form className="stack" onSubmit={enviar}>
          <CampoPassword
            label="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={erroresLegibles(errores.password)}
          />
          <CampoPassword
            label="Confirmar contraseña"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            error={erroresLegibles(errores.password2)}
          />
          <FortalezaPassword password={password} />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={ocupado}>
            Guardar nueva contraseña
          </button>
          <Link to="/recuperar">Solicitar un enlace nuevo</Link>
        </form>
      )}
    </section>
  );
}
