import axios from "axios";
import { toast } from "sonner";
import { rutaInterna } from "./utils/rutas";
export { mensajeError } from "./utils/errores";
export const baseURL = import.meta.env.VITE_API_URL || "/api";
const opciones = {
  baseURL,
  withCredentials: true,
  headers: { "X-Requested-With": "XMLHttpRequest" },
};
const api = axios.create(opciones);
// Este cliente no tiene interceptores: refresh nunca puede reintentarse a sí mismo.
const autenticacion = axios.create(opciones);
let accessToken = null,
  renovacion = null,
  generacion = 0;
export const getAccess = () => accessToken;
export function setAccess(token) {
  accessToken = token;
  window.dispatchEvent(new Event("access-actualizado"));
}
localStorage.removeItem("access");
localStorage.removeItem("refresh");
export function limpiarSesion() {
  generacion++;
  setAccess(null);
  window.dispatchEvent(new Event("sesion-cerrada"));
}
export function renovarSesion() {
  if (!renovacion) {
    const actual = generacion;
    const pendiente = autenticacion
      .post("/auth/refresh/", {})
      .then(({ data }) => {
        // Un refresh en vuelo no debe volver a iniciar sesión tras un logout.
        if (actual !== generacion)
          throw new axios.CanceledError("Sesión cerrada");
        setAccess(data.access);
        return data;
      });
    renovacion = pendiente;
    pendiente
      .finally(() => {
        if (renovacion === pendiente) renovacion = null;
      })
      .catch(() => {});
  }
  return renovacion;
}
export async function cerrarSesionRemota() {
  try {
    await autenticacion.post("/auth/logout/", {});
  } finally {
    limpiarSesion();
  }
}
let expiracionAvisada = false;
export function expirarSesion() {
  limpiarSesion();
  if (!expiracionAvisada) {
    toast.error("Tu sesión expiró", { id: "sesion-expirada" });
    expiracionAvisada = true;
  }
  if (window.location.pathname !== "/login") {
    const next = rutaInterna(
      window.location.pathname + window.location.search + window.location.hash,
    );
    window.location.assign(
      "/login?next=" + encodeURIComponent(next) + "&sesion=expirada",
    );
  }
}
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
    expiracionAvisada = false;
  } else delete config.headers.Authorization;
  config._accessUsado = accessToken;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const config = error.config;
    if (error.code === "ERR_CANCELED") return Promise.reject(error);
    if (!error.response && !config?.silenciarRed)
      toast.error("No pudimos conectarnos. Revisa tu conexión.", {
        id: "error-red",
      });
    if (
      error.response?.status !== 401 ||
      !config ||
      config.url.startsWith("/auth/")
    )
      return Promise.reject(error);
    if (config._reintento) {
      expirarSesion();
      return Promise.reject(error);
    }
    config._reintento = true;
    try {
      // Si otra petición ya renovó el token, basta con reintentar con ese access.
      if (!accessToken || config._accessUsado === accessToken)
        await renovarSesion();
      return await api(config);
    } catch (e) {
      if (e.code !== "ERR_CANCELED") expirarSesion();
      return Promise.reject(e);
    }
  },
);
export const lista = (data) =>
  Array.isArray(data) ? data : data?.results || [];
export function urlSegura(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export async function descargar(ruta, nombre) {
  const { data } = await api.get(ruta, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default api;
