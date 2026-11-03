import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { mensajeError } from "../api";
import { useAuth } from "../context/AuthContext";
import LogoInacap from "../components/LogoInacap";
import CampoPassword from "../components/CampoPassword";
import ReenviarVerificacion from "../components/ReenviarVerificacion";
import { emailInstitucional } from "../utils/cuentas";
import { rutaInterna } from "../utils/rutas";
export default function LoginPage() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [respuesta, setRespuesta] = useState(null),
    [ocupado, setOcupado] = useState(false);
  const { login, usuario } = useAuth();
  const location = useLocation(),
    navigate = useNavigate();
  const destino = rutaInterna(
    new URLSearchParams(location.search).get("next") || location.state?.from,
  );
  useEffect(() => {
    if (usuario) navigate(destino, { replace: true });
  }, [usuario, destino, navigate]);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("sesion") === "expirada") {
      toast.error("Tu sesión expiró", { id: "sesion-expirada" });
      p.delete("sesion");
      navigate({ pathname: "/login", search: p.toString() }, { replace: true });
    }
  }, [location.search, navigate]);
  async function ingresar(e) {
    e.preventDefault();
    setError("");
    setRespuesta(null);
    if (!emailInstitucional(email)) {
      setError("Usa tu correo @inacapmail.cl o @inacap.cl.");
      return;
    }
    setOcupado(true);
    try {
      const { data } = await api.post(
        "/auth/login/",
        { email: email.trim().toLowerCase(), password },
        { sinSesion: true },
      );
      login(data);
      setPassword("");
      navigate(destino, { replace: true });
    } catch (e) {
      if (e.response?.status === 403 && e.response.data.codigo)
        setRespuesta(e.response.data);
      else
        setError(
          e.response?.status === 401
            ? "Correo o contraseña incorrectos."
            : mensajeError(e),
        );
    } finally {
      setOcupado(false);
    }
  }
  return (
    <div className="login-layout">
      <section className="login-intro">
        <span className="eyebrow">INACAP · COMUNIDAD INACAP</span>
        <h1>
          Las ideas de hoy.
          <br />
          El conocimiento
          <br />
          del mañana.
        </h1>
        <p>Descubre y comparte el trabajo de nuestra comunidad.</p>
        <div className="book-art" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <small>BIBLIOTECA DIGITAL DE TESIS</small>
      </section>
      <section className="login-form">
        <LogoInacap />
        <span className="eyebrow">BIENVENIDO A TU BIBLIOTECA</span>
        <h2>Ingresa a tu biblioteca</h2>
        <p>Usa tu correo institucional y tu contraseña.</p>
        <form onSubmit={ingresar}>
          <label>
            Correo institucional
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.nombre@inacapmail.cl"
            />
          </label>
          <CampoPassword
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary wide" disabled={ocupado}>
            {ocupado && <span className="spinner" aria-hidden="true" />}Ingresar
          </button>
        </form>
        {respuesta && (
          <section className="account-status" aria-live="polite">
            {respuesta.codigo === "correo_no_verificado" ? (
              <>
                <h3>Valida tu correo</h3>
                <ReenviarVerificacion key={email} emailInicial={email} />
              </>
            ) : respuesta.codigo === "pendiente_aprobacion" ? (
              <p>
                Tu solicitud está en revisión por la coordinación de tu carrera.
              </p>
            ) : respuesta.codigo === "rechazada" ? (
              <>
                <h3>Solicitud rechazada</h3>
                <p>
                  {respuesta.motivo ||
                    "Contacta a tu coordinación para conocer el motivo."}
                </p>
                <Link
                  className="button"
                  to={`/solicitar-acceso?email=${encodeURIComponent(email)}`}
                >
                  Enviar nueva solicitud
                </Link>
              </>
            ) : respuesta.codigo === "desactivada" ? (
              <p>Tu acceso fue desactivado. Contacta a tu coordinación.</p>
            ) : (
              <p>No fue posible ingresar. Contacta a tu coordinación.</p>
            )}
          </section>
        )}
        <div className="account-links">
          <Link to="/solicitar-acceso">Solicitar acceso</Link>
          <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
        </div>
        <small className="muted">
          Acceso exclusivo para la comunidad INACAP.
        </small>
      </section>
    </div>
  );
}
