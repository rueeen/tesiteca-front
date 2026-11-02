import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LimiteError from "./components/LimiteError";
import { Toaster } from "sonner";
import LogoInacap, { isotipo } from "./components/LogoInacap";
import { NotificacionesProvider } from "./context/NotificacionesContext";
import NotificacionesPage from "./pages/NotificacionesPage";
import Navbar from "./components/Navbar";
import RutaProtegida from "./components/RutaProtegida";
import LoginPage from "./pages/LoginPage";
import BibliotecaPage from "./pages/BibliotecaPage";
import TesisDetallePage from "./pages/TesisDetallePage";
const VisorPage = lazy(() => import("./pages/VisorPage"));
import SubirTesisPage from "./pages/SubirTesisPage";
import MisTesisPage from "./pages/MisTesisPage";
import RevisionPage from "./pages/RevisionPage";
import AutorizadosPage from "./pages/AutorizadosPage";
import NoEncontradoPage from "./pages/NoEncontradoPage";
function Avisos() {
  const [movil, setMovil] = useState(window.innerWidth < 768);
  const [altoNavbar, setAltoNavbar] = useState(72);
  useEffect(() => {
    let cabecera;
    const resize = new ResizeObserver(([entry]) =>
      setAltoNavbar(entry.target.getBoundingClientRect().height),
    );
    const observar = () => {
      const actual = document.querySelector(".header");
      if (actual === cabecera) return;
      if (cabecera) resize.unobserve(cabecera);
      cabecera = actual;
      if (cabecera) {
        resize.observe(cabecera);
        setAltoNavbar(cabecera.getBoundingClientRect().height);
      }
    };
    const cambios = new MutationObserver(observar);
    cambios.observe(document.body, { childList: true, subtree: true });
    observar();
    return () => {
      resize.disconnect();
      cambios.disconnect();
    };
  }, []);
  useEffect(() => {
    const q = window.matchMedia("(max-width:767px)");
    const actualizar = () => setMovil(q.matches);
    q.addEventListener("change", actualizar);
    if (isotipo) {
      const link =
        document.querySelector('link[rel="icon"]') ||
        document.createElement("link");
      link.rel = "icon";
      link.href = isotipo;
      document.head.appendChild(link);
    }
    return () => q.removeEventListener("change", actualizar);
  }, []);
  return (
    <Toaster
      richColors
      closeButton
      position={movil ? "top-center" : "bottom-right"}
      offset={
        movil ? { top: altoNavbar + 8, left: 16, right: 16, bottom: 16 } : 24
      }
      mobileOffset={{ top: altoNavbar + 8, left: 16, right: 16, bottom: 16 }}
    />
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <Avisos />
      <AuthProvider>
        <NotificacionesProvider>
          <a className="skip-link" href="#contenido">
            Saltar al contenido
          </a>
          <Navbar />
          <main id="contenido">
            <LimiteError>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<RutaProtegida />}>
                  <Route index element={<BibliotecaPage />} />
                  <Route path="tesis/:id" element={<TesisDetallePage />} />
                  <Route
                    path="tesis/:id/leer"
                    element={
                      <Suspense fallback={<p role="status">Cargando visor…</p>}>
                        <VisorPage />
                      </Suspense>
                    }
                  />
                  <Route path="subir" element={<SubirTesisPage />} />
                  <Route path="tesis/:id/editar" element={<SubirTesisPage />} />
                  <Route
                    path="notificaciones"
                    element={<NotificacionesPage />}
                  />
                  <Route path="mis-tesis" element={<MisTesisPage />} />
                  <Route
                    element={
                      <RutaProtegida
                        roles={["COORDINADOR", "DIRECTOR", "ADMIN"]}
                      />
                    }
                  >
                    <Route path="revision" element={<RevisionPage />} />
                    <Route path="autorizados" element={<AutorizadosPage />} />
                  </Route>
                </Route>
                <Route path="*" element={<NoEncontradoPage />} />
              </Routes>
            </LimiteError>
          </main>
          <footer className="site-footer">
            <LogoInacap />
            <span>Biblioteca de Tesis · Sede Arica</span>
            <span>Conocimiento abierto a nuestra comunidad.</span>
          </footer>
        </NotificacionesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
