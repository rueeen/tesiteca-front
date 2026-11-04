const assert = require("node:assert/strict");
const { instalarAPI } = require("./fixtures.cjs");
module.exports = async (browser, base) => {
  for (const rol of ["COORDINADOR", "DIRECTOR", "ADMIN"]) {
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    context.setDefaultTimeout(20000);
    const page = await context.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    const state = await instalarAPI(page, { rol, baseURL: base });
    try {
      await page.goto(base + "/autorizados");
      await page
        .getByRole("heading", { name: "Importar estudiantes", exact: true })
        .waitFor();
      await page
        .getByRole("cell", { name: state.usuario.email, exact: false })
        .waitFor();
      assert.equal(state.tiposAutorizados.at(-1), "estudiantes");
      await page
        .getByRole("tab", { name: "Funcionarios", exact: true })
        .click();
      await page
        .getByRole("cell", { name: "coordinacion@inacap.cl", exact: false })
        .waitFor();
      assert.equal(state.tiposAutorizados.at(-1), "funcionarios");
      assert.equal(
        await page
          .getByRole("heading", { name: "Importar estudiantes", exact: true })
          .count(),
        0,
      );
      await page.getByText("Sin cuenta", { exact: true }).waitFor();
      if (rol === "COORDINADOR")
        assert.equal(
          await page
            .getByRole("button", { name: "Agregar funcionario", exact: true })
            .count(),
          0,
        );
      else {
        await page
          .getByRole("button", { name: "Agregar funcionario", exact: true })
          .click();
        const modal = page.getByRole("dialog");
        assert.equal(
          await modal.locator('option[value="DIRECTOR"]').count(),
          rol === "ADMIN" ? 1 : 0,
        );
        await modal
          .getByLabel("Correo institucional")
          .fill("funcionario@inacapmail.cl");
        await modal.getByLabel("Nombre completo").fill("Luis Rojas");
        await modal.getByLabel(/^Carrera/).selectOption("1");
        if (rol === "DIRECTOR") {
          assert.equal(
            await modal.getByLabel("Sede", { exact: true }).isDisabled(),
            true,
          );
          assert.equal(
            await modal
              .getByLabel(/^Carrera/)
              .locator('option[value="2"]')
              .count(),
            0,
          );
        } else
          await modal.getByLabel("Sede", { exact: true }).selectOption("2");
        await modal
          .getByRole("button", { name: "Guardar funcionario", exact: true })
          .click();
        await modal
          .getByText("Usa un correo @inacap.cl.", { exact: true })
          .waitFor();
        assert.equal(state.funcionariosCreados, 0);
        await modal
          .getByLabel("Correo institucional")
          .fill("funcionario@inacap.cl");
        await modal.getByLabel(/^RUT/).fill("12345678-9");
        await modal
          .getByRole("button", { name: "Guardar funcionario", exact: true })
          .click();
        await modal
          .getByText("El RUT no es válido.", { exact: true })
          .waitFor();
        assert.equal(state.funcionariosCreados, 0);
        await modal.getByLabel(/^RUT/).fill("12345678-5");
        if (rol === "ADMIN") {
          await modal.getByLabel(/^Rol solicitado/).selectOption("DIRECTOR");
          await modal.getByLabel(/^Área/).selectOption("1");
          assert.equal(await modal.getByLabel(/^Carrera/).count(), 0);
        }
        await modal
          .getByRole("button", { name: "Guardar funcionario", exact: true })
          .click();
        await page
          .getByText(
            "Pídele que entre a Solicitar acceso con su correo institucional",
            { exact: true },
          )
          .waitFor();
        assert.equal(
          state.ultimoFuncionario.rol,
          rol === "ADMIN" ? "DIRECTOR" : "COORDINADOR",
        );
        assert.equal(state.ultimoFuncionario.sede, rol === "ADMIN" ? 2 : 1);
        assert.equal(state.ultimoFuncionario.rut, "12345678-5");
        assert.equal("carrera" in state.ultimoFuncionario, rol !== "ADMIN");
        await page
          .getByRole("button", { name: "Copiar enlace", exact: true })
          .click();
        assert.equal(
          await page.evaluate(() => navigator.clipboard.readText()),
          base + "/solicitar-acceso",
        );
      }
      await page
        .getByRole("button", { name: "Editar", exact: true })
        .first()
        .click();
      let modal = page.getByRole("dialog");
      assert.equal(
        await modal.getByLabel(/^Rol a asignar/).count(),
        rol === "ADMIN" ? 1 : 0,
      );
      await modal
        .getByRole("button", { name: "Guardar autorización", exact: true })
        .click();
      await modal.waitFor({ state: "detached" });
      assert.equal("rol" in state.ultimoPatchAutorizado, rol === "ADMIN");
      await page.getByRole("tab", { name: "Estudiantes", exact: true }).click();
      await page
        .getByRole("heading", { name: "Importar estudiantes", exact: true })
        .waitFor();
      state.importacionStatus = 400;
      await page
        .locator("input[type=file]")
        .setInputFiles({
          name: "anterior.csv",
          mimeType: "text/csv",
          buffer: Buffer.from("email,rol,area\nana@inacapmail.cl,ESTUDIANTE,1"),
        });
      await page
        .getByRole("button", { name: "Importar archivo", exact: true })
        .click();
      const aviso = page
        .getByRole("alert")
        .filter({ hasText: "La plantilla cambió" });
      await aviso.waitFor();
      const descarga = page.waitForEvent("download");
      await aviso
        .getByRole("link", {
          name: "Descargar la nueva plantilla",
          exact: true,
        })
        .click();
      assert.equal(
        (await descarga).suggestedFilename(),
        "plantilla-estudiantes.xlsx",
      );
      assert.deepEqual(errores, []);
    } finally {
      await context.close();
    }
  }
  console.log(
    "PASS autorizados: pestañas, plantilla obsoleta, permisos, alta de funcionarios, edición y enlace de solicitud.",
  );
};
