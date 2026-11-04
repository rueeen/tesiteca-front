import React from "react";
import { recargarPorChunk } from "./utils/lazyConReintento";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource-variable/inter";
import "./styles/global.css";
import { capturarEnlaceCuenta } from "./utils/enlacesCuenta";
import { isotipo } from "./components/LogoInacap";
window.addEventListener("vite:preloadError", (evento) => {
  if (recargarPorChunk(evento.payload)) evento.preventDefault();
});
capturarEnlaceCuenta();
if (isotipo) {
  const icono =
    document.querySelector('link[rel="icon"]') ||
    document.createElement("link");
  icono.rel = "icon";
  icono.type = "image/png";
  icono.href = isotipo;
  if (!icono.isConnected) document.head.appendChild(icono);
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
