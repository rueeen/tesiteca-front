const archivos = import.meta.glob("../assets/marca/*", {
  eager: true,
  query: "?url",
  import: "default",
});
export const isotipo = archivos["../assets/marca/isotipo-inacap.png"];
export default function LogoInacap({ variante = "color" }) {
  const src =
    archivos[
      `../assets/marca/logo-inacap${variante === "blanco" ? "-blanco" : ""}.svg`
    ];
  return src ? (
    <img className="logo-inacap" src={src} alt="INACAP" />
  ) : (
    <strong className="logo-respaldo">INACAP</strong>
  );
}
