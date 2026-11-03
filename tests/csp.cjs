// Vite preview no aplica _headers de Netlify: el test los aplica a la respuesta HTML.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { navegador, instalarAPI, servidor } = require("./fixtures.cjs");
(async () => {
  const server = await servidor({ port: 5181, preview: true });
  const browser = await navegador();
  try {
    const page = await browser.newPage();
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
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) =>
        window.__csp.push({
          directiva: e.violatedDirective,
          recurso: e.blockedURI,
        }),
      );
    });
    await page.route("**/*", async (route) => {
      if (route.request().isNavigationRequest()) {
        const r = await route.fetch();
        return route.fulfill({
          response: r,
          headers: { ...r.headers(), ...headers },
        });
      }
      return route.fallback();
    });
    await instalarAPI(page, { baseURL: server.url, rol: "COORDINADOR" });
    await page.goto(server.url + "/tesis/7/leer");
    await page.locator(".react-pdf__Page canvas").waitFor();
    const marca = page.locator('.header img[alt="INACAP"]');
    await marca.evaluate((img) => img.decode());
    assert.ok(
      new URL(await marca.getAttribute("src"), server.url).pathname.endsWith(
        ".webp",
      ),
    );
    assert.equal(await marca.getAttribute("width"), "1280");
    assert.equal(await marca.getAttribute("height"), "346");
    const favicon = await page.locator('link[rel="icon"]').getAttribute("href");
    assert.ok(
      favicon.startsWith("data:image/png;") ||
        new URL(favicon, server.url).pathname.endsWith(".png"),
    );
    const tamanoIcono = await page.evaluate(async () => {
      const img = new Image();
      img.src = document.querySelector('link[rel="icon"]').href;
      await img.decode();
      return { ancho: img.naturalWidth, alto: img.naturalHeight };
    });
    assert.deepEqual(tamanoIcono, { ancho: 64, alto: 64 });
    await page.evaluate(() => document.fonts.ready);
    assert.ok(
      await page.evaluate(() => document.fonts.check('16px "Inter Variable"')),
    );
    assert.deepEqual(await page.evaluate(() => window.__csp), []);
    await page.goto(server.url + "/revision");
    await page.getByRole("button", { name: "Aprobar", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Tesis aprobada" })
      .waitFor();
    assert.deepEqual(await page.evaluate(() => window.__csp), []);
    console.log(
      "PASS CSP: preview con cabeceras Netlify, worker PDF, Inter local y toast.",
    );
  } finally {
    await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
