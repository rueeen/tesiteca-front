import { useState } from "react";
import { Link } from "react-router-dom";
import api, { mensajeError } from "../api";
import { emailInstitucional } from "../utils/cuentas";
export default function RecuperarPage() {
  const [email, setEmail] = useState(""),
    [enviado, setEnviado] = useState(false),
    [error, setError] = useState(""),
    [ocupado, setOcupado] = useState(false);
  async function enviar(e) {
    e.preventDefault();
    setError("");
    if (!emailInstitucional(email)) {
      setError("Usa tu correo institucional.");
      return;
    }
    setOcupado(true);
    try {
      await api.post(
        "/auth/recuperar/",
        { email: email.trim().toLowerCase() },
        { sinSesion: true },
      );
      setEnviado(true);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  return (
    <section className="account-form form-panel">
      <h1>Recuperar contraseña</h1>
      {enviado ? (
        <p role="status" className="notice">
          Si existe una cuenta activa, te enviamos un correo. Revisa también
          spam.
        </p>
      ) : (
        <form className="stack" onSubmit={enviar}>
          <label>
            Correo institucional
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={ocupado}>
            Enviar enlace de recuperación
          </button>
        </form>
      )}
      <Link className="back" to="/login">
        Volver al login
      </Link>
    </section>
  );
}
