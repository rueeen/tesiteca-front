const assert = require("node:assert/strict");
const { navegador, instalarAPI, servidor } = require("./fixtures.cjs");
(async () => {
  const server = await servidor({
    port: 5180,
    env: { VITE_WS_URL: "ws://localhost:5180" },
  });
  const browser = await navegador();
  try {
    const page = await browser.newPage();
    await page.clock.install();
    const state = await instalarAPI(page, { baseURL: server.url });
    state.noLeidas = 3;
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
          JSON.stringify({ tipo: "resumen", no_leidas: 3, ultima_id: 0 }),
        );
    });
    await page.goto(server.url);
    await page
      .getByRole("button", { name: "Notificaciones, 3 sin leer" })
      .waitFor();
    const n = {
      id: 1,
      tipo: "TESIS_APROBADA",
      titulo: "Tu tesis está aprobada",
      mensaje: "Ya puede consultarse en la biblioteca.",
      enlace: "/tesis/7",
      datos: { tesis_id: 7 },
      leida: false,
      creada: new Date().toISOString(),
    };
    state.notificaciones = [n];
    state.noLeidas = 4;
    state.ultima = 1;
    socket.send(JSON.stringify({ tipo: "notificacion", notificacion: n }));
    await page
      .getByRole("button", { name: "Notificaciones, 4 sin leer" })
      .waitFor();
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
    await page.getByRole("button", { name: new RegExp(n.titulo) }).click();
    await page.waitForURL("**/tesis/7");
    assert.ok(
      state.requests.some(
        (r) => r.path === "/api/notificaciones/1/leer/" && r.method === "POST",
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
    const p = await instalarAPI(polling);
    await polling.goto("http://localhost:5173/");
    await polling.getByRole("heading", { name: "1 resultados" }).waitFor();
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
    console.log(
      "PASS notificaciones: WS, ticket nuevo, deduplicación, toast, lectura, reconexión, fallback y polling visible.",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
