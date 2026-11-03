import { useId } from "react";
export default function SelectSede({
  sedes,
  value,
  onChange,
  label = "Sede",
  vacio = "Selecciona una sede",
  error,
  ...props
}) {
  const id = useId();
  const grupos = new Map();
  for (const sede of sedes) {
    const region = sede.region;
    const grupo = grupos.get(region.id) || { nombre: region.nombre, sedes: [] };
    grupo.sedes.push(sede);
    grupos.set(region.id, grupo);
  }
  return (
    <div className="select-sede">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        {...props}
      >
        <option value="">{vacio}</option>
        {[...grupos.entries()].map(([id, g]) => (
          <optgroup key={id} label={g.nombre}>
            {g.sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} · {s.ciudad}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {error && (
        <span role="alert" className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
