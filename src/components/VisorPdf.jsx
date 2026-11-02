import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Maximize,
  ZoomIn,
  ZoomOut,
  ScanLine,
} from "lucide-react";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
function Pagina({ numero, ancho, registrar }) {
  const ref = useRef();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    registrar(numero, el);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "900px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      registrar(numero, null);
    };
  }, [numero, registrar]);
  return (
    <div
      ref={ref}
      className="pdf-page"
      data-page={numero}
      style={{ minHeight: ancho * 1.414 }}
    >
      {visible ? (
        <Page
          error={<p>No fue posible mostrar esta página del PDF.</p>}
          pageNumber={numero}
          width={ancho}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={<p>Cargando página {numero}…</p>}
        />
      ) : (
        <span>Página {numero}</span>
      )}
    </div>
  );
}
export default function VisorPdf({ url }) {
  const [total, setTotal] = useState(0),
    [actual, setActual] = useState(1),
    [zoom, setZoom] = useState(1),
    [ancho, setAncho] = useState(800),
    [error, setError] = useState("");
  const contenedor = useRef(),
    paginas = useRef({});
  const registrar = useRef((n, el) => {
    paginas.current[n] = el;
  }).current;
  function saltar(n) {
    const valor = Math.max(1, Math.min(total, Number(n) || 1));
    setActual(valor);
    paginas.current[valor]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
  useEffect(() => {
    const o = new ResizeObserver(([entry]) =>
      setAncho(Math.min(1100, entry.contentRect.width - 24)),
    );
    o.observe(contenedor.current);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    function teclado(e) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (["ArrowLeft", "ArrowRight", "+", "-"].includes(e.key))
        e.preventDefault();
      if (e.key === "ArrowLeft") saltar(actual - 1);
      if (e.key === "ArrowRight") saltar(actual + 1);
      if (e.key === "+") setZoom((z) => Math.min(2, z + 0.1));
      if (e.key === "-") setZoom((z) => Math.max(0.5, z - 0.1));
    }
    window.addEventListener("keydown", teclado);
    return () => window.removeEventListener("keydown", teclado);
  }, [actual, total]);
  useEffect(() => {
    if (!total) return;
    const o = new IntersectionObserver(
      (entries) => {
        const visibles = entries.filter((e) => e.isIntersecting);
        if (visibles.length) setActual(Number(visibles[0].target.dataset.page));
      },
      { rootMargin: "-90px 0px -60% 0px" },
    );
    Object.values(paginas.current)
      .filter(Boolean)
      .forEach((el) => o.observe(el));
    return () => o.disconnect();
  }, [total]);
  async function pantallaCompleta() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await contenedor.current.requestFullscreen();
    } catch {
      setError("Pantalla completa no disponible en este navegador.");
    }
  }
  const controles = (
    <>
      <button
        aria-label="Reducir zoom"
        onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
      >
        <ZoomOut aria-hidden="true" />
      </button>
      <span>{Math.round(zoom * 100)}%</span>
      <button
        aria-label="Aumentar zoom"
        onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
      >
        <ZoomIn aria-hidden="true" />
      </button>
      <button onClick={() => setZoom(1)}>
        <ScanLine aria-hidden="true" />
        Ajustar al ancho
      </button>
      <button onClick={pantallaCompleta}>
        <Maximize aria-hidden="true" />
        Pantalla completa
      </button>
    </>
  );
  return (
    <section
      ref={contenedor}
      className="pdf-viewer"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="pdf-toolbar">
        <button
          disabled={actual <= 1}
          onClick={() => saltar(actual - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <label className="page-number">
          <span className="page-label">Página</span>
          <input
            aria-label="Página actual"
            type="number"
            min="1"
            max={total || 1}
            value={actual}
            onChange={(e) => saltar(e.target.value)}
          />
        </label>
        <span>/ {total}</span>
        <button
          disabled={actual >= total}
          onClick={() => saltar(actual + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight aria-hidden="true" />
        </button>
        <div className="pdf-zoom">{controles}</div>
        <details className="pdf-more">
          <summary aria-label="Más opciones del visor">
            <MoreHorizontal aria-hidden="true" />
          </summary>
          <div className="pdf-zoom-menu">{controles}</div>
        </details>
      </div>
      <p className="watermark-note">
        Este documento está marcado con tu correo. Su uso está registrado.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <Document
        error={<p role="alert">No fue posible abrir este documento PDF.</p>}
        file={url}
        onLoadSuccess={({ numPages }) => setTotal(numPages)}
        onLoadError={() => setError("No fue posible abrir el PDF.")}
        loading={<p role="status">Preparando documento…</p>}
      >
        {Array.from({ length: total }, (_, i) => (
          <Pagina
            key={i + 1}
            numero={i + 1}
            ancho={Math.max(240, ancho * zoom)}
            registrar={registrar}
          />
        ))}
      </Document>
    </section>
  );
}
