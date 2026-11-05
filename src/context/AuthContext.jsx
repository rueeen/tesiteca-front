import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, {
  setAccess,
  getAccess,
  renovarSesion,
  limpiarSesion,
  cerrarSesionRemota,
  expirarSesion,
  esSalidaVoluntaria,
} from "../api";
import LogoInacap from "../components/LogoInacap";
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
function vencimiento(token) {
  try {
    const parte = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(parte)).exp * 1000;
  } catch {
    return null;
  }
}
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null),
    [cargando, setCargando] = useState(true),
    [fallo, setFallo] = useState(false);
  const canal = useRef(null),
    usuarioRef = useRef(null),
    actividad = useRef(Date.now()),
    versionSesion = useRef(0);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  usuarioRef.current = usuario;
  useEffect(() => {
    let activo = true,
      temporizador;
    async function restaurar(inicial = false) {
      const version = versionSesion.current;
      try {
        const data = await renovarSesion();
        if (activo) {
          if (!data) {
            if (inicial) limpiarSesion();
            else expirarSesion();
            setFallo(false);
            return;
          }
          const { data: perfil } = await api.get("/auth/me/");
          if (!activo || version !== versionSesion.current || !getAccess())
            return;
          setUsuario({ ...data.usuario, ...perfil });
          setFallo(false);
        }
      } catch (e) {
        if (e.code === "ERR_CANCELED") return;
        if (activo && version === versionSesion.current) {
          if (e.response?.status === 401) {
            if (!inicial) expirarSesion();
            else limpiarSesion();
          } else setFallo(true);
        }
      } finally {
        if (activo) setCargando(false);
      }
    }
    function programar() {
      clearTimeout(temporizador);
      const exp = vencimiento(getAccess());
      if (!exp) return;
      temporizador = setTimeout(
        () => {
          if (
            document.visibilityState === "visible" &&
            Date.now() - actividad.current < 5 * 60 * 1000
          )
            restaurar();
        },
        Math.max(1000, exp - Date.now() - 60000),
      );
    }
    function registrarActividad() {
      actividad.current = Date.now();
      const exp = vencimiento(getAccess());
      if (
        usuarioRef.current &&
        exp &&
        exp - Date.now() <= 60000 &&
        document.visibilityState === "visible"
      )
        restaurar();
    }
    const cerrar = () => {
      versionSesion.current++;
      if (activo) setUsuario(null);
      clearTimeout(temporizador);
    };
    window.addEventListener("sesion-cerrada", cerrar);
    window.addEventListener("access-actualizado", programar);
    ["pointerdown", "keydown", "focus"].forEach((e) =>
      window.addEventListener(e, registrarActividad),
    );
    document.addEventListener("visibilitychange", registrarActividad);
    if ("BroadcastChannel" in window) {
      const c = new BroadcastChannel("tesiteca-auth");
      canal.current = c;
      c.onmessage = ({ data }) => {
        if (data?.tipo === "logout") {
          limpiarSesion({ voluntaria: true });
          navigateRef.current("/login", { replace: true });
        }
        if (data?.tipo === "login") restaurar();
      };
    }
    restaurar(true);
    return () => {
      activo = false;
      clearTimeout(temporizador);
      canal.current?.close();
      canal.current = null;
      window.removeEventListener("sesion-cerrada", cerrar);
      window.removeEventListener("access-actualizado", programar);
      ["pointerdown", "keydown", "focus"].forEach((e) =>
        window.removeEventListener(e, registrarActividad),
      );
      document.removeEventListener("visibilitychange", registrarActividad);
    };
  }, []);
  async function login(data) {
    const version = versionSesion.current;
    setAccess(data.access);
    let perfil;
    try {
      ({ data: perfil } = await api.get("/auth/me/"));
    } catch (e) {
      if (version === versionSesion.current) limpiarSesion();
      throw e;
    }
    if (version !== versionSesion.current || !getAccess()) return false;
    setUsuario({ ...data.usuario, ...perfil });
    canal.current?.postMessage({ tipo: "login" });
    return true;
  }
  function actualizarUsuario(cambios) {
    setUsuario((u) => (u ? { ...u, ...cambios } : u));
    canal.current?.postMessage({ tipo: "login" });
  }
  function cerrarSesionLocal() {
    canal.current?.postMessage({ tipo: "logout" });
    limpiarSesion({ voluntaria: true });
    navigate("/login", { replace: true });
  }
  function actualizarAccess(access) {
    setAccess(access);
    canal.current?.postMessage({ tipo: "login" });
  }
  async function logout() {
    // Avisar de inmediato evita que otras pestañas sigan usando una sesión cerrada.
    cerrarSesionLocal();
    try {
      await cerrarSesionRemota();
      toast.success("Sesión cerrada");
    } catch {
      toast.error(
        "Sesión cerrada en este dispositivo. No pudimos confirmar el cierre en el servidor.",
      );
    }
  }
  const tieneRol = (...roles) => roles.includes(usuario?.rol);
  if (cargando)
    return (
      <div className="session-loading" role="status">
        <LogoInacap />
        <span className="spinner" />
        Restaurando tu sesión…
      </div>
    );
  if (fallo && !usuario)
    return (
      <section className="empty" role="alert">
        <LogoInacap />
        <h1>No pudimos restaurar tu sesión</h1>
        <p>Comprueba tu conexión e intenta nuevamente.</p>
        <button onClick={() => window.location.reload()}>Reintentar</button>
      </section>
    );
  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        login,
        actualizarAccess,
        actualizarUsuario,
        cerrarSesionLocal,
        logout,
        tieneRol,
        salidaVoluntaria: esSalidaVoluntaria(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
