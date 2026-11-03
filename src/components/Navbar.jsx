import { useNotificaciones } from "../context/NotificacionesContext";
import { bloquearScroll } from "../utils/scroll";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { nombreRol } from "../roles";
import { pluralizar } from "../utils/texto";
import LogoInacap from "./LogoInacap";
import CampanaNotificaciones from "./CampanaNotificaciones";
export default function Navbar() {
  const { usuario, logout, tieneRol } = useAuth();
  const { solicitudesPendientes } = useNotificaciones();
  const [abierto, setAbierto] = useState(false),
    [pendientes, setPendientes] = useState(null);
  const location = useLocation();
  const menuUsuario = useRef();
  useEffect(() => {
    if (menuUsuario.current) menuUsuario.current.open = false;
  }, [location.key]);
  useEffect(() => {
    function cerrar(e) {
      if (e.type === "keydown" && e.key !== "Escape") return;
      if (e.type === "pointerdown" && menuUsuario.current?.contains(e.target))
        return;
      if (menuUsuario.current) menuUsuario.current.open = false;
    }
    document.addEventListener("keydown", cerrar);
    document.addEventListener("pointerdown", cerrar);
    return () => {
      document.removeEventListener("keydown", cerrar);
      document.removeEventListener("pointerdown", cerrar);
    };
  }, []);
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
            Biblioteca de Tesis<small>COMUNIDAD INACAP</small>
          </span>
        </Link>
        {usuario && (
          <>
            <details className="user-menu" ref={menuUsuario}>
              <summary className="identity" aria-label="Abrir menú de usuario">
                {identidad}
              </summary>
              <div className="user-menu-panel">
                <NavLink to="/perfil">Mi perfil</NavLink>
                {tieneRol("ADMIN") && (
                  <NavLink to="/admin/sedes">Administrar sedes</NavLink>
                )}
              </div>
            </details>
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
              <NavLink to="/solicitudes">
                Solicitudes{" "}
                <span
                  className="count"
                  aria-label={`${solicitudesPendientes} ${pluralizar(solicitudesPendientes, "solicitud pendiente", "solicitudes pendientes")}`}
                >
                  {solicitudesPendientes}
                </span>
              </NavLink>
            </>
          )}
          <NavLink to="/perfil" className="mobile-nav-link">
            Mi perfil
          </NavLink>
          {tieneRol("ADMIN") && (
            <NavLink to="/admin/sedes" className="mobile-nav-link">
              Administrar sedes
            </NavLink>
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
