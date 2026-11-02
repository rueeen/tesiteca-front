import { NavLink, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
export default function Navbar() {
  const { usuario, logout, tieneRol } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [pendientes, setPendientes] = useState(null);
  const revisor = tieneRol("COORDINADOR", "DIRECTOR", "ADMIN");
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      if (revisor)
        try {
          const { data } = await api.get("/tesis/pendientes/", {
            signal: c.signal,
          });
          setPendientes(
            data.count ?? (Array.isArray(data) ? data.length : null),
          );
        } catch {
          /* El listado de revisión muestra sus propios errores. */
        }
    }
    cargar();
    return () => c.abort();
  }, [revisor]);
  return (
    <header className="header">
      <div className="brandbar">
        <Link to="/" className="brand">
          <strong>INACAP</strong>
          <span>
            Biblioteca de Tesis<small>SEDE ARICA</small>
          </span>
        </Link>
        {usuario && (
          <>
            <div className="identity">
              <b>{usuario.nombre || usuario.email}</b>
              <small>{usuario.carrera?.nombre || "Comunidad INACAP"}</small>
            </div>
            <button className="quiet" onClick={logout}>
              Cerrar sesión
            </button>
            <button
              className="mobile"
              aria-label="Abrir menú"
              aria-expanded={abierto}
              onClick={() => setAbierto(!abierto)}
            >
              ☰
            </button>
          </>
        )}
      </div>
      {usuario && (
        <nav
          className={abierto ? "open" : ""}
          onClick={() => setAbierto(false)}
          aria-label="Principal"
        >
          <NavLink to="/" end>
            Biblioteca
          </NavLink>
          <NavLink to="/subir">Subir tesis</NavLink>
          <NavLink to="/mis-tesis">Mis tesis</NavLink>
          {revisor && (
            <>
              <NavLink to="/revision">
                Revisión{" "}
                {pendientes !== null && (
                  <span className="count">{pendientes}</span>
                )}
              </NavLink>
              <NavLink to="/autorizados">Autorizados</NavLink>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
