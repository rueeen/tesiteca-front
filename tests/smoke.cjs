// Pruebas del frontend con una API simulada: no requieren credenciales reales.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  const fallos = [];
  page.on("pageerror", (e) => fallos.push(e.message));
  const carrera = {
    id: 1,
    nombre: "Ingeniería en Informática",
    codigo: "IEI",
    area: 1,
    permite_repositorio: true,
  };
  const otraCarrera = {
    id: 2,
    nombre: "Informática de otra área",
    codigo: "OTR",
    area: 2,
    permite_repositorio: false,
  };
  const usuario = {
    id: 1,
    nombre_completo: "Ana Pérez",
    email: "ana@inacapmail.cl",
    rut: "11111111-1",
    rol: "ESTUDIANTE",
    carrera,
    area: { id: 1, nombre: "Informática" },
    sede: { id: 1, nombre: "Arica" },
  };
  const tesis = {
    id: 7,
    titulo: "Plataforma de aprendizaje colaborativo",
    autores: [
      { nombre_completo: usuario.nombre_completo, email: usuario.email },
    ],
    anio: 2026,
    semestre: 1,
    tipo: { id: "PROYECTO_TITULO", nombre: "Proyecto de título" },
    carrera,
    sede: usuario.sede,
    profesor_guia: "María Soto",
    resumen:
      "Una propuesta para conectar estudiantes y compartir conocimiento.",
    palabras_clave: ["a", "b"],
    estado: "PUBLICADA",
    estado_nombre: "Publicada",
    observacion_revision: "",
    subido_por: {
      id: usuario.id,
      nombre_completo: usuario.nombre_completo,
      email: usuario.email,
    },
    revisado_por: null,
    fecha_publicacion: "2026-11-02T12:00:00Z",
    num_paginas: 1,
    tamano_bytes: 100,
    creado: "2026-11-01T12:00:00Z",
    actualizado: "2026-11-02T12:00:00Z",
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
    puede_editar: false,
    puede_revisar: false,
    puede_reenviar: false,
  };
  // El listado usa autores como strings; el detalle y las listas privadas usan objetos.
  const itemListado = () => ({
    id: tesis.id,
    titulo: tesis.titulo,
    resumen: tesis.resumen,
    autores: tesis.autores.map((a) => a.nombre_completo),
    carrera: tesis.carrera,
    anio: tesis.anio,
    tipo: tesis.tipo,
    profesor_guia: tesis.profesor_guia,
    palabras_clave: tesis.palabras_clave,
    num_paginas: tesis.num_paginas,
    tiene_repositorio: true,
  });
  const paginado = (results) => ({
    count: results.length,
    next: null,
    previous: null,
    results,
  });
  let fallaProfesores = false,
    detalleInvalido = false,
    errorAutores = true,
    reenviadas = 0;
  let consultas = [],
    subidas = 0,
    refreshes = 0,
    expirar = false;
  await page.route("http://localhost:8000/api/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname;
    consultas.push(url);
    if (req.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
      });
    if (path.endsWith("/tesis/7/pdf/")) {
      const objetos = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>",
        "<< /Length 0 >>\nstream\n\nendstream",
      ];
      let pdf = "%PDF-1.4\n",
        offsets = [0];
      objetos.forEach((o, i) => {
        offsets.push(Buffer.byteLength(pdf));
        pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
      });
      const start = Buffer.byteLength(pdf);
      pdf += `xref\n0 5\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
        .join(
          "",
        )}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
      return route.fulfill({
        contentType: "application/pdf",
        headers: { "access-control-allow-origin": "*" },
        body: Buffer.from(pdf),
      });
    }
    let data = {};
    let status = 200;
    if (path.endsWith("/auth/solicitar-codigo/"))
      data = {
        mensaje: "Si tu correo está autorizado, recibirás un código de acceso.",
      };
    else if (path.endsWith("/auth/verificar-codigo/"))
      data = { access: "access-test", refresh: "refresh-test", usuario };
    else if (path.endsWith("/auth/refresh/")) {
      refreshes++;
      expirar = false;
      data = { access: "access-renovado" };
    } else if (
      expirar &&
      req.headers().authorization === "Bearer access-test"
    ) {
      status = 401;
      data = { detail: "Expirado" };
    } else if (path.endsWith("/auth/me/")) data = usuario;
    else if (path.endsWith("/catalogos/carreras/"))
      data = [carrera, otraCarrera];
    else if (path.endsWith("/catalogos/tipos/"))
      data = [
        { id: "TESIS", nombre: "Tesis" },
        { id: "PROYECTO_TITULO", nombre: "Proyecto de título" },
      ];
    else if (path.endsWith("/catalogos/profesores-guia/")) {
      if (fallaProfesores) {
        status = 503;
        data = { detail: "Catálogo temporalmente no disponible" };
      } else data = ["María Soto"];
    } else if (path.endsWith("/tesis/pendientes/"))
      data = paginado([
        {
          ...tesis,
          estado: "EN_REVISION",
          estado_nombre: "En revisión",
          puede_revisar: true,
        },
      ]);
    else if (path.endsWith("/admin/autorizados/"))
      data = paginado([{ ...usuario, activo: true }]);
    else if (path.endsWith("/admin/autorizados/1/"))
      data = { ...usuario, activo: false };
    else if (path.endsWith("/admin/autorizados/importar/"))
      data = { total: 1, creados: 1, actualizados: 0, errores: [] };
    else if (path.endsWith("/tesis/7/reenviar/")) {
      reenviadas++;
      tesis.estado = "EN_REVISION";
      tesis.estado_nombre = "En revisión";
      tesis.puede_reenviar = false;
      data = tesis;
    } else if (path.endsWith("/tesis/7/"))
      data = detalleInvalido
        ? { ...tesis, palabras_clave: "contrato incorrecto" }
        : tesis;
    else if (path.endsWith("/tesis/") && req.method() === "POST") {
      const formData = await new Response(req.postDataBuffer(), {
        headers: { "content-type": req.headers()["content-type"] },
      }).formData();
      assert.deepEqual(JSON.parse(formData.get("autores")), [
        { nombre_completo: usuario.nombre_completo, email: usuario.email },
      ]);
      assert.equal(formData.get("palabras_clave"), "a,b");
      assert.equal(
        formData.get("repositorio_url"),
        "https://github.com/ana/proyecto",
      );
      assert.equal(
        formData.get("profesor_guia"),
        "Profesor nuevo fuera del catálogo",
      );
      assert.equal(formData.get("tipo"), "PROYECTO_TITULO");
      assert.equal(formData.get("pdf").name, "documento.pdf");
      for (const campo of [
        "sede",
        "publicar_directamente",
        "repositorio",
        "publicar",
      ])
        assert.equal(formData.has(campo), false, `No debe enviarse ${campo}`);
      if (errorAutores) {
        errorAutores = false;
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({
            autores: [{ nombre_completo: ["Revisa el nombre del autor."] }],
          }),
        });
      }
      subidas++;
      data = { ...tesis, estado: "EN_REVISION", estado_nombre: "En revisión" };
    } else if (path.endsWith("/tesis/")) data = paginado([itemListado()]);
    else if (path.endsWith("/tesis/mis-tesis/")) data = paginado([tesis]);
    return route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(data),
    });
  });
  console.log("login");
  await page.goto("http://localhost:5173/");
  await page.waitForURL("**/login");
  await page.getByLabel("Correo institucional").fill("ana@gmail.com");
  await page.getByRole("button", { name: "Recibir código" }).click();
  await page.getByRole("alert").waitFor();
  await page.getByLabel("Correo institucional").fill(usuario.email);
  await page.getByRole("button", { name: "Recibir código" }).click();
  await page.getByLabel("Dígito 1", { exact: true }).waitFor();
  await page.getByLabel("Dígito 1", { exact: true }).evaluate((el) => {
    const e = new Event("paste", { bubbles: true });
    Object.defineProperty(e, "clipboardData", {
      value: { getData: () => "123456" },
    });
    el.dispatchEvent(e);
  });
  await page.getByRole("button", { name: "Ingresar a la biblioteca" }).click();
  await page.getByRole("heading", { name: "1 resultados" }).waitFor();
  await page.getByLabel("Buscar tesis", { exact: true }).fill("aprendizaje");
  await page.waitForURL("**/*search=aprendizaje*");
  await page.waitForTimeout(500);
  assert.ok(
    consultas.some((u) => u.searchParams.get("search") === "aprendizaje"),
  );
  await page.getByLabel("Buscar también dentro del contenido").click();
  await page.waitForURL("**/*en_contenido=true*");
  await page.waitForFunction(
    () => document.querySelector(".search-panel input[type=checkbox]").checked,
  );
  await page.getByRole("link", { name: "Ver tesis" }).click();
  await page.getByRole("heading", { name: tesis.titulo, level: 1 }).waitFor();
  assert.equal(await page.getByRole("link", { name: "Leer tesis" }).count(), 1);
  assert.ok(
    (await page.locator(".detail .lead").innerText()).includes(
      usuario.nombre_completo,
    ),
  );
  assert.equal(await page.locator(".detail .tags a").count(), 2);
  await page
    .getByText("🔒 Disponible solo para estudiantes de", { exact: false })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Abrir repositorio" }).count(),
    0,
  );
  console.log("pdf");
  await page.getByRole("link", { name: "Leer tesis" }).click();
  await page.locator(".react-pdf__Page canvas").waitFor();
  assert.equal(
    await page.getByRole("button", { name: /descargar|imprimir/i }).count(),
    0,
  );
  await page.goto("http://localhost:5173/revision");
  await page.getByRole("heading", { name: "No tienes permiso" }).waitFor();
  console.log("upload");
  await page.goto("http://localhost:5173/subir");
  await page.getByLabel("Título de la tesis").fill(tesis.titulo);
  await page.getByLabel("Tipo de trabajo").selectOption("PROYECTO_TITULO");
  assert.ok(
    await page.getByRole("combobox", { name: /^Carrera/ }).isDisabled(),
  );
  await page
    .getByLabel("Profesor guía")
    .fill("Profesor nuevo fuera del catálogo");
  await page.getByLabel("Resumen", { exact: true }).fill(tesis.resumen);
  await page.getByPlaceholder("Escribe y presiona Enter o coma").fill("a");
  await page.keyboard.press("Enter");
  await page.getByPlaceholder("Escribe y presiona Enter o coma").fill("b");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Nombre completo").waitFor();
  assert.equal(
    await page.getByLabel("Nombre completo").inputValue(),
    usuario.nombre_completo,
  );
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "documento.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF"),
  });
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByLabel("Repositorio GitHub")
    .fill("https://github.com/ana/proyecto");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar y enviar" }).click();
  await page
    .getByText("autores[0].nombre_completo: Revisa el nombre del autor.", {
      exact: false,
    })
    .waitFor();
  assert.equal(
    await page.getByText("[object Object]", { exact: false }).count(),
    0,
  );
  await page.getByRole("button", { name: "Confirmar y enviar" }).click();
  await page
    .getByRole("heading", { name: "Tu tesis fue enviada a revisión" })
    .waitFor();
  assert.equal(subidas, 1);
  console.log("refresh");
  expirar = true;
  await page.goto("http://localhost:5173/");
  await page.getByRole("heading", { name: "1 resultados" }).waitFor();
  assert.equal(refreshes, 1);
  expirar = true;
  await page.evaluate(async () => {
    localStorage.setItem("access", "access-test");
    const { default: api } = await import("/src/api.js");
    await Promise.all([
      api.get("/tesis/"),
      api.get("/catalogos/carreras/"),
      api.get("/catalogos/tipos/"),
    ]);
  });
  assert.equal(refreshes, 2);
  console.log("responsive");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:5173/");
  await page.getByRole("heading", { name: "1 resultados" }).waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({ path: "/tmp/tesiteca-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({ path: "/tmp/tesiteca-desktop.png", fullPage: true });
  console.log("admin");
  usuario.rol = "COORDINADOR";
  await page.goto("http://localhost:5173/subir");
  const carreraCoordinador = page.getByRole("combobox", {
    name: "Carrera",
    exact: true,
  });
  await carreraCoordinador.waitFor();
  assert.equal(await carreraCoordinador.inputValue(), "1");
  assert.ok(await carreraCoordinador.isDisabled());
  await page.goto("http://localhost:5173/revision");
  await page.getByText("Subida por Ana Pérez", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Rechazar", exact: true }).click();
  await page
    .getByLabel("Observación obligatoria")
    .fill("Completar las referencias bibliográficas.");
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Tesis rechazada." })
    .waitFor();
  await page.goto("http://localhost:5173/autorizados");
  await page.getByRole("switch").waitFor();
  await page.getByRole("switch").click();
  await page.locator("input[type=file]").setInputFiles({
    name: "lista.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("nombre,email\nAna,ana@inacapmail.cl"),
  });
  await page.getByRole("button", { name: "Importar archivo" }).click();
  await page.locator(".stats").waitFor();
  const fila = page.getByRole("row").filter({ hasText: usuario.email });
  assert.ok((await fila.innerText()).includes(usuario.nombre_completo));
  assert.ok((await fila.innerText()).includes(carrera.nombre));
  assert.ok((await fila.innerText()).includes("Coordinador"));
  usuario.rol = "DIRECTOR";
  usuario.carrera = null;
  await page.goto("http://localhost:5173/subir");
  const selector = page.getByRole("combobox", { name: "Carrera", exact: true });
  await selector.waitFor();
  assert.equal(await selector.locator("option").count(), 2);
  assert.ok(!(await selector.isDisabled()));
  await page.getByText("Director académico", { exact: true }).waitFor();
  usuario.rol = "ADMIN";
  await page.goto("http://localhost:5173/subir");
  await selector.waitFor();
  assert.equal(await selector.locator("option").count(), 3);
  usuario.carrera = carrera;
  usuario.rol = "ESTUDIANTE";
  tesis.puede_editar = true;
  tesis.puede_reenviar = true;
  tesis.estado = "RECHAZADA";
  tesis.estado_nombre = "Rechazada";
  tesis.observacion_revision = "Corregir referencias.";
  tesis.materiales = [
    {
      ...tesis.materiales[0],
      restringido: false,
      url: "https://github.com/ana/existente",
    },
  ];
  await page.goto("http://localhost:5173/tesis/7/editar");
  await page.getByLabel("Título de la tesis").waitFor();
  assert.equal(
    await page.getByLabel("Tipo de trabajo").inputValue(),
    "PROYECTO_TITULO",
  );
  assert.equal(
    await page.getByLabel("Profesor guía").inputValue(),
    "María Soto",
  );
  await page.getByRole("button", { name: "Continuar" }).click();
  assert.equal(
    await page.getByLabel("Nombre completo").inputValue(),
    usuario.nombre_completo,
  );
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  assert.equal(
    await page.getByLabel("Repositorio GitHub").inputValue(),
    "https://github.com/ana/existente",
  );
  await page.goto("http://localhost:5173/mis-tesis");
  await page.getByText("Corregir referencias.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Reenviar", exact: true }).click();
  await page.getByText("En revisión", { exact: true }).waitFor();
  assert.equal(reenviadas, 1);
  fallaProfesores = true;
  await page.goto("http://localhost:5173/?tipo=PROYECTO_TITULO");
  await page
    .getByText("No se pudieron cargar: profesores.", { exact: false })
    .waitFor();
  assert.equal(
    await page
      .getByRole("combobox", { name: "Tipo de trabajo" })
      .locator("option")
      .count(),
    3,
  );
  assert.equal(
    await page
      .getByRole("combobox", { name: "Carrera", exact: false })
      .locator("option")
      .count(),
    3,
  );
  await page
    .getByRole("button", { name: "Quitar Tipo" })
    .filter({ hasText: "Proyecto de título" })
    .waitFor();
  fallaProfesores = false;
  detalleInvalido = true;
  await page.goto("http://localhost:5173/tesis/7");
  await page
    .getByRole("heading", { name: "Algo salió mal al mostrar esta página" })
    .waitFor();
  detalleInvalido = false;
  await page
    .getByRole("link", { name: "Volver a la biblioteca", exact: true })
    .click();
  await page.getByRole("heading", { name: "1 resultados" }).waitFor();
  assert.deepEqual(fallos, []);
  console.log(
    "PASS: acceso protegido, correo institucional, código pegado, búsqueda URL, filtros, detalle, roles, subida multipart, refresh, PDF, revisión, importación y responsive.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
