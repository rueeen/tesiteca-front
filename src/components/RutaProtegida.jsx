import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function RutaProtegida({ roles }) {
  const { usuario, cargando, tieneRol, salidaVoluntaria } = useAuth();
  const location = useLocation();
  if (cargando) return <p role="status">Comprobando sesión…</p>;
  if (!usuario)
    return (
      <Navigate
        to={
          salidaVoluntaria
            ? "/login"
            : `/login?next=${encodeURIComponent(location.pathname + location.search)}`
        }
        state={
          salidaVoluntaria
            ? null
            : { from: location.pathname + location.search }
        }
        replace
      />
    );
  if (roles && !tieneRol(...roles))
    return (
      <section className="empty">
        <h1>No tienes permiso</h1>
        <p>Esta sección requiere un rol de revisión.</p>
      </section>
    );
  return <Outlet />;
}
