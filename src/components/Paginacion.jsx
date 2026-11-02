export default function Paginacion({
  pagina,
  total,
  tamano,
  onPagina,
  onTamano,
}) {
  const paginas = Math.max(1, Math.ceil(total / tamano));
  const numeros = [
    ...new Set([
      1,
      ...[pagina - 1, pagina, pagina + 1].filter((n) => n > 1 && n < paginas),
      paginas,
    ]),
  ];
  return (
    <div className="pagination">
      <label>
        Por página{" "}
        <select
          value={tamano}
          onChange={(e) => onTamano(Number(e.target.value))}
        >
          {[12, 24, 48].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <div className="row">
        <button disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}>
          Anterior
        </button>
        {numeros.map((n, i) => (
          <span key={n}>
            {i > 0 && n - numeros[i - 1] > 1 && <span> … </span>}
            <button
              aria-current={n === pagina ? "page" : undefined}
              className={n === pagina ? "selected" : ""}
              onClick={() => onPagina(n)}
            >
              {n}
            </button>
          </span>
        ))}
        <button
          disabled={pagina >= paginas}
          onClick={() => onPagina(pagina + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
