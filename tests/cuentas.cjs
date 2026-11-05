const assert = require("node:assert/strict");
const { instalarAPI } = require("./fixtures.cjs");

// También se ejecuta desde smoke.cjs: todos los contratos de cuentas usan el mismo mock.
module.exports = async function probarCuentas(browser, base) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  const state = await instalarAPI(page, { sesion: false, baseURL: base });
  try {
    await page.goto(base + "/solicitar-acceso");
    await page
      .getByLabel("Correo institucional", { exact: true })
      .fill("faro@inacapmail.cl");
    assert.equal(await page.getByLabel("Rol solicitado").count(), 0);
    await page
      .getByLabel("Correo institucional", { exact: true })
      .fill("faro@inacap.cl");
    await page.getByLabel("Rol solicitado").selectOption("DIRECTOR");
    await page
      .getByLabel("Mensaje para el administrador")
      .fill("Solicito acceso para mi equipo.");
    await page.getByLabel("Nombre completo").fill("Luis Rojas");
    await page.getByLabel("RUT", { exact: true }).fill("12345678-9");
    const sede = page.getByLabel("Sede", { exact: true });
    await sede.selectOption("1");
    assert.deepEqual(
      await sede
        .locator("optgroup")
        .evaluateAll((els) => els.map((e) => e.label)),
      ["Arica y Parinacota", "Metropolitana"],
    );
    await page.getByLabel(/^Carrera/).selectOption("1");
    await page.getByLabel("Contraseña", { exact: true }).fill("123");
    assert.equal(
      await page.getByRole("progressbar").getAttribute("value"),
      "1",
    );
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("NubeSegura!2026");
    await page
      .getByLabel("Confirmar contraseña", { exact: true })
      .fill("NubeSegura!2026");
    await page.getByLabel("RUT", { exact: true }).fill("12345678-5");
    await page
      .getByRole("checkbox", { name: /Entiendo que las tesis/ })
      .check();
    await page
      .getByRole("button", { name: "Enviar solicitud", exact: true })
      .click();
    assert.equal(
      state.registros,
      0,
      "Sin aceptar política no se envía el registro",
    );
    assert.equal(
      await page
        .getByRole("link", { name: "política de privacidad", exact: true })
        .getAttribute("target"),
      "_blank",
    );
    await page.getByRole("checkbox", { name: /He leído y acepto/ }).check();
    await page.getByLabel("RUT", { exact: true }).fill("12345678-9");
    await page
      .getByRole("button", { name: "Enviar solicitud", exact: true })
      .click();
    await page.getByText("El RUT no es válido.", { exact: false }).waitFor();
    assert.equal(state.registros, 0);
    await page.getByLabel("RUT", { exact: false }).fill("12345678-5");
    await page
      .getByRole("button", { name: "Enviar solicitud", exact: true })
      .click();
    await page
      .getByRole("heading", {
        name: "Revisa tu correo (también spam) para validar tu cuenta",
      })
      .waitFor();
    assert.equal(state.ultimoRegistro.rut, "12345678-5");
    assert.equal(state.ultimoRegistro.rol_solicitado, "DIRECTOR");
    assert.equal(state.ultimoRegistro.sede, 1);
    assert.equal("acepta" in state.ultimoRegistro, false);
    assert.equal(state.ultimoRegistro.acepta_politica, true);

    for (const estado of ["ACTIVA", "PENDIENTE_APROBACION"]) {
      state.verificarEstado = estado;
      const anteriores = state.verificaciones;
      await page.goto(base + "/verificar-correo?token=secreto-prueba");
      await page
        .getByText(
          estado === "ACTIVA"
            ? "¡Cuenta lista! Ya puedes ingresar"
            : "Correo validado.",
          { exact: false },
        )
        .waitFor();
      assert.equal(new URL(page.url()).search, "");
      assert.equal(
        state.verificaciones,
        anteriores + 1,
        "StrictMode no duplica la validación",
      );
    }
    state.verificarStatus = 400;
    await page.goto(base + "/verificar-correo?token=vencido");
    await page
      .getByRole("button", {
        name: "Reenviar correo de validación",
        exact: true,
      })
      .waitFor();
    assert.equal(new URL(page.url()).search, "");
    await page.goto(base + "/recuperar");
    await page
      .getByLabel("Correo institucional")
      .fill("desconocido@inacapmail.cl");
    await page
      .getByRole("button", { name: "Enviar enlace de recuperación" })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Si existe una cuenta activa" })
      .waitFor();
    assert.equal(state.recuperaciones, 1);
    await page.goto(base + "/restablecer?uid=abc&token=secreto-prueba");
    await page
      .getByLabel("Nueva contraseña", { exact: true })
      .fill("NubeSegura!2026");
    assert.equal(new URL(page.url()).search, "");
    await page
      .getByLabel("Confirmar contraseña", { exact: true })
      .fill("NubeSegura!2026");
    await page
      .getByRole("button", { name: "Guardar nueva contraseña", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Tu contraseña fue actualizada" })
      .waitFor();
    assert.equal(state.restablecimientos, 1);

    await page
      .context()
      .addCookies([
        { name: "refresh", value: "demo", url: base, httpOnly: true },
      ]);
    const otra = await page.context().newPage();
    const otraState = await instalarAPI(otra, { baseURL: base });
    await otra.goto(base + "/");
    await otra.getByRole("heading", { name: "1 resultado" }).waitFor();
    const refreshesAntes = otraState.refreshes;
    await page.goto(base + "/perfil");
    await page.getByText("Correo validado ✓", { exact: true }).waitFor();
    await page
      .getByLabel("Contraseña actual", { exact: true })
      .fill("Anterior!2026");
    await page
      .getByLabel("Nueva contraseña", { exact: true })
      .fill("NubeSegura!2026");
    await page
      .getByLabel("Confirmar nueva contraseña", { exact: true })
      .fill("NubeSegura!2026");
    const avisoOtra = otra.waitForResponse(
      (r) => r.url().endsWith("/auth/refresh/") && r.status() === 200,
    );
    await page
      .getByRole("button", { name: "Cambiar contraseña", exact: true })
      .click();
    await page.getByText("Contraseña actualizada", { exact: true }).waitFor();
    assert.equal(state.cambiosPassword, 1);
    await avisoOtra;
    assert.ok(
      otraState.refreshes > refreshesAntes,
      "el cambio avisa a las otras pestañas",
    );
    await otra.close();
    await page.getByRole("link", { name: "Biblioteca", exact: true }).click();
    await page.getByRole("heading", { name: "1 resultado" }).waitFor();
    assert.equal(
      state.requests.filter((r) => r.path === "/api/tesis/").at(-1).headers
        .authorization,
      `Bearer ${state.accessCambio}`,
    );
    for (const ruta of [
      "/solicitar-acceso",
      "/recuperar",
      "/restablecer",
      "/verificar-correo",
    ]) {
      await page.goto(base + ruta);
      await page.getByRole("heading", { name: "1 resultado" }).waitFor();
      assert.equal(new URL(page.url()).pathname, "/");
    }
    await page.goto(base + "/solicitudes");
    await page.getByText("No tienes permiso", { exact: false }).waitFor();

    state.usuario.rol = "ADMIN";
    state.solicitudes.forEach((s) => (s.puede_cambiar_rol = true));
    state.solicitudes[0].correo_validado = false;
    await page.goto(base + "/solicitudes");
    await page
      .getByRole("heading", { name: "Solicitante 1", exact: true })
      .waitFor();
    await page.getByRole("link", { name: /Solicitudes.*2/ }).waitFor();
    await page
      .getByRole("button", { name: "Aprobar solicitud", exact: true })
      .first()
      .click();
    let modal = page.getByRole("dialog");
    await modal.getByLabel("Rol a asignar").selectOption("COORDINADOR");
    await modal.getByLabel("Sede a asignar").selectOption("2");
    await modal.getByRole("button", { name: "Confirmar resolución" }).click();
    await page.getByRole("link", { name: /Solicitudes.*1/ }).waitFor();
    await page
      .getByText("Aprobada. Se activará cuando valide su correo.", {
        exact: true,
      })
      .waitFor();
    await page.getByRole("tab", { name: "Aprobadas", exact: true }).click();
    await page
      .getByText("Esperando validación de correo", { exact: true })
      .waitFor();
    await page.getByRole("tab", { name: "Pendientes", exact: true }).click();
    assert.equal(state.ultimaResolucion.body.rol, "COORDINADOR");
    assert.equal(state.ultimaResolucion.body.sede, 2);
    await page
      .getByRole("button", { name: "Rechazar solicitud", exact: true })
      .click();
    modal = page.getByRole("dialog");
    assert.equal(
      await modal
        .getByRole("button", { name: "Confirmar resolución" })
        .isDisabled(),
      true,
    );
    await modal
      .getByLabel("Motivo de rechazo", { exact: false })
      .fill("Faltan antecedentes.");
    await modal.getByText("20/300", { exact: true }).waitFor();
    await modal.getByRole("button", { name: "Confirmar resolución" }).click();
    await page
      .getByText("No hay solicitudes con estos criterios", { exact: true })
      .waitFor();
    assert.equal(state.ultimaResolucion.body.motivo, "Faltan antecedentes.");
    await page.getByRole("link", { name: /Solicitudes.*0/ }).waitFor();
    await page.getByRole("tab", { name: "Rechazadas" }).click();
    await page.getByRole("heading", { name: "Solicitante 2" }).waitFor();

    await page.goto(base + "/admin/sedes");
    await page.getByRole("switch", { name: "Sede Arica activa" }).waitFor();
    await page.getByRole("switch", { name: "Sede Arica activa" }).click();
    await page.waitForFunction(
      () =>
        document
          .querySelector("[role=switch]")
          ?.getAttribute("aria-checked") === "false",
    );
    assert.equal(state.sedes[0].activa, false);
    await page.getByRole("switch", { name: "Sede Arica activa" }).click();
    await page.waitForFunction(
      () =>
        document
          .querySelector("[role=switch]")
          ?.getAttribute("aria-checked") === "true",
    );
    await page.getByRole("button", { name: "Crear sede", exact: true }).click();
    modal = page.getByRole("dialog");
    await modal.getByLabel("Nombre de sede").fill("Sede de prueba");
    await modal.getByLabel("Ciudad", { exact: true }).fill("Santiago");
    await modal.getByLabel("Región").selectOption("13");
    await modal.getByRole("button", { name: "Guardar sede" }).click();
    await page
      .getByRole("button", { name: "Editar sede Sede de prueba" })
      .waitFor();
    assert.equal(state.sedes.length, 3);

    await page.goto(base + "/");
    await page.getByRole("combobox", { name: /^Región/ }).selectOption("15");
    await page.getByLabel("Sede", { exact: true }).selectOption("1");
    await page.waitForURL(/sede=1/);
    await page.getByRole("combobox", { name: /^Región/ }).selectOption("13");
    await page.waitForURL(/region=13/);
    assert.equal(new URL(page.url()).searchParams.has("sede"), false);
    await page
      .getByLabel("Sede", { exact: true })
      .locator('option[value="1"]')
      .waitFor({ state: "detached" });
    assert.equal(
      await page
        .getByLabel("Sede", { exact: true })
        .locator('option[value="1"]')
        .count(),
      0,
    );
    await page.getByLabel("Nivel de formación").selectOption("2");
    await page.waitForURL(/nivel_formacion=2/);

    await page.goto(base + "/tesis/7");
    const resumen = page.getByRole("region", { name: "Resumen de la tesis" });
    await resumen
      .getByText("Una propuesta para compartir conocimiento.", { exact: true })
      .waitFor();
    assert.equal(
      await resumen.getByRole("button", { name: "Leer más" }).count(),
      0,
    );
    await page.getByText("2026 · Primer semestre", { exact: true }).waitFor();
    state.detalle.resumen =
      "Este texto representa un párrafo extenso sobre una investigación académica. ".repeat(
        70,
      ) + "\n\n<img src=x onerror=alert(1)> Texto literal.";
    await page.reload();
    await resumen.getByRole("button", { name: "Leer más" }).click();
    assert.equal(
      await resumen
        .getByRole("button", { name: "Leer menos" })
        .getAttribute("aria-expanded"),
      "true",
    );
    assert.equal(await resumen.locator("p").count(), 2);
    assert.equal(await resumen.locator("img").count(), 0);
    await resumen.getByRole("button", { name: "Leer menos" }).click();
    assert.equal(
      await resumen
        .getByRole("button", { name: "Leer más" })
        .getAttribute("aria-expanded"),
      "false",
    );
    assert.deepEqual(errores, []);
    console.log(
      "PASS cuentas: registro, validación, recuperación, contraseña, permisos, solicitudes, sedes, período y resumen.",
    );
  } catch (e) {
    await page.screenshot({
      path: "/tmp/tesiteca-cuentas-error.png",
      fullPage: true,
    });
    throw e;
  } finally {
    await context.close();
  }
};
