import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
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
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <Navbar />
        <main id="contenido">
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
              <Route path="mis-tesis" element={<MisTesisPage />} />
              <Route
                element={
                  <RutaProtegida roles={["COORDINADOR", "DIRECTOR", "ADMIN"]} />
                }
              >
                <Route path="revision" element={<RevisionPage />} />
                <Route path="autorizados" element={<AutorizadosPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NoEncontradoPage />} />
          </Routes>
        </main>
        <footer className="site-footer">
          <b>INACAP</b>
          <span>Biblioteca de Tesis · Sede Arica</span>
          <span>Conocimiento abierto a nuestra comunidad.</span>
        </footer>
      </AuthProvider>
    </BrowserRouter>
  );
}
