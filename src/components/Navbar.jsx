import { bloquearScroll } from "../utils/scroll";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { nombreRol } from "../roles";
import LogoInacap from "./LogoInacap";
import CampanaNotificaciones from "./CampanaNotificaciones";
export default function Navbar() {
  const { usuario, logout, tieneRol } = useAuth();
  const [abierto, setAbierto] = useState(false),
    [pendientes, setPendientes] = useState(null);
  const location = useLocation();
  const revisor = tieneRol("COORDINADOR", "DIRECTOR", "ADMIN");
  useEffect(() => setAbierto(false), [location.key]);
  useEffect(() => {
    if (!abierto) return;
    const desbloquear = bloquearScroll();
    function escape(e) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", escape);
    return () => {
      desbloquear();
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      if (revisor)
        try {
          const { data } = await api.get("/tesis/pendientes/", {
            signal: c.signal,
          });
          setPendientes(data.count);
        } catch {
          /* El listado presenta su propio error. */
        }
    }
    cargar();
    return () => c.abort();
  }, [revisor]);
  const identidad = usuario && (
    <>
      <b>{usuario.nombre_completo || usuario.email}</b>
      <small>{usuario.carrera?.nombre || nombreRol(usuario.rol)}</small>
    </>
  );
  return (
    <header className="header">
      <div className="brandbar">
        <Link to="/" className="brand">
          <LogoInacap />
          <span>
            Biblioteca de Tesis<small>SEDE ARICA</small>
          </span>
        </Link>
        {usuario && (
          <>
            <div className="identity">{identidad}</div>
            <div className="nav-actions">
              <CampanaNotificaciones />
              <button className="quiet desktop-logout" onClick={logout}>
                <LogOut aria-hidden="true" />
                Cerrar sesión
              </button>
              <button
                className="mobile icon-button"
                aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={abierto}
                aria-controls="menu-principal"
                onClick={() => setAbierto(!abierto)}
              >
                {abierto ? (
                  <X aria-hidden="true" />
                ) : (
                  <Menu aria-hidden="true" />
                )}
              </button>
            </div>
          </>
        )}
      </div>
      {usuario && (
        <nav
          id="menu-principal"
          className={abierto ? "open" : ""}
          aria-label="Principal"
        >
          <div className="menu-identity">{identidad}</div>
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
          <NavLink to="/notificaciones" className="mobile-nav-link">
            Notificaciones
          </NavLink>
          <button
            className="quiet mobile-logout"
            onClick={() => {
              setAbierto(false);
              logout();
            }}
          >
            <LogOut aria-hidden="true" />
            Cerrar sesión
          </button>
        </nav>
      )}
    </header>
  );
}
