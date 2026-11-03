const archivos = import.meta.glob("../assets/marca/*", {
  eager: true,
  query: "?url",
  import: "default",
});
export const isotipo = archivos["../assets/marca/isotipo-inacap.png"];
function buscarLogo(blanco) {
  const nombre = blanco ? "logo-inacap-blanco" : "logo-inacap";
  for (const extension of ["svg", "webp", "png"]) {
    const url = archivos[`../assets/marca/${nombre}.${extension}`];
    if (url) return url;
  }
}
export default function LogoInacap({ variante = "color" }) {
  const blanco = variante === "blanco";
  const preferido = buscarLogo(blanco);
  const src = preferido || (blanco ? buscarLogo(false) : undefined);
  return src ? (
    <img
      className={`logo-inacap${blanco && !preferido ? " logo-sobre-claro" : ""}`}
      src={src}
      alt="INACAP"
      width="1280"
      height="346"
      decoding="async"
    />
  ) : (
    <strong className={`logo-respaldo${blanco ? " logo-respaldo-blanco" : ""}`}>
      INACAP
    </strong>
  );
}
