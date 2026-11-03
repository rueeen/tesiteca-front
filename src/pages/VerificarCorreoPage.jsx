import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { leerEnlaceCuenta, borrarEnlaceCuenta } from "../utils/enlacesCuenta";
import ReenviarVerificacion from "../components/ReenviarVerificacion";
export default function VerificarCorreoPage() {
  const [enlace] = useState(() => leerEnlaceCuenta("/verificar-correo"));
  const [estado, setEstado] = useState(""),
    [error, setError] = useState("");
  const peticion = useRef(null);
  useEffect(() => {
    let activo = true;
    if (!enlace.token) {
      setError("El enlace de validación no es válido o está incompleto.");
      return;
    }
    if (!peticion.current) {
      peticion.current = api.post(
        "/auth/verificar-correo/",
        { token: enlace.token },
        { sinSesion: true },
      );
      borrarEnlaceCuenta("/verificar-correo");
    }
    peticion.current
      .then(({ data }) => {
        if (activo) setEstado(data.estado);
      })
      .catch(() => {
        if (activo)
          setError("El enlace de validación no es válido o ya expiró.");
      });
    return () => {
      activo = false;
    };
  }, [enlace]);
  return (
    <section className="account-form form-panel">
      <h1>Validación de correo</h1>
      {estado === "ACTIVA" ? (
        <h2>¡Cuenta lista! Ya puedes ingresar</h2>
      ) : estado === "PENDIENTE_APROBACION" ? (
        <p role="status">
          Correo validado. La coordinación de tu carrera revisará tu solicitud.
        </p>
      ) : error ? (
        <>
          <p role="alert" className="error">
            {error}
          </p>
          <ReenviarVerificacion />
        </>
      ) : (
        <p role="status">Validando tu correo…</p>
      )}
      <Link className="button primary" to="/login">
        Ir al login
      </Link>
    </section>
  );
}
