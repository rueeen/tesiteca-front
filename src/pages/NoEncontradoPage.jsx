import { Link } from "react-router-dom";
export default function NoEncontradoPage() {
  return (
    <section className="empty">
      <span className="eyebrow">ERROR 404</span>
      <h1>Esta página no está en la biblioteca</h1>
      <p>Comprueba la dirección o vuelve a explorar la colección.</p>
      <Link className="button primary" to="/">
        Volver a la biblioteca
      </Link>
    </section>
  );
}
