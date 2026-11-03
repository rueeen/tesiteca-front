const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("smol-toml");
const config = parse(fs.readFileSync("netlify.toml", "utf8"));
assert.equal(config.build.command, "npm run build");
assert.equal(config.build.publish, "dist");
assert.equal(config.build.environment.NODE_VERSION, "22");
const api = config.redirects.findIndex((r) => r.from === "/api/*"),
  spa = config.redirects.findIndex((r) => r.from === "/*");
assert.ok(api >= 0 && spa > api, "El proxy debe ir antes que la SPA");
assert.deepEqual(
  { ...config.redirects[api] },
  {
    from: "/api/*",
    to: "https://rvavalencia.pythonanywhere.com/api/:splat",
    status: 200,
    force: true,
    signed: "TESITECA_PROXY_SECRET",
  },
);
assert.equal(config.redirects[spa].to, "/index.html");
assert.equal(config.redirects[spa].status, 200);
assert.equal(fs.existsSync("public/_redirects"), false);
const produccion = Object.fromEntries(
  fs
    .readFileSync(".env.production", "utf8")
    .trim()
    .split(/\r?\n/)
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
assert.deepEqual(produccion, {
  VITE_API_URL: "/api",
  VITE_WS_URL: "",
  VITE_MAX_PDF_MB: "20",
});
assert.ok(!fs.readFileSync("public/_headers", "utf8").includes("wss" + "://"));
// El marcador se compone para no introducirlo en el propio código que inspecciona.
const marcador = ["US", "UARIO"].join("");
function archivos(dir, excluir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (excluir.has(e.name)) return [];
    return e.isDirectory() ? archivos(p, excluir) : e.isFile() ? [p] : [];
  });
}
for (const archivo of archivos(
  ".",
  new Set(["node_modules", "dist", ".git", "capturas"]),
)) {
  const contenido = fs.readFileSync(archivo);
  if (contenido.includes(0)) continue;
  assert.ok(
    !contenido.toString().includes(marcador),
    `Marcador de deploy pendiente en ${archivo}`,
  );
}
assert.ok(
  fs.existsSync("dist/index.html"),
  "La suite CSP debe construir dist antes de esta comprobación",
);
for (const archivo of archivos("dist", new Set())) {
  const contenido = fs.readFileSync(archivo).toString();
  assert.ok(!contenido.includes(marcador), `Marcador en ${archivo}`);
  assert.ok(
    !new RegExp("wss?" + "://").test(contenido),
    `WebSocket inesperado en el bundle ${archivo}`,
  );
}
console.log(
  "PASS Netlify: proxy firmado y ordenado, variables públicas, CSP y bundle sin destinos WS ni marcadores.",
);
