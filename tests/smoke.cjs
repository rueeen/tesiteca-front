const assert = require("node:assert/strict");
const { navegador, instalarAPI } = require("./fixtures.cjs");
(async () => {
  const browser = await navegador();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const fallos = [];
    page.on("pageerror", (e) => fallos.push(e.message));
    const state = await instalarAPI(page, { sesion: false });
    const base = process.env.TEST_URL || "http://localhost:5173";
    await page.addInitScript(() => {
      if (!window.name) {
        localStorage.setItem("access", "antiguo");
        localStorage.setItem("refresh", "antiguo");
        window.name = "limpieza-comprobada";
      }
    });
    await page.goto(base + "/login?next=//evil.com");
    await page.getByLabel("Correo institucional").waitFor();
    assert.deepEqual(
      await page.evaluate(() => [
        localStorage.getItem("access"),
        localStorage.getItem("refresh"),
      ]),
      [null, null],
    );
    await page.getByLabel("Correo institucional").fill("ana@gmail.com");
    await page.getByRole("button", { name: "Recibir código" }).click();
    await page.getByRole("alert").waitFor();
    await page.getByLabel("Correo institucional").fill(state.usuario.email);
    await page.getByRole("button", { name: "Recibir código" }).click();
    await page.getByLabel("Dígito 1", { exact: true }).waitFor();
    await page.getByLabel("Dígito 1", { exact: true }).evaluate((el) => {
      const e = new Event("paste", { bubbles: true });
      Object.defineProperty(e, "clipboardData", {
        value: { getData: () => "123456" },
      });
      el.dispatchEvent(e);
    });
    await page
      .getByRole("button", { name: "Ingresar a la biblioteca" })
      .click();
    await page.getByRole("heading", { name: "1 resultados" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/");
    assert.deepEqual(
      await page.evaluate(() =>
        [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(
          (k) => /access|refresh|token/i.test(k),
        ),
      ),
      [],
    );
    assert.equal(
      await page.evaluate(() => document.cookie.includes("refresh=")),
      false,
    );
    const antes = state.refreshes;
    await page.reload();
    await page.getByRole("heading", { name: "1 resultados" }).waitFor();
    assert.equal(state.refreshes, antes + 1);
    state.invalidAccess = state.token;
    const renovaciones = state.refreshes;
    // Subir tesis carga tres catálogos en paralelo con el mismo cliente de la app.
    await page.getByRole('link',{name:'Subir tesis',exact:true}).click();
    await page.getByLabel('Título de la tesis').waitFor();
    assert.equal(state.refreshes, renovaciones + 1);
    await page.getByRole("link",{name:"Biblioteca",exact:true}).click();
    await page.getByLabel("Buscar tesis", { exact: true }).fill("aprendizaje");
    await page.waitForURL("**/*search=aprendizaje*");
    await page.getByRole("link", { name: "Ver tesis" }).click();
    await page
      .getByRole("heading", { name: state.detalle.titulo, level: 1 })
      .waitFor();
    await page
      .getByText("Disponible solo para estudiantes de", { exact: false })
      .waitFor();
    await page.getByRole("link", { name: "Leer tesis" }).click();
    await page.locator(".react-pdf__Page canvas").waitFor();
    await page.goto(base + "/tesis/404");
    await page
      .getByRole("heading", { name: "Esta tesis no existe o fue retirada" })
      .waitFor();
    assert.equal(
      await page.getByText("No Tesis matches", { exact: false }).count(),
      0,
    );
    await page.goto(base + "/subir");
    await page.getByLabel("Título de la tesis").fill("Nueva tesis");
    await page.getByLabel("Tipo de trabajo").selectOption("PROYECTO_TITULO");
    await page
      .getByLabel("Profesor guía")
      .fill("Profesor nuevo fuera del catálogo");
    await page.getByLabel("Resumen", { exact: true }).fill("Resumen de prueba");
    for (const p of ["a", "b"]) {
      await page.getByPlaceholder("Escribe y presiona Enter o coma").fill(p);
      await page.keyboard.press("Enter");
    }
    await page.getByRole("button", { name: "Continuar" }).click();
    assert.equal(
      await page.getByLabel("Nombre completo").inputValue(),
      state.usuario.nombre_completo,
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
    let enviada = false;
    state.validarSubida = (form) => {
      assert.deepEqual(JSON.parse(form.get("autores")), [
        {
          nombre_completo: state.usuario.nombre_completo,
          email: state.usuario.email,
        },
      ]);
      assert.equal(form.get("palabras_clave"), "a,b");
      assert.equal(
        form.get("repositorio_url"),
        "https://github.com/ana/proyecto",
      );
      assert.equal(
        form.get("profesor_guia"),
        "Profesor nuevo fuera del catálogo",
      );
      for (const k of [
        "sede",
        "publicar_directamente",
        "repositorio",
        "publicar",
      ])
        assert.equal(form.has(k), false);
      enviada = true;
    };
    await page.getByRole("button", { name: "Confirmar y enviar" }).click();
    await page
      .getByRole("heading", { name: "Tu tesis fue enviada a revisión" })
      .waitFor();
    assert.ok(enviada);
    state.usuario.rol = "COORDINADOR";
    await page.goto(base + "/subir");
    const carrera = page.getByRole("combobox", {
      name: "Carrera",
      exact: true,
    });
    await carrera.waitFor();
    assert.equal(await carrera.inputValue(), "1");
    assert.ok(await carrera.isDisabled());
    await page.goto(base + "/revision");
    await page.getByRole("button", { name: "Aprobar", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Tesis aprobada" })
      .waitFor();
    // Otra pestaña comparte solo la cookie; BroadcastChannel no transmite tokens.
    const otra = await page.context().newPage();
    await instalarAPI(otra, { baseURL: base });
    await otra.goto(base + "/");
    await otra.getByRole("heading", { name: "1 resultados" }).waitFor();
    await page
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .filter({ visible: true })
      .click();
    await page.getByLabel("Correo institucional").waitFor();
    assert.equal(state.logouts, 1);
    await otra.getByLabel("Correo institucional").waitFor();
    assert.deepEqual(
      await page.evaluate(() => [
        localStorage.getItem("access"),
        sessionStorage.getItem("access"),
      ]),
      [null, null],
    );
    // Una pestaña activa renueva antes de expirar; una sesión sin cookie vuelve al login.
    const pro = await context.newPage();
    await pro.clock.install();
    const proState = await instalarAPI(pro, { baseURL: base });
    proState.expSegundos = 61;
    await pro.goto(base + "/");
    await pro.getByRole("heading", { name: "1 resultados" }).waitFor();
    const inicio = proState.refreshes;
    proState.expSegundos = 3600;
    await pro.clock.runFor(2500);
    await pro.waitForTimeout(100);
    assert.ok(
      proState.refreshes > inicio,
      "Refresh proactivo antes del vencimiento",
    );
    await context.clearCookies();
    proState.invalidAccess = proState.token;
    await pro.getByRole("link", { name: "Mis tesis", exact: true }).click();
    await pro.getByLabel("Correo institucional").waitFor();
    await pro
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Tu sesión expiró" })
      .waitFor();
    assert.ok(
      new URL(pro.url()).searchParams.get("next").startsWith("/mis-tesis"),
    );
    assert.deepEqual(fallos, []);
    console.log(
      "PASS smoke: cookie httpOnly, memoria, restauración, single-flight, next seguro, logout entre pestañas, contrato multipart, PDF y toast de aprobación.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
