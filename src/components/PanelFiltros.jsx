export default function PanelFiltros({
  filtros,
  catalogos,
  onChange,
  onLimpiar,
}) {
  const campo = (key, label, items) => (
    <label>
      {label}
      <select
        value={filtros.get(key) || ""}
        onChange={(e) => onChange(key, e.target.value)}
      >
        <option value="">Todas las opciones</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.nombre}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <aside className="filters">
      <details open>
        <summary>Filtrar resultados</summary>
        <div className="filterbody">
          {campo("carrera", "Carrera", catalogos.carreras)}
          {campo("tipo", "Tipo de trabajo", catalogos.tipos)}
          <div className="two">
            <label>
              Año desde
              <input
                type="number"
                min="1900"
                max="2100"
                value={filtros.get("anio_desde") || ""}
                onChange={(e) => onChange("anio_desde", e.target.value)}
              />
            </label>
            <label>
              Año hasta
              <input
                type="number"
                min="1900"
                max="2100"
                value={filtros.get("anio_hasta") || ""}
                onChange={(e) => onChange("anio_hasta", e.target.value)}
              />
            </label>
          </div>
          <label>
            Profesor guía
            <input
              list="profesores"
              value={filtros.get("profesor_guia") || ""}
              onChange={(e) => onChange("profesor_guia", e.target.value)}
              placeholder="Nombre del profesor"
            />
            <datalist id="profesores">
              {catalogos.profesores.map((p) => (
                <option key={p.id} value={p.nombre} />
              ))}
            </datalist>
          </label>
          <label>
            Palabra clave
            <input
              value={filtros.get("palabra_clave") || ""}
              onChange={(e) => onChange("palabra_clave", e.target.value)}
              placeholder="Ej. inteligencia artificial"
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={filtros.get("con_repositorio") === "true"}
              onChange={(e) =>
                onChange("con_repositorio", e.target.checked ? "true" : "")
              }
            />
            Solo con repositorio
          </label>
          <button className="quiet" onClick={onLimpiar}>
            Limpiar filtros
          </button>
        </div>
      </details>
      <div className="aside-note">
        <span>CONOCIMIENTO QUE CONECTA</span>
        <p>Explora las ideas que nacen en nuestra comunidad.</p>
        <small>INACAP · Sede Arica</small>
      </div>
    </aside>
  );
}
