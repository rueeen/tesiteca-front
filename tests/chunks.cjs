const assert = require("node:assert/strict");
const fs = require("node:fs");
const { navegador, instalarAPI, servidor } = require("./fixtures.cjs");
(async () => {
  const server = await servidor({ port: 5186, preview: true });
  const browser = await navegador();
  try {
    const headers = Object.fromEntries(
      fs
        .readFileSync("public/_headers", "utf8")
        .split("\n")
        .filter((l) => /^  [\w-]+:/.test(l))
        .map((l) => {
          const i = l.indexOf(":");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );
    for (const permanente of [false, true]) {
      const context = await browser.newContext();
      context.setDefaultTimeout(30000);
      const page = await context.newPage();
      const state = await instalarAPI(page, { baseURL: server.url });
      let peticionesChunk = 0,
        navegaciones = 0,
        fallar = true;
      page.on("request", (request) => {
        if (
          request.isNavigationRequest() &&
          request.frame() === page.mainFrame()
        )
          navegaciones++;
      });
      await page.route("**/*", async (route) => {
        if (
          /\/assets\/VisorPage-[^/]+\.js(?:\?.*)?$/.test(route.request().url())
        ) {
          peticionesChunk++;
          if (fallar && (permanente || peticionesChunk === 1))
            return route.fulfill({
              status: 200,
              contentType: "text/html",
              body: "<!doctype html><html><body>Versión anterior</body></html>",
            });
        }
        if (route.request().isNavigationRequest()) {
          const respuesta = await route.fetch();
          return route.fulfill({
            response: respuesta,
            headers: { ...respuesta.headers(), ...headers },
          });
        }
        return route.fallback();
      });
      await page.goto(server.url + "/tesis/7");
      await page.getByRole("link", { name: "Leer tesis", exact: true }).click();
      if (permanente) {
        await page
          .getByRole("heading", {
            name: "Hay una versión nueva de la biblioteca",
            exact: true,
          })
          .waitFor();
        await page
          .getByRole("button", { name: "Actualizar", exact: true })
          .waitFor();
        await page.waitForTimeout(400);
        assert.equal(navegaciones, 2, "solo una recarga automática");
        assert.equal(peticionesChunk, 2);
        fallar = false;
        await page
          .getByRole("button", { name: "Actualizar", exact: true })
          .click();
        await page.locator(".react-pdf__Page canvas").waitFor();
        assert.equal(navegaciones, 3, "Actualizar permite recarga manual");
      } else {
        await page.locator(".react-pdf__Page canvas").waitFor();
        assert.equal(navegaciones, 2);
        assert.equal(peticionesChunk, 2);
        assert.ok(
          Number(
            await page.evaluate(() =>
              sessionStorage.getItem("tesiteca:recarga-chunk"),
            ),
          ) > 0,
        );
      }
      const antes = navegaciones;
      state.pdfStatus = 504;
      await page
        .getByRole("link", { name: "Volver al detalle", exact: true })
        .click();
      await page.getByRole("link", { name: "Leer tesis", exact: true }).click();
      await page
        .getByRole("heading", {
          name: "El servidor tardó demasiado en responder.",
          exact: true,
        })
        .waitFor();
      state.pdfStatus = 0;
      await page
        .getByRole("button", { name: "Reintentar", exact: true })
        .click();
      await page.locator(".react-pdf__Page canvas").waitFor();
      assert.equal(
        navegaciones,
        antes,
        "el PDF se reintenta sin recargar el documento",
      );
      await context.close();
    }
    console.log(
      "PASS chunks: MIME HTML, recarga única, error persistente, Actualizar y PDF 504 con reintento sin recarga (preview con CSP).",
    );
  } finally {
    await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
