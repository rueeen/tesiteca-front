import ResumenTesis from "../components/ResumenTesis";
import SelectSede from "../components/SelectSede";
import { normalizarResumen } from "../utils/texto";
import { MAX_PDF_MB, MAX_PDF_BYTES } from "../utils/archivos";
import { mensajeErrorSubida } from "../utils/errores";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { lista, mensajeError } from "../api";
import { useAuth } from "../context/AuthContext";
import ZonaArchivo from "../components/ZonaArchivo";
// Los errores DRF pueden incluir listas y objetos anidados de autores.
function erroresCampo(valor, ruta) {
  if (Array.isArray(valor))
    return valor.flatMap((v, i) =>
      erroresCampo(
        v,
        typeof v === "object" && v !== null ? `${ruta}[${i}]` : ruta,
      ),
    );
  if (valor && typeof valor === "object")
    return Object.entries(valor).flatMap(([k, v]) =>
      erroresCampo(v, `${ruta}.${k}`),
    );
  return valor ? [`${ruta}: ${valor}`] : [];
}
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
    estudiante = usuario.rol === "ESTUDIANTE",
    carreraFija = tieneRol("ESTUDIANTE", "COORDINADOR");
  const [paso, setPaso] = useState(0),
    [catalogos, setCatalogos] = useState({
      carreras: [],
      tipos: [],
      profesores: [],
      sedes: [],
    }),
    [form, setForm] = useState({
      titulo: "",
      tipo: "",
      carrera: carreraFija ? String(usuario.carrera?.id ?? "") : "",
      anio: new Date().getFullYear(),
      periodo: "1",
      sede: String(usuario.sede?.id || ""),
      profesor_guia: "",
      resumen: "",
      palabras_clave: [],
      repositorio_url: "",
      publicar: false,
    }),
    [autores, setAutores] = useState(
      estudiante
        ? [
            {
              nombre_completo: usuario.nombre_completo || "",
              email: usuario.email || "",
            },
          ]
        : [{ nombre_completo: "", email: "" }],
    ),
    [palabra, setPalabra] = useState(""),
    [archivo, setArchivo] = useState(null),
    [error, setError] = useState(""),
    [tiempoAgotado, setTiempoAgotado] = useState(false),
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
            "/catalogos/sedes/",
          ].map((url) => api.get(url, { signal: c.signal })),
        );
        setCatalogos({
          carreras: lista(r[0].data),
          tipos: lista(r[1].data),
          profesores: r[2].data,
          sedes: r[3].data,
        });
        if (id) {
          const { data } = await api.get(`/tesis/${id}/`, { signal: c.signal });
          if (!data.puede_editar) {
            setError("No tienes permiso para editar esta tesis.");
            return;
          }
          setPermiso(true);
          setForm((f) => ({
            ...f,
            ...data,
            tipo: data.tipo.id,
            carrera: String(data.carrera.id),
            profesor_guia: data.profesor_guia,
            periodo: String(data.periodo.id),
            sede: String(data.sede?.id || ""),
            palabras_clave: data.palabras_clave,
            repositorio_url:
              data.materiales.find(
                (m) => m.tipo === "REPOSITORIO" && !m.restringido,
              )?.url || "",
            publicar: false,
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
  const carrerasDisponibles =
    usuario.rol === "DIRECTOR"
      ? catalogos.carreras.filter((c) => c.area === usuario.area?.id)
      : catalogos.carreras;
  const repoValido =
    !form.repositorio_url ||
    /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(
      form.repositorio_url,
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
      (!autores.length || autores.some((a) => !a.nombre_completo.trim()))
    ) {
      setError("Ingresa al menos un autor con nombre.");
      return;
    }
    if (paso === 2 && archivo && archivo.size > MAX_PDF_BYTES) {
      setError(`El PDF no debe superar ${MAX_PDF_MB} MB.`);
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
    if (archivo && archivo.size > MAX_PDF_BYTES) {
      setError(`El PDF no debe superar ${MAX_PDF_MB} MB.`);
      return;
    }
    setOcupado(true);
    setError("");
    setTiempoAgotado(false);
    setErrores({});
    try {
      const body = new FormData();
      ["titulo", "tipo", "carrera", "anio", "periodo", "profesor_guia"].forEach(
        (k) => body.append(k, form[k]),
      );
      body.append("resumen", form.resumen);
      body.append("palabras_clave", form.palabras_clave.join(","));
      body.append("autores", JSON.stringify(autores));
      if (archivo) body.append("pdf", archivo);
      if (carrera?.permite_repositorio && form.repositorio_url.trim())
        body.append("repositorio_url", form.repositorio_url);
      if (revisor) body.append("publicar", String(form.publicar));
      const subida = api.request({
        method: id ? "patch" : "post",
        url: id ? `/tesis/${id}/` : "/tesis/",
        data: body,
        onUploadProgress: (e) => {
          if (e.total) setProgreso(Math.round((e.loaded / e.total) * 100));
        },
      });
      toast.promise(subida, {
        loading: "Subiendo tu tesis…",
        success: ({ data }) =>
          data.estado === "PUBLICADA"
            ? "Tesis publicada"
            : "Tesis enviada a revisión",
        error: mensajeErrorSubida,
      });
      const { data } = await subida;
      setExito(data);
    } catch (e) {
      setTiempoAgotado(e.response?.status === 504);
      setErrores(e.response?.status === 400 ? e.response.data : {});
      setError(mensajeErrorSubida(e));
    } finally {
      setOcupado(false);
    }
  }
  const err = (k) =>
    errores[k] && (
      <span className="field-error" role="alert">
        {erroresCampo(errores[k], k).join(" · ")}
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
        <span className="success-icon">
          <CheckCircle2 aria-hidden="true" />
        </span>
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
          <Link to={`/tesis/${exito.id || id}`}>
            Ver detalle <ArrowRight aria-hidden="true" />
          </Link>
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
      <div className="mobile-step">
        <b>
          Paso {paso + 1} de 5 · {pasos[paso]}
        </b>
        <progress max="5" value={paso + 1} />
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
            <div>
              {select("carrera", "Carrera", carrerasDisponibles, carreraFija)}
            </div>
            <div>
              <SelectSede
                sedes={catalogos.sedes}
                value={form.sede}
                disabled
                onChange={() => {}}
              />
              <small>La tesis se registra en la sede de tu cuenta.</small>
            </div>
            {input("anio", "Año", {
              type: "number",
              min: 1900,
              max: new Date().getFullYear() + 1,
              required: true,
            })}
            <label>
              Período académico
              <select
                aria-label="Período académico"
                value={form.periodo}
                onChange={(e) => cambiar("periodo", e.target.value)}
              >
                <option value="1">Primer semestre</option>
                <option value="2">Segundo semestre</option>
              </select>
              <small>Semestre del año en que se presentó la tesis</small>
              {err("periodo")}
            </label>
            {input("profesor_guia", "Profesor guía", {
              type: "text",
              list: "profesores-subida",
              required: true,
            })}
            <datalist id="profesores-subida">
              {catalogos.profesores.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
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
              <small>
                Puedes pegar el texto desde tu PDF; los saltos de línea se
                ajustan automáticamente
              </small>
            </label>
            <div className="full">
              <h3>Vista previa del resumen</h3>
              <ResumenTesis texto={normalizarResumen(form.resumen)} />
            </div>
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
                    {p} <X aria-hidden="true" />
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
                    value={a.nombre_completo}
                    onChange={(e) =>
                      setAutores(
                        autores.map((x, j) =>
                          j === i
                            ? { ...x, nombre_completo: e.target.value }
                            : x,
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
                  <ArrowUp aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Bajar autor ${i + 1}`}
                  disabled={i === autores.length - 1}
                  onClick={() => mover(i, 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Quitar autor ${i + 1}`}
                  disabled={autores.length === 1}
                  onClick={() => setAutores(autores.filter((_, j) => j !== i))}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setAutores([...autores, { nombre_completo: "", email: "" }])
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
              {input("repositorio_url", "Repositorio GitHub (opcional)", {
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
                <dt>Período académico</dt>
                <dd>
                  {form.anio} ·{" "}
                  {form.periodo === "1"
                    ? "Primer semestre"
                    : "Segundo semestre"}
                </dd>
              </div>
              <div>
                <dt>Autores</dt>
                <dd>{autores.map((a) => a.nombre_completo).join(", ")}</dd>
              </div>
              <div>
                <dt>Documento</dt>
                <dd>{archivo?.name || "Mantener PDF actual"}</dd>
              </div>
              <div>
                <dt>Repositorio</dt>
                <dd>
                  {carrera?.permite_repositorio
                    ? form.repositorio_url || "Sin repositorio"
                    : "No habilitado"}
                </dd>
              </div>
            </dl>
            <h3>Resumen</h3>
            <ResumenTesis texto={normalizarResumen(form.resumen)} />
            <p className="notice">
              Al subir, el PDF será marcado con marca de agua.
            </p>
            {revisor && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.publicar}
                  onChange={(e) => cambiar("publicar", e.target.checked)}
                />
                Publicar directamente
              </label>
            )}
            {Object.entries(errores)
              .filter(([k]) => !["detail", "mensaje"].includes(k))
              .map(([k, v]) => (
                <p role="alert" className="error" key={k}>
                  <b>{k}:</b> {erroresCampo(v, k).join(" · ")}
                </p>
              ))}
          </>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {tiempoAgotado && (
          <Link className="button" to="/mis-tesis">
            Revisar Mis tesis
          </Link>
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
            <ArrowLeft aria-hidden="true" /> Anterior
          </button>
          <button className="primary" disabled={ocupado}>
            {ocupado && <span className="spinner" aria-hidden="true" />}
            {ocupado
              ? "Subiendo…"
              : paso === 4
                ? "Confirmar y enviar"
                : "Continuar "}
          </button>
        </div>
      </form>
    </>
  );
}
