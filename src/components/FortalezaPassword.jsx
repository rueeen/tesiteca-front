import { Check, Minus } from "lucide-react";
import { reglasPassword } from "../utils/cuentas";
export default function FortalezaPassword({
  password,
  nombre = "",
  email = "",
}) {
  const reglas = reglasPassword(password, { nombre, email });
  const puntos = reglas.filter((r) => r.cumple).length;
  return (
    <div className="password-strength">
      <label>
        Fortaleza de la contraseña
        <progress max="3" value={puntos} />
      </label>
      <span>
        {!password
          ? "Sin contraseña"
          : puntos === 3
            ? "Cumple las reglas"
            : "Contraseña débil"}
      </span>
      <ul>
        {reglas.map((r) => (
          <li key={r.id} className={r.cumple ? "exito" : ""}>
            {r.cumple ? (
              <Check aria-hidden="true" />
            ) : (
              <Minus aria-hidden="true" />
            )}
            {r.texto}
          </li>
        ))}
      </ul>
    </div>
  );
}
