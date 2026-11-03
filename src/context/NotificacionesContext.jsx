import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../api";
import { useAuth } from "./AuthContext";
import { rutaInterna } from "../utils/rutas";
const Contexto = createContext(null);
export const useNotificaciones = () => useContext(Contexto);
export function NotificacionesProvider({ children }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [noLeidas, setNoLeidas] = useState(0),
    [recientes, setRecientes] = useState([]),
    [conectado, setConectado] = useState(false),
    [error, setError] = useState("");
  const ultima = useRef(null),
    conocidos = useRef(new Set()),
    recarga = useRef(null),
    signal = useRef(null),
    sesion = useRef(0),
    esperaPolling = useRef(30000);
  const anunciar = useCallback(
    (n) =>
      toast(n.titulo, {
        description: n.mensaje,
        action: {
          label: "Ver",
          onClick: () => navigateRef.current(rutaInterna(n.enlace)),
        },
      }),
    [],
  );
  const incorporar = useCallback(
    (items, avisar = true) => {
      const nuevos = items.filter((n) => !conocidos.current.has(n.id));
      nuevos.forEach((n) => {
        conocidos.current.add(n.id);
        if (avisar) anunciar(n);
      });
      setRecientes((actual) =>
        [...new Map([...items, ...actual].map((n) => [n.id, n])).values()]
          .sort((a, b) => b.id - a.id)
          .slice(0, 10),
      );
      return nuevos;
    },
    [anunciar],
  );
  const recargar = useCallback(async () => {
    if (!usuario) return;
    if (recarga.current) return recarga.current;
    const version = sesion.current;
    const tarea = (async () => {
      try {
        const opciones = { signal: signal.current, silenciarRed: true };
        const { data: resumen } = await api.get(
          "/notificaciones/resumen/",
          opciones,
        );
        if (version !== sesion.current) return;
        if (ultima.current === null || resumen.ultima_id !== ultima.current) {
          const inicial = ultima.current === null;
          const { data } = await api.get("/notificaciones/", {
            ...opciones,
            params: inicial
              ? { page_size: 10 }
              : { desde_id: ultima.current, page_size: 10 },
          });
          if (version !== sesion.current) return;
          incorporar(data.results, !inicial);
        }
        ultima.current = resumen.ultima_id;
        setNoLeidas(resumen.no_leidas);
        esperaPolling.current = 30000;
        setError("");
      } catch (e) {
        if (e.code !== "ERR_CANCELED" && version === sesion.current) {
          esperaPolling.current = [502, 503, 504].includes(e.response?.status)
            ? Math.min(120000, esperaPolling.current * 2)
            : 30000;
          setError(
            "No pudimos actualizar las notificaciones. Reintentaremos automáticamente.",
          );
        }
      }
    })();
    recarga.current = tarea;
    try {
      await tarea;
    } finally {
      if (recarga.current === tarea) recarga.current = null;
    }
  }, [usuario?.id, incorporar]);
  useEffect(() => {
    const version = ++sesion.current;
    const controller = new AbortController();
    signal.current = controller.signal;
    esperaPolling.current = 30000;
    ultima.current = null;
    conocidos.current = new Set();
    recarga.current = null;
    setRecientes([]);
    setNoLeidas(0);
    setConectado(false);
    setError("");
    if (!usuario)
      return () => {
        sesion.current++;
        controller.abort();
      };
    let cerrado = false,
      ws,
      reconexion,
      ping,
      polling,
      intentos = 0,
      respaldo = false,
      pollingActivo = false;
    const wsURL = import.meta.env.VITE_WS_URL;
    function programarPolling() {
      clearTimeout(polling);
      if (cerrado || !pollingActivo) return;
      polling = setTimeout(async () => {
        if (document.visibilityState === "visible") await recargar();
        programarPolling();
      }, esperaPolling.current);
    }
    function iniciarPolling() {
      if (pollingActivo) return;
      pollingActivo = true;
      programarPolling();
    }
    function detenerPolling() {
      pollingActivo = false;
      clearTimeout(polling);
      polling = null;
    }
    function planear() {
      if (cerrado) return;
      intentos++;
      if (intentos >= 3) {
        respaldo = true;
        iniciarPolling();
      }
      const espera = respaldo
        ? 300000
        : Math.min(30000, 1000 * 2 ** (intentos - 1)) *
          (0.8 + Math.random() * 0.4);
      clearTimeout(reconexion);
      reconexion = setTimeout(conectar, espera);
    }
    async function conectar() {
      if (cerrado || !wsURL) return;
      try {
        const { data } = await api.post(
          "/notificaciones/ticket/",
          {},
          { signal: controller.signal, silenciarRed: true },
        );
        if (cerrado) return;
        const url = new URL("/ws/notificaciones/", wsURL);
        if (!["wss:", "ws:"].includes(url.protocol))
          throw Error("URL WS inválida");
        url.searchParams.set("ticket", data.ticket);
        ws = new WebSocket(url);
        ws.onopen = () => {
          if (cerrado) {
            ws.close();
            return;
          }
          setConectado(true);
          detenerPolling();
          ping = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN)
              ws.send(JSON.stringify({ tipo: "ping" }));
          }, 25000);
        };
        ws.onmessage = ({ data }) => {
          if (cerrado) return;
          try {
            const m = JSON.parse(data);
            if (m.tipo === "resumen") {
              intentos = 0;
              respaldo = false;
              setNoLeidas(m.no_leidas);
              if (m.ultima_id !== ultima.current) recargar();
            }
            if (m.tipo === "notificacion" && m.notificacion) {
              const n = m.notificacion;
              const ya = conocidos.current.has(n.id);
              incorporar([n]);
              ultima.current = Math.max(ultima.current || 0, n.id);
              if (!ya && !n.leida) setNoLeidas((v) => v + 1);
              setError("");
            }
          } catch {
            /* Ignorar mensajes que no cumplen el protocolo JSON. */
          }
        };
        ws.onclose = () => {
          clearInterval(ping);
          if (!cerrado) {
            setConectado(false);
            planear();
          }
        };
        ws.onerror = () => ws.close();
      } catch (e) {
        if (!cerrado && e.code !== "ERR_CANCELED") planear();
      }
    }
    function visible() {
      if (document.visibilityState === "visible")
        recargar().finally(() => {
          if (pollingActivo) programarPolling();
        });
    }
    document.addEventListener("visibilitychange", visible);
    recargar().finally(() => {
      if (!cerrado && !wsURL) iniciarPolling();
    });
    if (wsURL) conectar();
    return () => {
      cerrado = true;
      if (sesion.current === version) sesion.current++;
      controller.abort();
      clearTimeout(reconexion);
      clearInterval(ping);
      detenerPolling();
      document.removeEventListener("visibilitychange", visible);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [usuario?.id, recargar, incorporar]);
  async function marcarLeida(id) {
    await api.post(`/notificaciones/${id}/leer/`, {});
    setRecientes((items) =>
      items.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    );
    await recargar();
  }
  async function marcarTodas() {
    await api.post("/notificaciones/leer-todas/", {});
    setRecientes((items) => items.map((n) => ({ ...n, leida: true })));
    setNoLeidas(0);
    await recargar();
  }
  return (
    <Contexto.Provider
      value={{
        noLeidas,
        recientes,
        conectado,
        error,
        marcarLeida,
        marcarTodas,
        recargar,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}
