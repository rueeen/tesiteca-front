import { Link } from "react-router-dom";
import { BookOpen, TriangleAlert } from "lucide-react";
export default function EstadoVacio({
  titulo,
  texto,
  error = false,
  accion = "Volver a la biblioteca",
  destino = "/",
}) {
  const Icono = error ? TriangleAlert : BookOpen;
  return (
    <section className="empty" role={error ? "alert" : undefined}>
      <Icono aria-hidden="true" size={38} />
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
      <Link className="button primary" to={destino}>
        {accion}
      </Link>
    </section>
  );
}
