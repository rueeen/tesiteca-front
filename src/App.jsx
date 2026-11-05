import PrivacidadPage from "./pages/PrivacidadPage";
import ConsentimientoPolitica from "./components/ConsentimientoPolitica";
import lazyConReintento from "./utils/lazyConReintento";
import RutaPublica from "./components/RutaPublica";
import SolicitarAccesoPage from "./pages/SolicitarAccesoPage";
import VerificarCorreoPage from "./pages/VerificarCorreoPage";
import RecuperarPage from "./pages/RecuperarPage";
import RestablecerPage from "./pages/RestablecerPage";
import PerfilPage from "./pages/PerfilPage";
import SolicitudesPage from "./pages/SolicitudesPage";
import AdminSedesPage from "./pages/AdminSedesPage";
import EstadoPage from "./pages/EstadoPage";
import { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LimiteError from "./components/LimiteError";
import { Toaster } from "sonner";
import LogoInacap from "./components/LogoInacap";
import { NotificacionesProvider } from "./context/NotificacionesContext";
import NotificacionesPage from "./pages/NotificacionesPage";
import Navbar from "./components/Navbar";
import RutaProtegida from "./components/RutaProtegida";
import LoginPage from "./pages/LoginPage";
import BibliotecaPage from "./pages/BibliotecaPage";
import TesisDetallePage from "./pages/TesisDetallePage";
const VisorPage = lazyConReintento(() => import("./pages/VisorPage"));
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
function AplicacionConSesion() {
  return (
    <>
      <AuthProvider>
        <ConsentimientoPolitica>
          <NotificacionesProvider>
            <a className="skip-link" href="#contenido">
              Saltar al contenido
            </a>
            <Navbar />
            <main id="contenido">
              <LimiteError>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route element={<RutaPublica />}>
                    <Route
                      path="/solicitar-acceso"
                      element={<SolicitarAccesoPage />}
                    />
                    <Route
                      path="/verificar-correo"
                      element={<VerificarCorreoPage />}
                    />
                    <Route path="/recuperar" element={<RecuperarPage />} />
                    <Route path="/restablecer" element={<RestablecerPage />} />
                  </Route>
                  <Route element={<RutaProtegida />}>
                    <Route index element={<BibliotecaPage />} />
                    <Route path="tesis/:id" element={<TesisDetallePage />} />
                    <Route
                      path="tesis/:id/leer"
                      element={
                        <Suspense
                          fallback={<p role="status">Cargando visor…</p>}
                        >
                          <VisorPage />
                        </Suspense>
                      }
                    />
                    <Route path="perfil" element={<PerfilPage />} />
                    <Route element={<RutaProtegida roles={["ADMIN"]} />}>
                      <Route path="admin/sedes" element={<AdminSedesPage />} />
                    </Route>
                    <Route path="subir" element={<SubirTesisPage />} />
                    <Route
                      path="tesis/:id/editar"
                      element={<SubirTesisPage />}
                    />
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
                      <Route path="solicitudes" element={<SolicitudesPage />} />
                      <Route path="revision" element={<RevisionPage />} />
                      <Route path="autorizados" element={<AutorizadosPage />} />
                    </Route>
                  </Route>
                  <Route path="*" element={<NoEncontradoPage />} />
                </Routes>
              </LimiteError>
            </main>
          </NotificacionesProvider>
        </ConsentimientoPolitica>
      </AuthProvider>
    </>
  );
}

function PiePagina() {
  return (
    <footer className="site-footer">
      <LogoInacap />
      <span>Biblioteca de Tesis · INACAP</span>
      <Link to="/estado">Estado del servicio</Link>
      <Link to="/privacidad">Privacidad</Link>
      <span>Conocimiento abierto a nuestra comunidad.</span>
    </footer>
  );
}
function PaginaPublica({ children }) {
  return (
    <>
      <header className="header">
        <div className="brandbar">
          <Link to="/" className="brand">
            <LogoInacap />
            <span>
              Biblioteca de Tesis<small>COMUNIDAD INACAP</small>
            </span>
          </Link>
        </div>
      </header>
      <main id="contenido">
        <LimiteError>{children}</LimiteError>
      </main>
    </>
  );
}
// La política y la salud siguen disponibles aunque falle la restauración de sesión.
export default function App() {
  return (
    <BrowserRouter>
      <Avisos />
      <Routes>
        <Route
          path="/estado"
          element={
            <PaginaPublica>
              <EstadoPage />
            </PaginaPublica>
          }
        />
        <Route
          path="/privacidad"
          element={
            <PaginaPublica>
              <PrivacidadPage />
            </PaginaPublica>
          }
        />
        <Route path="*" element={<AplicacionConSesion />} />
      </Routes>
      <PiePagina />
    </BrowserRouter>
  );
}
