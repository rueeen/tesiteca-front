import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { mensajeError } from "../api";
import Modal from "./Modal";
export default function ConsentimientoPolitica({ children }) {
  const { usuario, actualizarUsuario, logout } = useAuth();
  const [ocupado, setOcupado] = useState(false),
    [error, setError] = useState("");
  if (!usuario?.debe_aceptar_politica) return children;
  async function aceptar() {
    setOcupado(true);
    setError("");
    try {
      await api.post("/cuenta/aceptar-politica/");
      actualizarUsuario({ debe_aceptar_politica: false });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  return (
    <Modal
      titulo="Actualizamos nuestra política de privacidad"
      descartable={false}
      onClose={() => {}}
    >
      <p>
        Revisa la <Link to="/privacidad">política de privacidad</Link> antes de
        continuar.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="row">
        <button className="primary" disabled={ocupado} onClick={aceptar}>
          Aceptar
        </button>
        <button disabled={ocupado} onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </Modal>
  );
}
