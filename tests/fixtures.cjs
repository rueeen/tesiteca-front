const assert = require("node:assert/strict");
const { existsSync } = require("node:fs");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");
const regionArica = { id: 15, nombre: "Arica y Parinacota" };
const regionSantiago = { id: 13, nombre: "Metropolitana" };
const niveles = [
  { id: 1, nombre: "Ingeniería" },
  { id: 2, nombre: "Técnico de Nivel Superior" },
];
const sedesBase = [
  {
    id: 1,
    nombre: "Arica",
    ciudad: "Arica",
    region: regionArica,
    orden: 1,
    activa: true,
  },
  {
    id: 2,
    nombre: "Santiago Centro",
    ciudad: "Santiago",
    region: regionSantiago,
    orden: 2,
    activa: true,
  },
];
const carrera = {
  id: 1,
  nombre: "Ingeniería en Informática",
  codigo: "IEI",
  area: 1,
  permite_repositorio: true,
  nivel_formacion: niveles[0],
  duracion_semestres: 8,
};
const usuario = {
  id: 1,
  nombre_completo: "Ana Pérez",
  email: "ana@inacapmail.cl",
  rut: "11111111-1",
  rol: "ESTUDIANTE",
  carrera,
  area: { id: 1, nombre: "Informática" },
  sede: sedesBase[0],
  estado_cuenta: "ACTIVA",
};
const detalle = {
  id: 7,
  titulo: "Plataforma de aprendizaje colaborativo",
  resumen: "Una propuesta para compartir conocimiento.",
  palabras_clave: ["a", "b"],
  tipo: { id: "PROYECTO_TITULO", nombre: "Proyecto de título" },
  anio: 2026,
  periodo: { id: 1, nombre: "Primer semestre" },
  periodo_texto: "2026 · Primer semestre",
  carrera,
  sede: usuario.sede,
  profesor_guia: "María Soto",
  estado: "EN_REVISION",
  estado_nombre: "En revisión",
  observacion_revision: "",
  subido_por: {
    id: 1,
    nombre_completo: usuario.nombre_completo,
    email: usuario.email,
  },
  revisado_por: null,
  fecha_publicacion: null,
  num_paginas: 1,
  tamano_bytes: 100,
  creado: "2026-11-01T12:00:00Z",
  actualizado: "2026-11-02T12:00:00Z",
  autores: [{ nombre_completo: usuario.nombre_completo, email: usuario.email }],
  materiales: [
    {
      id: 3,
      tipo: "REPOSITORIO",
      titulo: "Código del proyecto",
      descripcion: "Repositorio",
      solo_carrera: true,
      restringido: true,
      creado: "2026-11-02T12:00:00Z",
    },
  ],
  pdf: "/api/tesis/7/pdf/",
  puede_editar: true,
  puede_revisar: false,
  puede_reenviar: false,
};
const paginado = (items) => ({
  count: items.length,
  next: null,
  previous: null,
  results: items,
});
function pdfMinimo() {
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>",
    "<< /Length 0 >>\nstream\n\nendstream",
  ];
  let pdf = "%PDF-1.4\n",
    offsets = [];
  objetos.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const inicio = Buffer.byteLength(pdf);
  return Buffer.from(
    pdf +
      `xref\n0 5\n0000000000 65535 f \n${offsets.map((n) => String(n).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${inicio}\n%%EOF`,
  );
}
async function navegador() {
  return chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
}
async function instalarAPI(
  page,
  { baseURL, sesion = true, rol = "ESTUDIANTE" } = {},
) {
  assert.ok(baseURL, "Cada prueba debe usar la URL de su propio servidor");
  const state = {
    usuario: structuredClone({ ...usuario, rol }),
    detalle: structuredClone(detalle),
    refreshes: 0,
    logouts: 0,
    tickets: 0,
    resumenes: 0,
    requests: [],
    notificaciones: [],
    noLeidas: 0,
    ultima: 0,
    invalidAccess: null,
    catalogoFalla: false,
    renderInvalido: false,
    validarSubida: null,
    token: "",
    expSegundos: 3600,
    totalResultados: 1,
    transformarListado: null,
    loginStatus: 0,
    loginCodigo: "",
    loginMotivo: "Faltan antecedentes académicos.",
    logins: 0,
    registros: 0,
    ultimoRegistro: null,
    reenviados: 0,
    recuperaciones: 0,
    restablecimientos: 0,
    verificaciones: 0,
    verificarEstado: "PENDIENTE_APROBACION",
    verificarStatus: 0,
    cambiosPassword: 0,
    accessCambio: "",
    sedes: structuredClone(sedesBase),
    solicitudes: [1, 2].map((id) => ({
      id,
      usuario: {
        id: id + 10,
        email: `solicitud${id}@inacapmail.cl`,
        nombre_completo: `Solicitante ${id}`,
        rut: "12345678-5",
      },
      rol_solicitado: "ESTUDIANTE",
      correo_validado: true,
      estado_cuenta: "PENDIENTE_APROBACION",
      carrera,
      sede: sedesBase[0],
      mensaje: "Solicito acceso a la biblioteca.",
      estado: "PENDIENTE",
      motivo_rechazo: "",
      creada: "2026-11-03T12:00:00Z",
      revisada_por: null,
      revisada_en: null,
      puede_cambiar_rol: rol === "ADMIN",
    })),
    ultimaResolucion: null,

    subidas: 0,
    subidaStatus: 0,
    detalleStatus: 0,
    pdfStatus: 0,
    resumenStatus: 0,
    saludStatus: 0,
    salud: { estado: "ok", version: "1.2.3", via_proxy: true },
  };
  if (sesion)
    await page.context().addCookies([
      {
        name: "refresh",
        value: "demo",
        url: baseURL,
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
  const token = () =>
    `${Buffer.from("{}").toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + state.expSegundos, version: state.refreshes })).toString("base64url")}.demo`;
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname;
    state.requests.push({ path, method: req.method(), headers: req.headers() });
    const responder = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (path.endsWith("/salud/"))
      return responder(
        state.saludStatus ? { detail: "Unavailable" } : state.salud,
        state.saludStatus || 200,
      );
    if (path.endsWith("/auth/refresh/")) {
      state.refreshes++;
      assert.equal(req.headers()["x-requested-with"], "XMLHttpRequest");
      if (!req.headers().cookie?.includes("refresh=demo"))
        return route.fulfill({ status: 204, body: "" });
      await new Promise((r) => setTimeout(r, 30));
      state.token = token();
      return responder({ access: state.token, usuario: state.usuario });
    }
    if (path.endsWith("/auth/login/")) {
      state.logins++;
      if (state.loginStatus)
        return responder(
          {
            detail: "Información interna que no debe revelarse.",
            ...(state.loginStatus === 403
              ? { codigo: state.loginCodigo, motivo: state.loginMotivo }
              : {}),
          },
          state.loginStatus,
        );
      assert.ok(req.postDataJSON().password);
      await page.context().addCookies([
        {
          name: "refresh",
          value: "demo",
          url: baseURL,
          httpOnly: true,
          sameSite: "Strict",
        },
      ]);
      state.token = token();
      return responder({ access: state.token, usuario: state.usuario });
    }
    if (path.endsWith("/auth/registro/")) {
      state.registros++;
      state.ultimoRegistro = req.postDataJSON();
      return responder({ detail: "Solicitud recibida." }, 201);
    }
    if (path.endsWith("/auth/reenviar-verificacion/")) {
      state.reenviados++;
      return responder({ detail: "Mensaje genérico." });
    }
    if (path.endsWith("/auth/verificar-correo/")) {
      state.verificaciones++;
      return responder(
        state.verificarStatus
          ? { detail: "El enlace expiró." }
          : { estado: state.verificarEstado },
        state.verificarStatus || 200,
      );
    }
    if (path.endsWith("/auth/recuperar/")) {
      state.recuperaciones++;
      return responder({ detail: "Mensaje genérico." });
    }
    if (path.endsWith("/auth/restablecer/")) {
      state.restablecimientos++;
      assert.ok(req.postDataJSON().uid);
      assert.ok(req.postDataJSON().token);
      return responder({ detail: "Contraseña actualizada." });
    }
    if (path.endsWith("/auth/cambiar-password/")) {
      state.cambiosPassword++;
      const payload = Buffer.from(
        JSON.stringify({
          exp: Math.floor(Date.now() / 1000) + 3600,
          version: `password-${state.cambiosPassword}`,
        }),
      ).toString("base64url");
      state.accessCambio = `e30.${payload}.demo`;
      state.token = state.accessCambio;
      return responder({ access: state.accessCambio });
    }
    if (path.endsWith("/auth/logout/")) {
      assert.equal(req.headers()["x-requested-with"], "XMLHttpRequest");
      state.logouts++;
      await page.context().clearCookies({ name: "refresh" });
      return responder({});
    }
    if (
      state.invalidAccess &&
      req.headers().authorization === `Bearer ${state.invalidAccess}`
    )
      return responder({ detail: "Expired" }, 401);
    if (path.endsWith("/auth/me/")) return responder(state.usuario);
    if (path.endsWith("/catalogos/carreras/"))
      return responder([
        carrera,
        {
          ...carrera,
          id: 2,
          nombre: "Técnico en Informática",
          area: 2,
          nivel_formacion: niveles[1],
          duracion_semestres: 4,
        },
      ]);
    if (path.endsWith("/catalogos/sedes/"))
      return responder(state.sedes.filter((s) => s.activa));
    if (path.endsWith("/catalogos/regiones/"))
      return responder([regionArica, regionSantiago]);
    if (path.endsWith("/catalogos/niveles/")) return responder(niveles);
    if (path.endsWith("/admin/sedes/") && req.method() === "POST") {
      const body = req.postDataJSON();
      state.sedes.push({
        ...body,
        id: state.sedes.length + 1,
        region: [regionArica, regionSantiago].find((r) => r.id === body.region),
      });
      return responder(state.sedes.at(-1), 201);
    }
    if (path.endsWith("/admin/sedes/")) return responder(paginado(state.sedes));
    if (/\/admin\/sedes\/\d+\/$/.test(path)) {
      const id = Number(path.split("/").at(-2));
      const body = req.postDataJSON();
      const s = state.sedes.find((s) => s.id === id);
      Object.assign(
        s,
        body,
        body.region
          ? {
              region: [regionArica, regionSantiago].find(
                (r) => r.id === body.region,
              ),
            }
          : {},
      );
      return responder(s);
    }
    if (path.endsWith("/solicitudes/resumen/"))
      return responder({
        pendientes: state.solicitudes.filter((s) => s.estado === "PENDIENTE")
          .length,
      });
    if (path.endsWith("/solicitudes/"))
      return responder(
        paginado(
          state.solicitudes.filter(
            (s) =>
              (!url.searchParams.get("estado") ||
                s.estado === url.searchParams.get("estado")) &&
              (!url.searchParams.get("carrera") ||
                String(s.carrera?.id) === url.searchParams.get("carrera")) &&
              (!url.searchParams.get("sede") ||
                String(s.sede?.id) === url.searchParams.get("sede")) &&
              (!url.searchParams.get("search") ||
                s.usuario.nombre_completo
                  .toLowerCase()
                  .includes(url.searchParams.get("search").toLowerCase())),
          ),
        ),
      );
    if (/\/solicitudes\/\d+\/(aprobar|rechazar)\/$/.test(path)) {
      const id = Number(path.split("/").at(-3)),
        accion = path.split("/").at(-2);
      const body = req.postDataJSON();
      if (accion === "rechazar" && !body.motivo?.trim())
        return responder({ motivo: ["Es obligatorio."] }, 400);
      state.ultimaResolucion = { id, accion, body };
      const s = state.solicitudes.find((s) => s.id === id);
      s.estado = accion === "aprobar" ? "APROBADA" : "RECHAZADA";
      s.motivo_rechazo = body.motivo || "";
      if (accion === "aprobar")
        s.estado_cuenta = s.correo_validado
          ? "ACTIVA"
          : "PENDIENTE_VERIFICACION";
      return responder(s);
    }
    if (path.endsWith("/catalogos/tipos/"))
      return responder([{ id: "TESIS", nombre: "Tesis" }, detalle.tipo]);
    if (path.endsWith("/catalogos/profesores-guia/"))
      return responder(
        state.catalogoFalla ? {} : ["María Soto"],
        state.catalogoFalla ? 503 : 200,
      );
    if (path.endsWith("/notificaciones/resumen/")) {
      state.resumenes++;
      if (state.resumenStatus)
        return responder({ detail: "Unavailable" }, state.resumenStatus);
      return responder({ no_leidas: state.noLeidas, ultima_id: state.ultima });
    }
    if (path.endsWith("/notificaciones/ticket/")) {
      state.tickets++;
      return responder({ ticket: `ticket-${state.tickets}`, expira_en: 60 });
    }
    if (path.endsWith("/notificaciones/leer-todas/")) {
      state.notificaciones.forEach((n) => (n.leida = true));
      state.noLeidas = 0;
      return responder({});
    }
    if (/\/notificaciones\/\d+\/leer\/$/.test(path)) {
      const n = state.notificaciones.find((n) => path.includes(`/${n.id}/`));
      if (n && !n.leida) {
        n.leida = true;
        state.noLeidas = Math.max(0, state.noLeidas - 1);
      }
      return responder({});
    }
    if (path.endsWith("/notificaciones/"))
      return responder(
        paginado(
          state.notificaciones.filter(
            (n) =>
              (!url.searchParams.has("desde_id") ||
                n.id > Number(url.searchParams.get("desde_id"))) &&
              (url.searchParams.get("leida") !== "false" || !n.leida),
          ),
        ),
      );
    if (path.endsWith("/tesis/7/pdf/") && state.pdfStatus)
      return responder({ detail: "Proxy timeout" }, state.pdfStatus);
    if (path.endsWith("/tesis/7/pdf/"))
      return route.fulfill({
        contentType: "application/pdf",
        body: pdfMinimo(),
      });
    if (path.includes("/tesis/404/"))
      return responder({ detail: "No Tesis matches the given query." }, 404);
    if (path.endsWith("/tesis/7/") && state.detalleStatus)
      return responder(
        { detail: "Acceso solo a través del sitio oficial" },
        state.detalleStatus,
      );
    if (path.endsWith("/tesis/7/"))
      return responder(
        state.renderInvalido
          ? { ...state.detalle, palabras_clave: "incorrecto" }
          : state.detalle,
      );
    if (path.endsWith("/tesis/7/aprobar/")) {
      state.detalle.estado = "PUBLICADA";
      state.detalle.estado_nombre = "Publicada";
      return responder(state.detalle);
    }
    if (path.endsWith("/tesis/7/rechazar/")) {
      state.detalle.estado = "RECHAZADA";
      state.detalle.estado_nombre = "Rechazada";
      return responder(state.detalle);
    }
    if (path.endsWith("/tesis/7/reenviar/")) {
      state.detalle.estado = "EN_REVISION";
      state.detalle.estado_nombre = "En revisión";
      state.detalle.puede_reenviar = false;
      return responder(state.detalle);
    }
    if (path.endsWith("/tesis/mis-tesis/"))
      return responder(paginado([state.detalle]));
    if (path.endsWith("/tesis/pendientes/"))
      return responder(
        paginado(
          state.detalle.estado === "EN_REVISION"
            ? [{ ...state.detalle, puede_revisar: true }]
            : [],
        ),
      );
    if (path.endsWith("/tesis/") && req.method() === "POST") {
      state.subidas++;
      const form = await new Response(req.postDataBuffer(), {
        headers: { "content-type": req.headers()["content-type"] },
      }).formData();
      if (state.validarSubida) state.validarSubida(form);
      if (state.subidaStatus)
        return responder({ detail: "Gateway Timeout" }, state.subidaStatus);
      return responder(state.detalle);
    }
    if (path.endsWith("/tesis/"))
      return responder(
        paginado(
          Array.from({ length: state.totalResultados }, (_, i) => ({
            id: detalle.id + i,
            titulo: detalle.titulo,
            resumen: detalle.resumen,
            autores: detalle.autores.map((a) => a.nombre_completo),
            carrera,
            anio: 2026,
            tipo: detalle.tipo,
            profesor_guia: detalle.profesor_guia,
            palabras_clave: detalle.palabras_clave,
            num_paginas: 1,
            tiene_repositorio: true,
            periodo: state.detalle.periodo,
            periodo_texto: state.detalle.periodo_texto,
            sede: state.detalle.sede,
          })).map((t) =>
            state.transformarListado
              ? state.transformarListado(structuredClone(t))
              : t,
          ),
        ),
      );
    if (path.endsWith("/admin/autorizados/"))
      return responder(paginado([{ ...state.usuario, activo: true }]));
    if (path.endsWith("/admin/autorizados/importar/"))
      return responder({ total: 1, creados: 1, actualizados: 0, errores: [] });
    if (path.endsWith("/admin/autorizados/1/"))
      return responder({ ...state.usuario, activo: false });
    return responder({});
  });
  return state;
}
async function servidor({ port = 5180, env = {}, preview = false } = {}) {
  const cwd = require("node:path").resolve(__dirname, "..");
  // No heredar una configuración WS/API ajena a la suite, ni la de un .env local.
  const entorno = {
    ...process.env,
    VITE_API_URL: "/api",
    VITE_WS_URL: "",
    ...env,
  };
  if (preview)
    await new Promise((resolve, reject) => {
      const build = spawn(
        process.execPath,
        ["node_modules/vite/bin/vite.js", "build"],
        { cwd, env: entorno, stdio: ["ignore", "pipe", "pipe"] },
      );
      let output = "";
      build.stdout.on("data", (b) => (output += b));
      build.stderr.on("data", (b) => (output += b));
      build.on("error", reject);
      build.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(Error(`Build falló (${code}): ${output}`)),
      );
    });
  const child = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      ...(preview ? ["preview"] : []),
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    { cwd, env: entorno, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "",
    fallo;
  child.stdout.on("data", (b) => (output += b));
  child.stderr.on("data", (b) => (output += b));
  child.on("error", (e) => (fallo = e));
  const alSalir = () => child.kill();
  process.once("exit", alSalir);
  const close = async () => {
    process.removeListener("exit", alSalir);
    if (child.exitCode !== null || child.signalCode !== null) return;
    await new Promise((resolve) => {
      const limite = setTimeout(() => child.kill("SIGKILL"), 2000);
      child.once("exit", () => {
        clearTimeout(limite);
        resolve();
      });
      child.kill();
    });
  };
  const url = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    if (fallo || child.exitCode !== null) {
      await close();
      throw fallo || Error(output);
    }
    try {
      if (output.includes("Local:")) {
        const r = await fetch(url);
        if (r.ok) return { url, close };
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  await close();
  throw Error("Vite no arrancó: " + output);
}
module.exports = {
  navegador,
  instalarAPI,
  servidor,
  usuario,
  carrera,
  detalle,
};
