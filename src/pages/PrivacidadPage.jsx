import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { TEXTO_ELIMINACION } from "../utils/privacidad";
export default function PrivacidadPage() {
  const [version, setVersion] = useState(""),
    [error, setError] = useState(false),
    [intento, setIntento] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setError(false);
    api
      .get("/salud/", { sinSesion: true, silenciarRed: true, signal: c.signal })
      .then(({ data }) => setVersion(data.politica_privacidad_version || ""))
      .catch((e) => {
        if (e.code !== "ERR_CANCELED") setError(true);
      });
    return () => c.abort();
  }, [intento]);
  return (
    <article className="form-panel politica-privacidad">
      <h1>Política de privacidad</h1>
      <p className="eyebrow">Versión {version || "no disponible"}</p>
      {error && (
        <p role="alert">
          No pudimos cargar la versión vigente.{" "}
          <button onClick={() => setIntento((i) => i + 1)}>Reintentar</button>
        </p>
      )}
      <h2>1. Responsable del tratamiento</h2>
      <p>[COMPLETAR POR INACAP]</p>
      <h2>2. Qué datos tratamos</h2>
      <p>
        Tratamos tu nombre, RUT, correo institucional, carrera y sede; tu
        contraseña se guarda protegida de forma irreversible, sin conservar su
        texto original. También tratamos el historial de lecturas y una IP
        parcial.
      </p>
      <p>
        Para prevenir el plagio, la marca de agua de cada PDF muestra el correo
        y la IP completa de quien lo lee. Esa IP completa no se guarda.
      </p>
      <h2>3. Para qué usamos tus datos</h2>
      <p>
        Para dar acceso a la biblioteca, revisar y publicar tesis, prevenir el
        plagio y elaborar estadísticas de uso anonimizadas.
      </p>
      <h2>4. Base de licitud</h2>
      <p>
        Tu consentimiento al registrarte. [COMPLETAR POR INACAP: interés
        legítimo / otra]
      </p>
      <h2>5. Cuánto tiempo conservamos los datos</h2>
      <p>
        El historial de lecturas permanece identificado durante 12 meses y luego
        se anonimiza. Las solicitudes rechazadas se conservan durante 6 meses.
        Las tesis publicadas y su autoría se conservan como registro académico.
      </p>
      <h2>6. Dónde se alojan los datos</h2>
      <p>
        Usamos servicios de terceros fuera de Chile para el alojamiento web y el
        correo. [COMPLETAR POR INACAP: proveedores y garantías]
      </p>
      <h2>7. Tus derechos</h2>
      <ul>
        <li>
          Acceso y portabilidad: usa «Descargar mis datos» en{" "}
          <Link to="/perfil">Mi perfil</Link>.
        </li>
        <li>
          Rectificación: puedes editar tu nombre. Para corregir otros datos,
          contacta a tu coordinación.
        </li>
        <li>Supresión: usa «Eliminar mi cuenta» en Mi perfil.</li>
        <li>
          Oposición: puedes oponerte al tratamiento de tus datos mediante el
          contacto indicado.
        </li>
      </ul>
      <p>Contacto: [COMPLETAR POR INACAP]</p>
      <h2>8. Qué pasa al eliminar tu cuenta</h2>
      <p>{TEXTO_ELIMINACION}</p>
    </article>
  );
}
