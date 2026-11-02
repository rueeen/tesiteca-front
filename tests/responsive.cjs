const assert = require("node:assert/strict");
const fs = require("node:fs");
const { navegador, instalarAPI, servidor } = require("./fixtures.cjs");
(async () => {
  const server = await servidor({ port: 5184 });
  const browser = await navegador();
  fs.mkdirSync("tests/capturas", { recursive: true });
  try {
    for (const ancho of [360, 390, 768, 1024, 1440]) {
      const page = await browser.newPage({
        viewport: { width: ancho, height: 740 },
      });
      const errores = [];
      page.on("pageerror", (e) => errores.push(e.message));
      const state = await instalarAPI(page, {
        rol: "COORDINADOR",
        baseURL: server.url,
      });
      const rutas = [
        "/",
        "/tesis/7",
        "/tesis/7/leer",
        "/subir",
        "/tesis/7/editar",
        "/mis-tesis",
        "/revision",
        "/autorizados",
        "/notificaciones",
        "/tesis/404",
        "/tesis/404/leer",
      ];
      for (const ruta of rutas) {
        await page.goto(server.url + ruta);
        await page.waitForSelector("#contenido");
        if (ruta === "/tesis/7/leer")
          await page.locator(".react-pdf__Page canvas").waitFor();
        else
          await page.waitForFunction(
            () =>
              !document.querySelector(
                '[aria-label="Cargando lista"],[aria-label="Cargando detalle"]',
              ),
          );
        await page.waitForTimeout(200);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${ancho}px ${ruta}: overflow`,
        );
        await page.screenshot({
          path: `tests/capturas/${ancho}-${ruta.replace(/\W/g, "_") || "inicio"}.png`,
          fullPage: true,
        });
      }
      if (ancho < 768) {
        await page
          .getByRole("button", { name: "Abrir menú", exact: true })
          .click();
        await page.getByRole("navigation", { name: "Principal" }).waitFor();
        assert.equal(
          await page.evaluate(() => document.body.style.overflow),
          "hidden",
        );
        await page
          .getByRole("button", { name: "Notificaciones, 0 sin leer" })
          .click();
        await page
          .getByRole("region", { name: "Centro de notificaciones" })
          .waitFor();
        await page.keyboard.press("Escape");
        assert.equal(
          await page.evaluate(() => document.body.style.overflow),
          "",
        );
        await page
          .getByRole("button", { name: "Abrir menú", exact: true })
          .click();
        await page
          .getByRole("link", { name: "Biblioteca", exact: true })
          .click();
        await page.getByRole("heading", { name: "1 resultado" }).waitFor();
        assert.equal(
          await page
            .getByRole("button", { name: "Abrir menú", exact: true })
            .getAttribute("aria-expanded"),
          "false",
        );
        await page.getByRole("button", { name: /Filtros \(/ }).click();
        await page.getByRole("dialog").waitFor();
        await page
          .getByRole("dialog")
          .getByLabel("Tipo de trabajo")
          .selectOption("TESIS");
        await page
          .getByRole("button", { name: "Aplicar", exact: true })
          .click();
        await page.waitForURL("**/*tipo=TESIS*");
        await page
          .getByRole("button", { name: "Notificaciones, 0 sin leer" })
          .click();
        await page
          .getByRole("button", {
            name: "Marcar todas como leídas",
            exact: true,
          })
          .click();
        const aviso = page
          .locator("[data-sonner-toast]")
          .filter({ hasText: "Todas las notificaciones están leídas" });
        await aviso.waitFor();
        await page.waitForTimeout(250);
        const techo = await aviso.boundingBox(),
          navbar = await page.locator(".header").boundingBox();
        assert.ok(
          techo.y >= navbar.y + navbar.height + 7,
          `Toast fuera de navbar a ${ancho}px`,
        );
        await page
          .getByRole("button", { name: "Cerrar notificaciones", exact: true })
          .click();
      }
      await page.context().clearCookies();
      await page.goto(server.url + "/login");
      await page.getByLabel("Correo institucional").waitFor();
      const campo = await page.getByLabel("Correo institucional").boundingBox();
      const boton = await page
        .getByRole("button", { name: "Recibir código" })
        .boundingBox();
      if (ancho === 360) {
        assert.ok(campo.y + campo.height <= 740, "Correo visible sin scroll");
        assert.ok(boton.y + boton.height <= 740, "Enviar visible sin scroll");
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: `tests/capturas/${ancho}-login.png`,
        fullPage: true,
      });
      assert.deepEqual(errores, []);
      await page.close();
    }
    console.log(
      "PASS responsive: rutas a 360,390,768,1024,1440; menú, filtros y login visible.",
    );
  } finally {
    await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
