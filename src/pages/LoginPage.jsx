import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api, { mensajeError } from "../api";
import LogoInacap from "../components/LogoInacap";
import { rutaInterna } from "../utils/rutas";
import { useAuth } from "../context/AuthContext";
export default function LoginPage() {
  const [email, setEmail] = useState(""),
    [paso, setPaso] = useState(1),
    [codigo, setCodigo] = useState(Array(6).fill("")),
    [espera, setEspera] = useState(0),
    [mensaje, setMensaje] = useState(""),
    [error, setError] = useState(""),
    [ocupado, setOcupado] = useState(false);
  const inputs = useRef([]);
  const { login, usuario } = useAuth();
  const navigate = useNavigate(),
    location = useLocation();
  const destino = rutaInterna(
    new URLSearchParams(location.search).get("next") || location.state?.from,
  );
  useEffect(() => {
    const parametros = new URLSearchParams(location.search);
    if (parametros.get("sesion") !== "expirada") return;
    toast.error("Tu sesión expiró", { id: "sesion-expirada" });
    parametros.delete("sesion");
    navigate(
      { pathname: "/login", search: parametros.toString() },
      { replace: true },
    );
  }, [location.search, navigate]);
  useEffect(() => {
    if (usuario) navigate(destino, { replace: true });
  }, [usuario, navigate, destino]);
  useEffect(() => {
    if (!espera) return;
    const t = setTimeout(() => setEspera(espera - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);
  async function solicitar(e) {
    e?.preventDefault();
    setError("");
    if (!/^[^\s@]+@(inacapmail\.cl|inacap\.cl)$/i.test(email.trim())) {
      setError("Usa tu correo @inacapmail.cl o @inacap.cl.");
      return;
    }
    setOcupado(true);
    try {
      const { data } = await api.post("/auth/solicitar-codigo/", {
        email: email.trim().toLowerCase(),
      });
      setMensaje(
        data.mensaje ||
          data.detail ||
          "Si tu correo está autorizado, recibirás un código de acceso.",
      );
      setPaso(2);
      setEspera(60);
      setTimeout(() => inputs.current[0]?.focus(), 0);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  async function verificar(e) {
    e.preventDefault();
    setOcupado(true);
    setError("");
    try {
      const { data } = await api.post("/auth/verificar-codigo/", {
        email: email.trim().toLowerCase(),
        codigo: codigo.join(""),
      });
      login(data);
      navigate(destino, { replace: true });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  return (
    <div className="login-layout">
      <section className="login-intro">
        <span className="eyebrow">INACAP · SEDE ARICA</span>
        <h1>
          Las ideas de hoy.
          <br />
          El conocimiento
          <br />
          del mañana.
        </h1>
        <p>
          Un espacio para descubrir, compartir y conectar con el trabajo de
          nuestra comunidad.
        </p>
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
        <h2>
          {paso === 1
            ? "Ingresa con tu correo institucional"
            : "Revisa tu correo"}
        </h2>
        <p>
          {paso === 1
            ? "Te enviaremos un código para acceder de forma segura."
            : `Ingresa el código de 6 dígitos enviado a ${email}.`}
        </p>
        {mensaje && (
          <p role="status" className="notice">
            {mensaje}
          </p>
        )}
        <form onSubmit={paso === 1 ? solicitar : verificar}>
          {paso === 1 ? (
            <label>
              Correo institucional
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.nombre@inacapmail.cl"
                required
              />
            </label>
          ) : (
            <div
              className="otp"
              onPaste={(e) => {
                const value = e.clipboardData
                  .getData("text")
                  .replace(/\D/g, "")
                  .slice(0, 6);
                if (value) {
                  e.preventDefault();
                  setCodigo(
                    Array.from({ length: 6 }, (_, i) => value[i] || ""),
                  );
                  inputs.current[Math.min(value.length, 5)]?.focus();
                }
              }}
            >
              {codigo.map((n, i) => (
                <input
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  aria-label={`Dígito ${i + 1}`}
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={n}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(-1);
                    setCodigo(codigo.map((x, j) => (j === i ? v : x)));
                    if (v) inputs.current[i + 1]?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !n)
                      inputs.current[i - 1]?.focus();
                  }}
                />
              ))}
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary wide"
            disabled={ocupado || (paso === 2 && codigo.join("").length !== 6)}
          >
            {ocupado && <span className="spinner" aria-hidden="true" />}
            {ocupado
              ? "Espera un momento…"
              : paso === 1
                ? "Recibir código de acceso "
                : "Ingresar a la biblioteca "}
          </button>
        </form>
        {paso === 2 && (
          <div className="stack">
            <button disabled={espera > 0 || ocupado} onClick={solicitar}>
              Reenviar código {espera > 0 && `(${espera}s)`}
            </button>
            <button
              className="quiet"
              onClick={() => {
                setPaso(1);
                setError("");
                setMensaje("");
                setCodigo(Array(6).fill(""));
              }}
            >
              Cambiar correo
            </button>
          </div>
        )}
        <small className="muted">
          Acceso exclusivo para la comunidad INACAP.
          <br />
          Tu correo debe estar autorizado por tu coordinación.
        </small>
      </section>
    </div>
  );
}
