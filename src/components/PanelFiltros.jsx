import SelectSede from "./SelectSede";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import Modal from "./Modal";
export default function PanelFiltros({
  filtros,
  catalogos,
  onChange,
  onLimpiar,
  onAplicar,
}) {
  const [abierto, setAbierto] = useState(false),
    [borrador, setBorrador] = useState(new URLSearchParams());
  const activos = [...filtros.keys()].filter(
    (k) =>
      !["page", "page_size", "search", "ordering", "en_contenido"].includes(k),
  ).length;
  const contenido = (filtros, onChange, onLimpiar) => (
    <div className="filterbody">
      {campo("carrera", "Carrera", catalogos.carreras, filtros, onChange)}
      {campo("tipo", "Tipo de trabajo", catalogos.tipos, filtros, onChange)}
      {campo(
        "nivel_formacion",
        "Nivel de formación",
        catalogos.niveles,
        filtros,
        onChange,
      )}
      {campo("region", "Región", catalogos.regiones, filtros, onChange)}
      <SelectSede
        sedes={catalogos.sedes.filter(
          (s) =>
            !filtros.get("region") ||
            String(s.region.id) === filtros.get("region"),
        )}
        value={filtros.get("sede") || ""}
        vacio="Todas las sedes"
        onChange={(e) => onChange("sede", e.target.value)}
      />

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
            <option key={p} value={p} />
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
  );
  const campo = (key, label, items, filtros, onChange) => (
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
      <button
        className="mobile filter-toggle"
        onClick={() => {
          setBorrador(new URLSearchParams(filtros));
          setAbierto(true);
        }}
      >
        <SlidersHorizontal aria-hidden="true" />
        Filtros ({activos})
      </button>
      <details open className="desktop-filters">
        <summary>Filtrar resultados</summary>
        {contenido(filtros, onChange, onLimpiar)}
      </details>
      {abierto && (
        <Modal
          className="filters-sheet"
          titulo="Filtrar resultados"
          onClose={() => setAbierto(false)}
        >
          {contenido(
            borrador,
            (k, v) =>
              setBorrador((actual) => {
                const p = new URLSearchParams(actual);
                v ? p.set(k, v) : p.delete(k);
                if (k === "region" && p.get("sede")) {
                  const elegida = catalogos.sedes.find(
                    (s) => String(s.id) === p.get("sede"),
                  );
                  if (!v || String(elegida?.region.id) !== v) p.delete("sede");
                }
                p.delete("page");
                return p;
              }),
            () => setBorrador(new URLSearchParams()),
          )}
          <button
            className="primary wide"
            onClick={() => {
              onAplicar(borrador);
              setAbierto(false);
            }}
          >
            Aplicar
          </button>
        </Modal>
      )}
      <div className="aside-note">
        <span>CONOCIMIENTO QUE CONECTA</span>
        <p>Explora las ideas que nacen en nuestra comunidad.</p>
        <small>INACAP · Sede Arica</small>
      </div>
    </aside>
  );
}
