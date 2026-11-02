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
  const usuario = {
    id: 1,
    nombre: "Ana Pérez",
    email: "ana@inacapmail.cl",
    rol: "ESTUDIANTE",
    carrera: { id: 1, nombre: "Ingeniería en Informática" },
  };
  const tesis = {
    id: 7,
    titulo: "Plataforma de aprendizaje colaborativo",
    autores: [{ nombre: "Ana Pérez", email: usuario.email }],
    anio: 2026,
    tipo: { id: 1, nombre: "Tesis" },
    carrera: usuario.carrera,
    resumen:
      "Una propuesta para conectar estudiantes y compartir conocimiento.",
    palabras_clave: ["educación"],
    estado: "PUBLICADA",
    materiales: [],
  };
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
      data = [{ ...usuario.carrera, permite_repositorio: true }];
    else if (path.endsWith("/catalogos/tipos/"))
      data = [{ id: 1, nombre: "Tesis" }];
    else if (path.endsWith("/catalogos/profesores-guia/"))
      data = [{ id: 1, nombre: "María Soto" }];
    else if (path.endsWith("/tesis/pendientes/"))
      data = { count: 1, results: [{ ...tesis, estado: "EN_REVISION" }] };
    else if (path.endsWith("/admin/autorizados/"))
      data = { count: 1, results: [{ ...usuario, activo: true }] };
    else if (path.endsWith("/admin/autorizados/1/"))
      data = { ...usuario, activo: false };
    else if (path.endsWith("/admin/autorizados/importar/"))
      data = { total: 1, creados: 1, actualizados: 0, errores: [] };
    else if (path.endsWith("/tesis/7/")) data = tesis;
    else if (path.endsWith("/tesis/") && req.method() === "POST") {
      assert.ok(req.postDataBuffer().includes(Buffer.from("documento.pdf")));
      subidas++;
      data = { ...tesis, estado: "EN_REVISION" };
    } else if (path.endsWith("/tesis/")) data = { count: 1, results: [tesis] };
    else if (path.endsWith("/tesis/mis-tesis/"))
      data = { count: 1, results: [tesis] };
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
  await page.getByLabel("Tipo de trabajo").selectOption("1");
  assert.ok(
    await page.getByRole("combobox", { name: /^Carrera/ }).isDisabled(),
  );
  await page.getByLabel("Profesor guía").selectOption("1");
  await page.getByLabel("Resumen", { exact: true }).fill(tesis.resumen);
  await page
    .getByPlaceholder("Escribe y presiona Enter o coma")
    .fill("educación");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Nombre completo").waitFor();
  assert.equal(
    await page.getByLabel("Nombre completo").inputValue(),
    usuario.nombre,
  );
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
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
  await page.goto("http://localhost:5173/revision");
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
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "lista.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("nombre,email\nAna,ana@inacapmail.cl"),
    });
  await page.getByRole("button", { name: "Importar archivo" }).click();
  await page.locator(".stats").waitFor();
  assert.deepEqual(fallos, []);
  console.log(
    "PASS: acceso protegido, correo institucional, código pegado, búsqueda URL, filtros, detalle, roles, subida multipart, refresh, PDF, revisión, importación y responsive.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
