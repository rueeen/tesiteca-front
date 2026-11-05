const assert = require("node:assert/strict");
const { navegador, instalarAPI, servidor } = require("./fixtures.cjs");
(async () => {
  const server = await servidor({
    port: 5180,
    env: { VITE_WS_URL: "ws://localhost:5180" },
  });
  const pollingServer = await servidor({ port: 5182 });
  const browser = await navegador();
  try {
    const page = await browser.newPage();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install();
    const state = await instalarAPI(page, { baseURL: server.url });
    state.noLeidas = 3;
    state.ultima = 9;
    state.notificaciones = Array.from({ length: 9 }, (_, i) => ({
      id: i + 1,
      tipo: "TESIS_EN_REVISION",
      titulo: `Aviso anterior ${i + 1}`,
      mensaje: "Un trabajo de la comunidad tiene novedades.",
      enlace: "/tesis/7",
      datos: {},
      leida: i >= 3,
      creada: new Date().toISOString(),
    }));
    let socket,
      conexiones = 0,
      fallar = false;
    await page.routeWebSocket("**/ws/notificaciones/**", (ws) => {
      conexiones++;
      socket = ws;
      assert.ok(
        new URL(ws.url()).searchParams.get("ticket").startsWith("ticket-"),
      );
      if (fallar) ws.close({ code: 4401, reason: "Ticket inválido" });
      else
        ws.send(
          JSON.stringify({ tipo: "resumen", no_leidas: 3, ultima_id: 9 }),
        );
    });
    await page.goto(server.url);
    await page
      .getByRole("button", { name: "Notificaciones, 3 sin leer" })
      .waitFor();
    await page
      .getByRole("button", { name: "Notificaciones, 3 sin leer" })
      .click();
    await page.getByRole("button", { name: /Aviso anterior 9/ }).waitFor();
    await page
      .getByRole("button", { name: "Cerrar notificaciones", exact: true })
      .click();
    // Congelar antes de crear el aviso, con margen para la ida y vuelta del protocolo.
    await page.clock.pauseAt(
      new Date(await page.evaluate(() => Date.now() + 60000)),
    );
    const n = {
      id: 10,
      tipo: "TESIS_APROBADA",
      titulo: "Tu tesis está aprobada",
      mensaje: "Ya puede consultarse en la biblioteca.",
      enlace: "/tesis/7",
      datos: { tesis_id: 7 },
      leida: false,
      creada: new Date().toISOString(),
    };
    state.notificaciones = [n, ...state.notificaciones];
    state.noLeidas = 4;
    state.ultima = 10;
    socket.send(JSON.stringify({ tipo: "notificacion", notificacion: n }));
    await page
      .getByRole("button", { name: "Notificaciones, 4 sin leer" })
      .waitFor();
    await page.clock.runFor(100);
    await page
      .locator("[data-sonner-toast]")
      .filter({ hasText: n.titulo })
      .waitFor();

    socket.send(JSON.stringify({ tipo: "notificacion", notificacion: n }));
    assert.equal(
      await page
        .getByRole("button", { name: "Notificaciones, 4 sin leer" })
        .count(),
      1,
    );
    await page
      .getByRole("button", { name: "Notificaciones, 4 sin leer" })
      .click();
    // Con un toast visible y el panel lleno, ninguna acción debe quedar tapada.
    const panel = page.getByRole("region", {
      name: "Centro de notificaciones",
    });
    for (const boton of await panel.getByRole("button").all())
      await boton.click({ trial: true });
    await panel
      .getByRole("link", { name: "Ver todas", exact: true })
      .click({ trial: true, timeout: 2000 });
    assert.equal(
      await page
        .locator("[data-sonner-toaster]")
        .getAttribute("data-y-position"),
      "bottom",
    );
    assert.ok(
      await page
        .locator("[data-sonner-toast]")
        .filter({ hasText: n.titulo })
        .isVisible(),
      "El toast sigue visible durante la comprobación de todos los controles",
    );
    await page.getByRole("button", { name: new RegExp(n.titulo) }).click();
    await page.waitForURL("**/tesis/7");
    assert.ok(
      state.requests.some(
        (r) => r.path === "/api/notificaciones/10/leer/" && r.method === "POST",
      ),
    );
    fallar = true;
    socket.close({ code: 4401, reason: "Ticket caducado" });
    for (let i = 0; i < 4; i++) {
      await page.clock.runFor(4500);
      await page.waitForTimeout(100);
    }
    const resumenes = state.resumenes;
    await page.clock.runFor(31000);
    await page.waitForTimeout(100);
    assert.ok(
      state.resumenes > resumenes,
      "Debe activar polling tras tres fallos",
    );
    assert.ok(conexiones >= 3);
    assert.equal(
      state.tickets,
      conexiones,
      "Cada conexión requiere un ticket nuevo",
    );
    // Sin WS configurado, el otro servidor usa polling y visibilitychange.
    const polling = await browser.newPage();
    const erroresPolling = [];
    polling.on("pageerror", (e) => erroresPolling.push(e.message));
    polling.on("console", (m) => {
      if (m.type() === "error") erroresPolling.push(m.text());
    });
    await polling.clock.install();
    const p = await instalarAPI(polling, { baseURL: pollingServer.url });
    p.notificaciones = [
      { ...n, id: 1, titulo: "Aviso inicial de polling", leida: true },
    ];
    p.ultima = 1;
    await polling.goto(pollingServer.url + "/");
    await polling.getByRole("heading", { name: "1 resultado" }).waitFor();
    await polling
      .getByRole("button", { name: "Notificaciones, 0 sin leer" })
      .click();
    await polling
      .getByRole("button", { name: /Aviso inicial de polling/ })
      .waitFor();
    await polling
      .getByRole("button", { name: "Cerrar notificaciones", exact: true })
      .click();
    const inicial = p.resumenes;
    p.notificaciones = [{ ...n, id: 2 }];
    p.noLeidas = 1;
    p.ultima = 2;
    await polling.clock.runFor(31000);
    await polling
      .getByRole("button", { name: "Notificaciones, 1 sin leer" })
      .waitFor();
    assert.ok(p.resumenes > inicial);
    await polling
      .locator("[data-sonner-toast]")
      .filter({ hasText: n.titulo })
      .waitFor();
    await polling.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => (window.__oculta ? "hidden" : "visible"),
      });
      window.__oculta = true;
    });
    const pausa = p.resumenes;
    await polling.clock.runFor(61000);
    assert.equal(p.resumenes, pausa);
    await polling.evaluate(() => {
      window.__oculta = false;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await polling.waitForTimeout(100);
    assert.ok(p.resumenes > pausa);
    assert.deepEqual(erroresPolling, []);
    // Fallos temporales: 30 -> 60 -> 120 (tope), sin toast; un OK vuelve a 30.
    p.resumenStatus = 503;
    await polling.clock.runFor(31000);
    await polling.waitForTimeout(100);
    const fallo1 = p.resumenes;
    assert.equal(await polling.locator("[data-sonner-toast]").count(), 0);
    // Dejar margen alrededor del plazo: la respuesta HTTP puede completarse dentro de runFor.
    await polling.clock.runFor(57000);
    await polling.waitForTimeout(100);
    assert.equal(p.resumenes, fallo1);
    await polling.clock.runFor(4000);
    await polling.waitForTimeout(100);
    assert.equal(p.resumenes, fallo1 + 1);
    const fallo2 = p.resumenes;
    await polling.clock.runFor(117000);
    await polling.waitForTimeout(100);
    assert.equal(p.resumenes, fallo2);
    await polling.clock.runFor(4000);
    await polling.waitForTimeout(100);
    assert.equal(p.resumenes, fallo2 + 1);
    assert.equal(await polling.locator("[data-sonner-toast]").count(), 0);
    p.resumenStatus = 0;
    await polling.clock.runFor(121000);
    await polling.waitForTimeout(100);
    const recuperado = p.resumenes;
    await polling.clock.runFor(31000);
    await polling.waitForTimeout(100);
    assert.equal(p.resumenes, recuperado + 1);
    console.log(
      "PASS notificaciones: WS, ticket nuevo, deduplicación, toast, lectura, reconexión, fallback y polling visible.",
    );
  } finally {
    await browser.close();
    await server.close();
    await pollingServer.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
