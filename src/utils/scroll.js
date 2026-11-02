// Los overlays pueden superponerse: solo el último cierre restaura el scroll.
let bloqueos = 0;
let anterior = "";
export function bloquearScroll() {
  if (bloqueos++ === 0) {
    anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  let liberado = false;
  return () => {
    if (liberado) return;
    liberado = true;
    if (--bloqueos === 0) document.body.style.overflow = anterior;
  };
}
