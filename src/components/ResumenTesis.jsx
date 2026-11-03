import { useEffect, useId, useRef, useState } from "react";
export default function ResumenTesis({ texto = "" }) {
  const id = useId(),
    contenido = useRef(),
    seccion = useRef();
  const [expandido, setExpandido] = useState(false),
    [desborda, setDesborda] = useState(false),
    [alto, setAlto] = useState(238);
  useEffect(() => {
    const el = contenido.current;
    function medir() {
      const limite = parseFloat(getComputedStyle(el).lineHeight) * 8;
      setAlto(limite);
      setDesborda(el.scrollHeight > limite + 1);
    }
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    medir();
    return () => observer.disconnect();
  }, [texto]);
  function alternar() {
    if (expandido) {
      setExpandido(false);
      if (seccion.current.getBoundingClientRect().top < 0)
        seccion.current.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
    } else setExpandido(true);
  }
  return (
    <section
      className="resumen-tesis"
      ref={seccion}
      aria-label="Resumen de la tesis"
    >
      <div
        id={id}
        className={`resumen-ventana ${!expandido && desborda ? "resumen-colapsado" : ""}`}
        style={{ maxHeight: !expandido && desborda ? alto : undefined }}
      >
        <div ref={contenido} className="resumen-parrafos">
          {texto
            .split(/\n\s*\n/)
            .filter((p) => p.trim())
            .map((p, i) => (
              <p key={i}>{p}</p>
            ))}
        </div>
      </div>
      {desborda && (
        <button
          type="button"
          className="quiet"
          aria-expanded={expandido}
          aria-controls={id}
          onClick={alternar}
        >
          {expandido ? "Leer menos" : "Leer más"}
        </button>
      )}
    </section>
  );
}
