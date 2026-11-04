const assert = require("node:assert/strict");
const fs = require("node:fs");
const { navegador, instalarAPI, servidor } = require("./fixtures.cjs");
async function verificarLogo(page, selector, altura) {
  const logo = page.locator(selector);
  await logo.waitFor();
  await logo.evaluate((img) => img.decode());
  const dimensiones = await logo.evaluate((img) => {
    const r = img.getBoundingClientRect(),
      css = getComputedStyle(img);
    return {
      ancho: r.width,
      alto: r.height,
      naturalAncho: img.naturalWidth,
      naturalAlto: img.naturalHeight,
      src: new URL(img.currentSrc).pathname,
      decoding: img.decoding,
      margenes: [
        css.marginTop,
        css.marginRight,
        css.marginBottom,
        css.marginLeft,
      ].map(parseFloat),
    };
  });
  assert.ok(dimensiones.src.endsWith(".webp"));
  assert.equal(dimensiones.naturalAncho, 1280);
  assert.equal(dimensiones.naturalAlto, 346);
  assert.equal(dimensiones.alto, altura);
  assert.ok(Math.abs(dimensiones.ancho / dimensiones.alto - 1280 / 346) < 0.01);
  assert.equal(dimensiones.decoding, "async");
  assert.ok(dimensiones.margenes.every((m) => m >= 8));
}
(async () => {
  const server = await servidor({ port: 5184 });
  const browser = await navegador();
  fs.mkdirSync("tests/capturas", { recursive: true });
  try {
    for (const ancho of [360, 390, 768, 1024, 1440]) {
      const page = await browser.newPage({
        viewport: { width: ancho, height: 740 },
      });
      page.setDefaultTimeout(60000);
      const errores = [];
      page.on("pageerror", (e) => errores.push(e.message));
      const state = await instalarAPI(page, {
        rol: [360, 1440].includes(ancho) ? "DIRECTOR" : "COORDINADOR",
        baseURL: server.url,
      });
      state.detalle.resumen =
        "Una investigación académica sobre conocimiento y colaboración. ".repeat(
          80,
        ) + "\n\nSegundo párrafo.";
      const rutas = [
        "/",
        "/estado",
        "/tesis/7",
        "/tesis/7/leer",
        "/subir",
        "/perfil",
        "/solicitudes",
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
        if (ruta === "/estado")
          await page.getByText("Verificado", { exact: true }).waitFor();
        if (ruta === "/tesis/7/leer")
          await page.locator(".react-pdf__Page canvas").waitFor();
        else
          await page.waitForFunction(
            () =>
              !document.querySelector(
                '[aria-label="Cargando lista"],[aria-label="Cargando detalle"]',
              ),
          );
        if (ruta === "/tesis/7") {
          const columna = page.locator(".resumen-columna");
          await columna.locator("p").first().waitFor();
          const titulo = await columna
            .getByRole("heading", { name: "Resumen", exact: true })
            .boundingBox();
          const parrafo = await columna.locator("p").first().boundingBox();
          assert.ok(
            Math.abs(titulo.x - parrafo.x) < 1,
            "Título y párrafos del resumen comparten borde izquierdo",
          );
        }
        if (["/autorizados", "/solicitudes"].includes(ruta)) {
          const lista = page.getByRole("tablist");
          const activo = lista.getByRole("tab", { selected: true });
          const colores = await activo.evaluate((el) => ({
            fondo: getComputedStyle(el).backgroundColor,
            rojo: getComputedStyle(document.documentElement)
              .getPropertyValue("--inacap-rojo")
              .trim(),
          }));
          const rojo = await page.evaluate((color) => {
            const el = document.createElement("i");
            el.style.color = color;
            document.body.appendChild(el);
            const r = getComputedStyle(el).color;
            el.remove();
            return r;
          }, colores.rojo);
          assert.notEqual(
            colores.fondo,
            rojo,
            "Pestañas segmentadas sin rojo relleno",
          );
          if (ruta === "/autorizados" && [360, 1440].includes(ancho)) {
            const boton = await page
              .getByRole("button", { name: "Agregar funcionario", exact: true })
              .boundingBox();
            const tabs = await lista.boundingBox();
            const h1 = await page
              .getByRole("heading", {
                name: "Comunidad autorizada",
                exact: true,
              })
              .boundingBox();
            assert.ok(
              tabs.y - (boton.y + boton.height) >= 12,
              "Acción y pestañas separadas al menos 12px",
            );
            const cabecera = await page
              .locator(".management-heading")
              .boundingBox();
            assert.ok(
              tabs.y - cabecera.y - cabecera.height >= 23,
              "Cabecera separada 24px de pestañas",
            );
            if (ancho === 1440)
              assert.ok(
                boton.y + boton.height / 2 >= h1.y &&
                  boton.y + boton.height / 2 <= h1.y + h1.height,
                "Acción en la franja vertical del título",
              );
            else {
              assert.ok(
                Math.abs(boton.width - cabecera.width) < 1,
                "Acción móvil a ancho completo",
              );
              assert.ok(
                Math.abs(tabs.width - cabecera.width) < 1,
                "Pestañas móviles a ancho completo",
              );
              const textos = await page
                .locator(".management-heading > div")
                .boundingBox();
              assert.ok(
                boton.y - textos.y - textos.height >= 15,
                "Acción móvil separada 16px del texto",
              );
            }
          }
        }
        await verificarLogo(
          page,
          '.header img[alt="INACAP"]',
          ancho < 768 ? 28 : 32,
        );
        await verificarLogo(page, '.site-footer img[alt="INACAP"]', 24);
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
          .selectOption("PROYECTO_INTEGRADO");
        await page
          .getByRole("button", { name: "Aplicar", exact: true })
          .click();
        await page.waitForURL("**/*tipo=PROYECTO_INTEGRADO*");
        // La URL puede cambiar antes del commit de React y su efecto de navegación.
        await page
          .getByRole("button", { name: "Quitar Tipo", exact: true })
          .waitFor();
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
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
      await verificarLogo(
        page,
        '.header img[alt="INACAP"]',
        ancho < 768 ? 28 : 32,
      );
      await verificarLogo(page, '.login-form img[alt="INACAP"]', 40);
      await verificarLogo(page, '.site-footer img[alt="INACAP"]', 24);
      const campo = await page.getByLabel("Correo institucional").boundingBox();
      const boton = await page
        .getByRole("button", { name: "Ingresar", exact: true })
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
      if ([360, 1440].includes(ancho)) {
        for (const ruta of [
          "/solicitar-acceso",
          "/recuperar",
          "/restablecer?uid=abc&token=prueba",
          "/verificar-correo?token=prueba",
        ]) {
          await page.goto(server.url + ruta);
          await page.locator(".account-form").waitFor();
          await page.waitForTimeout(150);
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${ancho}px ${ruta}: overflow`,
          );
          await page.screenshot({
            path: `tests/capturas/${ancho}-${new URL(page.url()).pathname.replace(/\W/g, "_")}.png`,
            fullPage: true,
          });
        }
        state.usuario.rol = "ADMIN";
        await page
          .context()
          .addCookies([
            { name: "refresh", value: "demo", url: server.url, httpOnly: true },
          ]);
        await page.goto(server.url + "/admin/sedes");
        await page.getByRole("switch").first().waitFor();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await page.screenshot({
          path: `tests/capturas/${ancho}-admin-sedes.png`,
          fullPage: true,
        });
      }
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
