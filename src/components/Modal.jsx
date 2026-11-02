import { bloquearScroll } from "../utils/scroll";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
export default function Modal({ titulo, children, onClose, className = "" }) {
  const ref = useRef();
  const cerrar = useRef(onClose);
  cerrar.current = onClose;
  useEffect(() => {
    const desbloquear = bloquearScroll();
    const antes = document.activeElement;
    const el = ref.current;
    el.focus();
    function teclado(e) {
      if (e.key === "Escape") cerrar.current();
      if (e.key === "Tab") {
        const items = [
          ...el.querySelectorAll("button,input,textarea,select,a[href]"),
        ].filter((x) => !x.disabled);
        const primero = items[0],
          ultimo = items.at(-1);
        if (!primero) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === primero || document.activeElement === el)
        ) {
          e.preventDefault();
          ultimo.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === ultimo || document.activeElement === el)
        ) {
          e.preventDefault();
          primero.focus();
        }
      }
    }
    el.addEventListener("keydown", teclado);
    return () => {
      desbloquear();
      el.removeEventListener("keydown", teclado);
      antes?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        ref={ref}
        tabIndex={-1}
      >
        <div className="row">
          <h2>{titulo}</h2>
          <button aria-label="Cerrar" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
