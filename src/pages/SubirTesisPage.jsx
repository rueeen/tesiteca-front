import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { lista, mensajeError } from "../api";
import { useAuth } from "../context/AuthContext";
import ZonaArchivo from "../components/ZonaArchivo";
const pasos = [
  "Datos",
  "Autores",
  "Documento",
  "Material adicional",
  "Confirmar",
];
export default function SubirTesisPage() {
  const { id } = useParams();
  const { usuario, tieneRol } = useAuth();
  const revisor = tieneRol("COORDINADOR", "DIRECTOR", "ADMIN"),
    estudiante = usuario.rol === "ESTUDIANTE";
  const [paso, setPaso] = useState(0),
    [catalogos, setCatalogos] = useState({
      carreras: [],
      tipos: [],
      profesores: [],
    }),
    [form, setForm] = useState({
      titulo: "",
      tipo: "",
      carrera: estudiante
        ? String(usuario.carrera?.id || usuario.carrera || "")
        : "",
      anio: new Date().getFullYear(),
      semestre: "1",
      profesor_guia: "",
      resumen: "",
      palabras_clave: [],
      repositorio: "",
      publicar_directamente: false,
    }),
    [autores, setAutores] = useState(
      estudiante
        ? [{ nombre: usuario.nombre || "", email: usuario.email || "" }]
        : [{ nombre: "", email: "" }],
    ),
    [palabra, setPalabra] = useState(""),
    [archivo, setArchivo] = useState(null),
    [error, setError] = useState(""),
    [errores, setErrores] = useState({}),
    [cargando, setCargando] = useState(true),
    [ocupado, setOcupado] = useState(false),
    [progreso, setProgreso] = useState(0),
    [exito, setExito] = useState(null),
    [permiso, setPermiso] = useState(!id);
  useEffect(() => {
    const c = new AbortController();
    async function cargar() {
      try {
        const r = await Promise.all(
          [
            "/catalogos/carreras/",
            "/catalogos/tipos/",
            "/catalogos/profesores-guia/",
          ].map((url) => api.get(url, { signal: c.signal })),
        );
        setCatalogos({
          carreras: lista(r[0].data),
          tipos: lista(r[1].data),
          profesores: lista(r[2].data),
        });
        if (id) {
          const { data } = await api.get(`/tesis/${id}/`, { signal: c.signal });
          const autor =
            data.es_autor ||
            String(data.subido_por?.id || data.subido_por) ===
              String(usuario.id) ||
            data.autores?.some(
              (a) =>
                (a.usuario != null && a.usuario === usuario.id) ||
                (usuario.email && a.email === usuario.email),
            );
          if (
            !revisor &&
            !(autor && ["BORRADOR", "RECHAZADA"].includes(data.estado))
          ) {
            setError("No tienes permiso para editar esta tesis.");
            return;
          }
          setPermiso(true);
          setForm((f) => ({
            ...f,
            ...data,
            tipo: String(data.tipo?.id || data.tipo || ""),
            carrera: String(data.carrera?.id || data.carrera || ""),
            profesor_guia: String(
              data.profesor_guia?.id || data.profesor_guia || "",
            ),
            palabras_clave: (data.palabras_clave || []).map(
              (p) => p.nombre || p,
            ),
            repositorio: data.repositorio || "",
            publicar_directamente: false,
          }));
          setAutores(data.autores || []);
        }
      } catch (e) {
        if (e.code !== "ERR_CANCELED") setError(mensajeError(e));
      } finally {
        if (!c.signal.aborted) setCargando(false);
      }
    }
    cargar();
    return () => c.abort();
  }, [id, usuario.id, revisor]);
  const carrera = catalogos.carreras.find(
    (c) => String(c.id) === String(form.carrera),
  );
  const repoValido =
    !form.repositorio ||
    /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(
      form.repositorio,
    );
  function cambiar(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((e) => ({ ...e, [k]: null }));
  }
  function agregarPalabra() {
    const p = palabra.trim().replace(/,$/, "");
    if (p && !form.palabras_clave.includes(p))
      cambiar("palabras_clave", [...form.palabras_clave, p]);
    setPalabra("");
  }
  function mover(i, d) {
    const copy = [...autores];
    [copy[i], copy[i + d]] = [copy[i + d], copy[i]];
    setAutores(copy);
  }
  function avanzar(e) {
    e.preventDefault();
    if (
      paso === 1 &&
      (!autores.length || autores.some((a) => !a.nombre.trim()))
    ) {
      setError("Ingresa al menos un autor con nombre.");
      return;
    }
    if (paso === 2 && !archivo && !id) {
      setError("Selecciona el documento PDF.");
      return;
    }
    if (paso === 3 && carrera?.permite_repositorio && !repoValido) {
      setError("Ingresa una URL de GitHub válida.");
      return;
    }
    setError("");
    setPaso((p) => Math.min(4, p + 1));
  }
  async function enviar(e) {
    e.preventDefault();
    setOcupado(true);
    setError("");
    setErrores({});
    try {
      const body = new FormData();
      [
        "titulo",
        "tipo",
        "carrera",
        "anio",
        "semestre",
        "profesor_guia",
        "resumen",
      ].forEach((k) => body.append(k, form[k]));
      body.append("palabras_clave", JSON.stringify(form.palabras_clave));
      body.append("autores", JSON.stringify(autores));
      if (archivo) body.append("pdf", archivo);
      if (carrera?.permite_repositorio)
        body.append("repositorio", form.repositorio);
      if (revisor)
        body.append(
          "publicar_directamente",
          String(form.publicar_directamente),
        );
      const { data } = await api.request({
        method: id ? "patch" : "post",
        url: id ? `/tesis/${id}/` : "/tesis/",
        data: body,
        onUploadProgress: (e) => {
          if (e.total) setProgreso(Math.round((e.loaded / e.total) * 100));
        },
      });
      setExito(data);
    } catch (e) {
      setErrores(e.response?.data || {});
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  const err = (k) =>
    errores[k] && (
      <span className="field-error" role="alert">
        {Array.isArray(errores[k]) ? errores[k].join(" ") : String(errores[k])}
      </span>
    );
  const input = (k, label, props = {}) => (
    <label>
      {label}
      <input
        aria-label={label}
        value={form[k]}
        onChange={(e) => cambiar(k, e.target.value)}
        {...props}
      />
      {err(k)}
    </label>
  );
  const select = (k, label, items, disabled = false) => (
    <label>
      {label}
      <select
        aria-label={label}
        required
        disabled={disabled}
        value={form[k]}
        onChange={(e) => cambiar(k, e.target.value)}
      >
        <option value="">Selecciona una opción</option>
        {items.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
      {err(k)}
    </label>
  );
  if (cargando) return <p role="status">Preparando formulario…</p>;
  if (!permiso)
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  if (exito)
    return (
      <section className="empty">
        <span className="success-icon">✓</span>
        <h1>
          {exito.estado === "PUBLICADA"
            ? "Tesis publicada"
            : "Tu tesis fue enviada a revisión"}
        </h1>
        <p>Gracias por compartir tu conocimiento con la comunidad.</p>
        <div className="row">
          <Link className="button primary" to="/mis-tesis">
            Mis tesis
          </Link>
          <Link to={`/tesis/${exito.id || id}`}>Ver detalle →</Link>
        </div>
      </section>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">COMPARTE TU CONOCIMIENTO</span>
          <h1>{id ? "Editar tesis" : "Subir una tesis"}</h1>
          <p>Un nuevo aporte para las próximas generaciones.</p>
        </div>
        <span>Paso {paso + 1} de 5</span>
      </div>
      <ol className="steps">
        {pasos.map((p, i) => (
          <li
            key={p}
            aria-current={i === paso ? "step" : undefined}
            className={i <= paso ? "done" : ""}
          >
            <span>{i + 1}</span>
            {p}
          </li>
        ))}
      </ol>
      <form className="form-panel" onSubmit={paso === 4 ? enviar : avanzar}>
        <h2>{pasos[paso]}</h2>
        {paso === 0 && (
          <div className="form-grid">
            {input("titulo", "Título de la tesis", {
              required: true,
              maxLength: 300,
            })}
            {select("tipo", "Tipo de trabajo", catalogos.tipos)}
            {select("carrera", "Carrera", catalogos.carreras, estudiante)}
            {input("anio", "Año", {
              type: "number",
              min: 1900,
              max: new Date().getFullYear() + 1,
              required: true,
            })}
            <label>
              Semestre
              <select
                value={form.semestre}
                onChange={(e) => cambiar("semestre", e.target.value)}
              >
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
              {err("semestre")}
            </label>
            {select("profesor_guia", "Profesor guía", catalogos.profesores)}
            <label className="full">
              Resumen
              <textarea
                aria-label="Resumen"
                rows={7}
                required
                value={form.resumen}
                onChange={(e) => cambiar("resumen", e.target.value)}
              />
              <small>{form.resumen.length} caracteres</small>
              {err("resumen")}
            </label>
            <label className="full">
              Palabras clave
              <input
                value={palabra}
                placeholder="Escribe y presiona Enter o coma"
                onChange={(e) => setPalabra(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    agregarPalabra();
                  }
                }}
                onBlur={agregarPalabra}
              />
              {err("palabras_clave")}
              <span className="tags">
                {form.palabras_clave.map((p) => (
                  <button
                    type="button"
                    key={p}
                    aria-label={`Quitar ${p}`}
                    onClick={() =>
                      cambiar(
                        "palabras_clave",
                        form.palabras_clave.filter((x) => x !== p),
                      )
                    }
                  >
                    {p} ×
                  </button>
                ))}
              </span>
            </label>
          </div>
        )}
        {paso === 1 && (
          <div className="stack">
            {autores.map((a, i) => (
              <div className="author-row" key={i}>
                <label>
                  Nombre completo
                  <input
                    required
                    value={a.nombre}
                    onChange={(e) =>
                      setAutores(
                        autores.map((x, j) =>
                          j === i ? { ...x, nombre: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Correo (opcional)
                  <input
                    type="email"
                    value={a.email || ""}
                    onChange={(e) =>
                      setAutores(
                        autores.map((x, j) =>
                          j === i ? { ...x, email: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Subir autor ${i + 1}`}
                  disabled={i === 0}
                  onClick={() => mover(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Bajar autor ${i + 1}`}
                  disabled={i === autores.length - 1}
                  onClick={() => mover(i, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Quitar autor ${i + 1}`}
                  disabled={autores.length === 1}
                  onClick={() => setAutores(autores.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setAutores([...autores, { nombre: "", email: "" }])
              }
            >
              + Agregar autor
            </button>
            {err("autores")}
          </div>
        )}
        {paso === 2 && (
          <>
            <ZonaArchivo archivo={archivo} onChange={setArchivo} />
            {id && (
              <p className="muted">Dejar vacío para mantener el PDF actual.</p>
            )}
            {err("pdf")}
          </>
        )}
        {paso === 3 &&
          (carrera?.permite_repositorio ? (
            <>
              {input("repositorio", "Repositorio GitHub (opcional)", {
                type: "url",
                placeholder: "https://github.com/usuario/repositorio",
              })}
              <p className="muted">
                Solo será visible para estudiantes de tu carrera.
              </p>
              {!repoValido && (
                <p className="error">
                  Usa el formato https://github.com/usuario/repo.
                </p>
              )}
            </>
          ) : (
            <p>Esta carrera no tiene habilitado el repositorio adicional.</p>
          ))}
        {paso === 4 && (
          <>
            <dl className="metadata">
              <div>
                <dt>Título</dt>
                <dd>{form.titulo}</dd>
              </div>
              <div>
                <dt>Carrera</dt>
                <dd>{carrera?.nombre}</dd>
              </div>
              <div>
                <dt>Año / semestre</dt>
                <dd>
                  {form.anio} / {form.semestre}
                </dd>
              </div>
              <div>
                <dt>Autores</dt>
                <dd>{autores.map((a) => a.nombre).join(", ")}</dd>
              </div>
              <div>
                <dt>Documento</dt>
                <dd>{archivo?.name || "Mantener PDF actual"}</dd>
              </div>
              <div>
                <dt>Repositorio</dt>
                <dd>
                  {carrera?.permite_repositorio
                    ? form.repositorio || "Sin repositorio"
                    : "No habilitado"}
                </dd>
              </div>
            </dl>
            <h3>Resumen</h3>
            <p>{form.resumen}</p>
            <p className="notice">
              Al subir, el PDF será marcado con marca de agua.
            </p>
            {revisor && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.publicar_directamente}
                  onChange={(e) =>
                    cambiar("publicar_directamente", e.target.checked)
                  }
                />
                Publicar directamente
              </label>
            )}
            {Object.entries(errores)
              .filter(([k]) => !["detail", "mensaje"].includes(k))
              .map(([k, v]) => (
                <p role="alert" className="error" key={k}>
                  <b>{k}:</b>{" "}
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </p>
              ))}
          </>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {ocupado && (
          <label>
            Subiendo: {progreso}%<progress value={progreso} max="100" />
          </label>
        )}
        <div className="form-actions">
          <button
            type="button"
            disabled={paso === 0 || ocupado}
            onClick={() => setPaso(paso - 1)}
          >
            ← Anterior
          </button>
          <button className="primary" disabled={ocupado}>
            {ocupado
              ? "Subiendo…"
              : paso === 4
                ? "Confirmar y enviar"
                : "Continuar →"}
          </button>
        </div>
      </form>
    </>
  );
}
