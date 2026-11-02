import axios from "axios";
export const baseURL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const api = axios.create({ baseURL });
let renovacion;
export function limpiarSesion() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  window.dispatchEvent(new Event("sesion-cerrada"));
}
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token && !config.headers.Authorization)
    config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const config = error.config;
    if (
      error.response?.status !== 401 ||
      !config ||
      config._reintento ||
      config.url.startsWith("/auth/solicitar") ||
      config.url.startsWith("/auth/verificar")
    )
      return Promise.reject(error);
    config._reintento = true;
    try {
      if (!renovacion)
        renovacion = (async () => {
          const refresh = localStorage.getItem("refresh");
          if (!refresh) throw new Error("Sesión expirada");
          const { data } = await axios.post(`${baseURL}/auth/refresh/`, {
            refresh,
          });
          localStorage.setItem("access", data.access);
          if (data.refresh) localStorage.setItem("refresh", data.refresh);
          return data.access;
        })().finally(() => {
          renovacion = null;
        });
      const token = await renovacion;
      config.headers.Authorization = `Bearer ${token}`;
      return api(config);
    } catch (e) {
      limpiarSesion();
      if (window.location.pathname !== "/login")
        window.location.assign("/login");
      return Promise.reject(e);
    }
  },
);
export const lista = (data) =>
  Array.isArray(data) ? data : data?.results || [];
export const mensajeError = (e) =>
  e.response?.status === 429
    ? "Demasiados intentos, espera unos minutos"
    : e.response?.data?.detail ||
      e.response?.data?.mensaje ||
      "No fue posible completar la solicitud. Intenta nuevamente.";
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
