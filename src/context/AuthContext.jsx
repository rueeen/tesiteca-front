import { createContext, useContext, useEffect, useState } from "react";
import api, { limpiarSesion } from "../api";
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    let activo = true;
    const controller = new AbortController();
    async function cargar() {
      try {
        if (localStorage.getItem("access")) {
          const { data } = await api.get("/auth/me/", {
            signal: controller.signal,
          });
          if (activo) setUsuario(data);
        }
      } catch (e) {
        if (e.code !== "ERR_CANCELED") limpiarSesion();
      } finally {
        if (activo) setCargando(false);
      }
    }
    const cerrar = () => setUsuario(null);
    window.addEventListener("sesion-cerrada", cerrar);
    cargar();
    return () => {
      activo = false;
      controller.abort();
      window.removeEventListener("sesion-cerrada", cerrar);
    };
  }, []);
  function login(tokens, usuario) {
    localStorage.setItem("access", tokens.access);
    if (tokens.refresh) localStorage.setItem("refresh", tokens.refresh);
    setUsuario(usuario);
  }
  const logout = () => {
    limpiarSesion();
    setUsuario(null);
  };
  const tieneRol = (...roles) => roles.includes(usuario?.rol);
  return (
    <AuthContext.Provider
      value={{ usuario, cargando, login, logout, tieneRol }}
    >
      {children}
    </AuthContext.Provider>
  );
}
