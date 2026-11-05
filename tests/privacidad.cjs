const assert = require("node:assert/strict");
const fs = require("node:fs");
const { instalarAPI } = require("./fixtures.cjs");
module.exports = async (browser, base) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  context.setDefaultTimeout(60000);
  const page = await context.newPage();
  const state = await instalarAPI(page, {
    baseURL: base,
    sesion: false,
    rol: "COORDINADOR",
  });
  try {
    await page.goto(base + "/privacidad");
    await page.getByText("Versión 2026-11", { exact: true }).waitFor();
    assert.equal(
      state.refreshes,
      0,
      "la política no depende de restaurar la sesión",
    );
    await page.route("**/api/auth/me/", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Expired" }),
      }),
    );
    await page.evaluate(async () => {
      const { default: api } = await import("/src/api.js");
      await api.get("/auth/me/").catch(() => {});
    });
    await page.unroute("**/api/auth/me/");
    assert.equal(
      new URL(page.url()).pathname,
      "/privacidad",
      "un 401 tardío y refresh 204 no bloquean la política pública",
    );
    assert.equal(
      await page.getByText("Tu sesión expiró", { exact: true }).count(),
      0,
    );
    assert.equal(await page.getByRole("heading", { level: 2 }).count(), 8);
    await page
      .locator("footer")
      .getByRole("link", { name: "Privacidad", exact: true })
      .waitFor();
    await page.goto(base + "/login");
    await page
      .locator(".account-links")
      .getByRole("link", { name: "Privacidad", exact: true })
      .waitFor();
    state.usuario.debe_aceptar_politica = true;
    await context.addCookies([
      { name: "refresh", value: "demo", url: base, httpOnly: true },
    ]);
    await page.goto(base + "/");
    const politica = page.getByRole("dialog", {
      name: "Actualizamos nuestra política de privacidad",
      exact: true,
    });
    await politica.waitFor();
    assert.equal(
      state.requests.some((r) => r.path === "/api/tesis/"),
      false,
      "no se cargan tesis antes del consentimiento vigente",
    );
    assert.ok(state.requests.some((r) => r.path === "/api/auth/me/"));
    assert.equal(
      await politica
        .getByRole("button", { name: "Cerrar", exact: true })
        .count(),
      0,
    );
    await page.keyboard.press("Escape");
    await page.locator(".overlay").click({ position: { x: 2, y: 2 } });
    assert.equal(await politica.isVisible(), true);
    await politica
      .getByRole("link", { name: "política de privacidad", exact: true })
      .click();
    await page.getByText("Versión 2026-11", { exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/privacidad");
    await page.goto(base + "/");
    await politica
      .getByRole("button", { name: "Aceptar", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "1 resultado", exact: true })
      .waitFor();
    assert.equal(state.politicasAceptadas, 1);
    assert.equal(await politica.count(), 0);

    await page.goto(base + "/solicitudes");
    await page.getByText("12.***.***-5", { exact: false }).first().waitFor();
    assert.equal(
      await page.getByText("12345678-5", { exact: false }).count(),
      0,
    );
    await page
      .getByRole("button", { name: "Aprobar solicitud", exact: true })
      .first()
      .click();
    let modal = page.getByRole("dialog");
    await modal.getByText("RUT: 12345678-5", { exact: true }).waitFor();
    await modal
      .getByText(
        "Visible solo para verificar identidad. Este acceso queda registrado",
        { exact: true },
      )
      .waitFor();
    assert.equal(state.identidadesConsultadas, 1);
    await modal.getByRole("button", { name: "Cerrar", exact: true }).click();
    await page.goto(base + "/autorizados");
    await page
      .getByRole("cell", { name: "12.***.***-5", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Anonimizar cuenta", exact: true })
        .count(),
      0,
    );

    await page.goto(base + "/perfil");
    await page.getByLabel("Nombre completo", { exact: true }).fill("Ana Rojas");
    await page
      .getByRole("button", { name: "Guardar nombre", exact: true })
      .click();
    await page.getByText("Nombre actualizado", { exact: true }).waitFor();
    assert.equal(state.usuario.nombre_completo, "Ana Rojas");
    await page.evaluate(() => {
      const abrir = XMLHttpRequest.prototype.open,
        enviar = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (...args) {
        this.__rutaPrivacidad = String(args[1]);
        return Reflect.apply(abrir, this, args);
      };
      XMLHttpRequest.prototype.send = function (...args) {
        if (this.__rutaPrivacidad.includes("/cuenta/mis-datos/"))
          window.__tipoDescargaPrivacidad = this.responseType;
        return Reflect.apply(enviar, this, args);
      };
    });
    const descarga = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Descargar mis datos", exact: true })
      .click();
    const archivo = await descarga;
    assert.equal(archivo.suggestedFilename(), "mis-datos-tesiteca.json");
    assert.equal(
      await page.evaluate(() => window.__tipoDescargaPrivacidad),
      "blob",
    );
    assert.equal(
      JSON.parse(fs.readFileSync(await archivo.path(), "utf8")).usuario
        .nombre_completo,
      "Ana Rojas",
    );
    assert.equal(state.datosDescargados, 1);

    state.usuario.rol = "ADMIN";
    await page.goto(base + "/autorizados");
    await page
      .getByRole("button", { name: "Anonimizar cuenta", exact: true })
      .waitFor();
    await page.getByRole("tab", { name: "Funcionarios", exact: true }).click();
    await page
      .getByRole("cell", { name: "coordinacion@inacap.cl", exact: false })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Anonimizar cuenta", exact: true })
        .count(),
      0,
      "sin usuario asociado no se ofrece anonimizar",
    );
    state.autorizados[1].usuario_id = 203;
    state.autorizados[1].estado_cuenta = "ACTIVA";
    await page.reload();
    await page.getByRole("tab", { name: "Funcionarios", exact: true }).click();
    await page
      .getByRole("button", { name: "Anonimizar cuenta", exact: true })
      .click();
    let anonimizar = page.getByRole("dialog", {
      name: "Anonimizar cuenta",
      exact: true,
    });
    const rechazoTextoLibre = await page.evaluate(async () => {
      const { default: api } = await import("/src/api.js");
      try {
        await api.post("/admin/usuarios/203/anonimizar/", {
          motivo: "Texto libre de prueba",
        });
        return { status: 200 };
      } catch (e) {
        return { status: e.response?.status, motivo: e.response?.data?.motivo };
      }
    });
    assert.deepEqual(rechazoTextoLibre, {
      status: 400,
      motivo: [
        "Usa solicitud_titular, solicitud_administrativa o retencion; no incluyas datos personales",
      ],
    });
    const inicioIntentosUI = state.anonimizarIntentos.length;
    await anonimizar
      .getByText("Esta acción es irreversible.", { exact: false })
      .waitFor();
    assert.equal(
      await anonimizar
        .getByRole("button", { name: "Confirmar anonimización", exact: true })
        .isDisabled(),
      true,
    );
    await anonimizar
      .getByRole("checkbox", {
        name: "Confirmo que entiendo que esta acción es irreversible",
        exact: true,
      })
      .check();
    assert.equal(
      await anonimizar
        .getByRole("button", { name: "Confirmar anonimización", exact: true })
        .isDisabled(),
      true,
    );
    await anonimizar
      .getByLabel("Motivo de la anonimización", { exact: true })
      .selectOption("solicitud_administrativa");
    assert.deepEqual(
      await anonimizar
        .getByLabel("Motivo de la anonimización", { exact: true })
        .locator("option")
        .evaluateAll((els) =>
          els.map((el) => ({ valor: el.value, texto: el.textContent })),
        ),
      [
        { valor: "", texto: "Selecciona un motivo" },
        {
          valor: "solicitud_titular",
          texto: "El titular lo solicitó (por correo u otro medio)",
        },
        {
          valor: "solicitud_administrativa",
          texto: "Decisión administrativa de INACAP",
        },
      ],
    );
    await anonimizar
      .getByRole("checkbox", {
        name: "Confirmo que entiendo que esta acción es irreversible",
        exact: true,
      })
      .uncheck();
    assert.equal(
      await anonimizar
        .getByRole("button", { name: "Confirmar anonimización", exact: true })
        .isDisabled(),
      true,
    );
    await anonimizar
      .getByRole("checkbox", {
        name: "Confirmo que entiendo que esta acción es irreversible",
        exact: true,
      })
      .check();
    state.anonimizarStatus = 400;
    await anonimizar
      .getByRole("button", { name: "Confirmar anonimización", exact: true })
      .click();
    await anonimizar
      .getByRole("alert")
      .filter({ hasText: "no incluyas datos personales" })
      .waitFor();
    assert.equal(
      await anonimizar
        .getByLabel("Motivo de la anonimización", { exact: true })
        .getAttribute("aria-invalid"),
      "true",
    );
    assert.equal(
      await anonimizar
        .getByLabel("Motivo de la anonimización", { exact: true })
        .getAttribute("aria-describedby"),
      "motivo-anon-error",
    );
    assert.equal(state.anonimizaciones, 0);
    state.anonimizarStatus = 409;
    await anonimizar
      .getByRole("button", { name: "Confirmar anonimización", exact: true })
      .click();
    await anonimizar
      .getByRole("alert")
      .filter({ hasText: "último administrador" })
      .waitFor();
    assert.equal(state.anonimizaciones, 0);
    assert.equal(new URL(page.url()).pathname, "/autorizados");
    state.anonimizarStatus = 0;
    let recargaAnon = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/admin/autorizados/" &&
        r.request().method() === "GET",
    );
    await anonimizar
      .getByRole("button", { name: "Confirmar anonimización", exact: true })
      .click();
    await recargaAnon;
    await page
      .getByRole("heading", {
        name: "No hay personas con estos criterios",
        exact: true,
      })
      .waitFor();
    assert.deepEqual(state.ultimoAnonimizado, {
      id: 203,
      motivo: "solicitud_administrativa",
    });
    assert.equal(
      state.autorizados.some((u) => u.id === 2),
      false,
      "el listado se recarga sin el autorizado eliminado",
    );
    await page.getByRole("tab", { name: "Estudiantes", exact: true }).click();
    await page
      .getByRole("button", { name: "Anonimizar cuenta", exact: true })
      .click();
    anonimizar = page.getByRole("dialog", {
      name: "Anonimizar cuenta",
      exact: true,
    });
    await anonimizar
      .getByLabel("Motivo de la anonimización", { exact: true })
      .selectOption("solicitud_titular");
    assert.equal(
      await anonimizar
        .getByRole("button", { name: "Confirmar anonimización", exact: true })
        .isDisabled(),
      true,
      "La confirmación se reinicia al abrir otra cuenta",
    );
    await anonimizar
      .getByRole("checkbox", {
        name: "Confirmo que entiendo que esta acción es irreversible",
        exact: true,
      })
      .check();
    recargaAnon = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/admin/autorizados/" &&
        r.request().method() === "GET",
    );
    await anonimizar
      .getByRole("button", { name: "Confirmar anonimización", exact: true })
      .click();
    await recargaAnon;
    await page
      .getByRole("heading", {
        name: "No hay personas con estos criterios",
        exact: true,
      })
      .waitFor();
    assert.deepEqual(state.ultimoAnonimizado, {
      id: 91,
      motivo: "solicitud_titular",
    });
    assert.ok(
      state.anonimizarIntentos
        .slice(inicioIntentosUI)
        .every((i) =>
          ["solicitud_titular", "solicitud_administrativa"].includes(i.motivo),
        ),
      "La UI nunca envía texto libre ni retencion",
    );
    assert.deepEqual(
      state.requests
        .filter((r) => r.path.startsWith("/api/admin/usuarios/"))
        .map((r) => r.path),
      [
        "/api/admin/usuarios/203/anonimizar/",
        "/api/admin/usuarios/203/anonimizar/",
        "/api/admin/usuarios/203/anonimizar/",
        "/api/admin/usuarios/203/anonimizar/",
        "/api/admin/usuarios/91/anonimizar/",
      ],
      "los IDs del autorizado nunca se usan para anonimizar",
    );
    await page.goto(base + "/perfil");
    await page
      .getByRole("button", { name: "Eliminar mi cuenta", exact: true })
      .click();
    modal = page.getByRole("dialog", {
      name: "Eliminar mi cuenta",
      exact: true,
    });
    await modal
      .getByLabel("Contraseña para eliminar cuenta", { exact: true })
      .fill("ClaveActual!2026");
    await modal
      .getByLabel("Escribe ELIMINAR para confirmar", { exact: true })
      .fill("BORRAR");
    assert.equal(
      await modal
        .getByRole("button", { name: "Confirmar eliminación", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(state.eliminaciones, 0);
    await modal
      .getByLabel("Escribe ELIMINAR para confirmar", { exact: true })
      .fill("ELIMINAR");
    state.eliminarStatus = 409;
    await modal
      .getByRole("button", { name: "Confirmar eliminación", exact: true })
      .click();
    await modal
      .getByRole("alert")
      .filter({ hasText: "último administrador" })
      .waitFor();
    assert.equal(new URL(page.url()).pathname, "/perfil");
    assert.ok((await context.cookies()).some((c) => c.name === "refresh"));
    const otra = await context.newPage();
    await instalarAPI(otra, { baseURL: base, rol: "ADMIN" });
    await otra.goto(base + "/");
    await otra
      .getByRole("heading", { name: "1 resultado", exact: true })
      .waitFor();
    state.eliminarStatus = 0;
    await modal
      .getByRole("button", { name: "Confirmar eliminación", exact: true })
      .click();
    await page.getByText("Tu cuenta fue eliminada", { exact: true }).waitFor();
    await page.getByLabel("Correo institucional", { exact: true }).waitFor();
    await otra.getByLabel("Correo institucional", { exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/login");
    assert.equal(new URL(page.url()).search, "");
    assert.equal(new URL(otra.url()).pathname, "/login");
    assert.equal(
      state.logouts,
      0,
      "no se vuelve a pedir logout tras eliminar la cuenta",
    );
    await otra.close();

    state.usuario.debe_aceptar_politica = true;
    await context.addCookies([
      { name: "refresh", value: "demo", url: base, httpOnly: true },
    ]);
    await page.goto(base + "/");
    await politica
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .click();
    await page.getByLabel("Correo institucional", { exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/login");
    console.log(
      "PASS privacidad: política pública, consentimiento no descartable, RUT auditado, rectificación, JSON blob, anonimización por usuario_id y eliminación 204/409 entre pestañas.",
    );
  } finally {
    await context.close();
  }
};
