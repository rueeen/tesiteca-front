import { Component } from "react";
import { Link, useLocation } from "react-router-dom";
class LimiteErrorPagina extends Component {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  componentDidCatch(error, info) {
    console.error("Error al mostrar una página", error, info);
  }
  render() {
    if (this.state.fallo)
      return (
        <section className="empty" role="alert">
          <h1>Algo salió mal al mostrar esta página</h1>
          <p>
            Puedes volver a la biblioteca o recargar para intentarlo nuevamente.
          </p>
          <div className="row">
            <Link className="button primary" to="/">
              Volver a la biblioteca
            </Link>
            <button onClick={() => window.location.reload()}>Recargar</button>
          </div>
        </section>
      );
    return this.props.children;
  }
}
// Al navegar se restablece el límite para poder salir de una página defectuosa.
export default function LimiteError({ children }) {
  const location = useLocation();
  return <LimiteErrorPagina key={location.key}>{children}</LimiteErrorPagina>;
}
