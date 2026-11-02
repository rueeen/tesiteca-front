import { CheckCircle2, XCircle, Clock, Bell } from "lucide-react";
import { fechaRelativa } from "../utils/fecha";
export default function ItemNotificacion({ item, onClick }) {
  const tipo = item.tipo.toUpperCase();
  const Icono = tipo.includes("APROB")
    ? CheckCircle2
    : tipo.includes("RECHAZ")
      ? XCircle
      : tipo.includes("REVISION")
        ? Clock
        : Bell;
  const clase =
    Icono === CheckCircle2
      ? "exito"
      : Icono === XCircle
        ? "rechazo"
        : Icono === Clock
          ? "advertencia"
          : "";
  return (
    <button
      className={`notification-item ${item.leida ? "" : "unread"}`}
      onClick={() => onClick(item)}
    >
      <Icono className={clase} aria-hidden="true" />
      <span>
        <b>{item.titulo}</b>
        <span className="notification-message">{item.mensaje}</span>
        <small>{fechaRelativa(item.creada)}</small>
      </span>
    </button>
  );
}
