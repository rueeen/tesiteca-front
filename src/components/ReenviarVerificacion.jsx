import { useEffect, useState } from "react";
import api, { mensajeError } from "../api";
import { emailInstitucional } from "../utils/cuentas";
export default function ReenviarVerificacion({ emailInicial = "" }) {
  const [email, setEmail] = useState(emailInicial),
    [espera, setEspera] = useState(0),
    [ocupado, setOcupado] = useState(false),
    [error, setError] = useState(""),
    [mensaje, setMensaje] = useState("");
  useEffect(() => {
    if (!espera) return;
    const t = setTimeout(() => setEspera((e) => e - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);
  async function reenviar(e) {
    e.preventDefault();
    setError("");
    if (!emailInstitucional(email)) {
      setError("Usa tu correo institucional.");
      return;
    }
    setOcupado(true);
    try {
      await api.post(
        "/auth/reenviar-verificacion/",
        { email: email.trim().toLowerCase() },
        { sinSesion: true },
      );
      setMensaje(
        "Si corresponde, recibirás un correo de validación. Revisa también spam.",
      );
      setEspera(60);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  return (
    <form className="stack" onSubmit={reenviar}>
      <label>
        Correo institucional
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <button disabled={ocupado || espera > 0}>
        {espera > 0
          ? `Reenviar correo de validación (${espera}s)`
          : "Reenviar correo de validación"}
      </button>
      {mensaje && (
        <p role="status" className="notice">
          {mensaje}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}
