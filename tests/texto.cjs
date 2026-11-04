const assert = require("node:assert/strict");
module.exports = async function probarTexto() {
  const { normalizarResumen } = await import("../src/utils/texto.js");
  const { rutValido, formatearRut, reglasPassword, emailInstitucional } =
    await import("../src/utils/cuentas.js");
  for (const rut of ["12.345.678-5", "11111111-1", "6.000.000-K"])
    assert.equal(rutValido(rut), true, rut);
  for (const rut of ["12345678-9", "0-0", "123", "1234567-K"])
    assert.equal(rutValido(rut), false, rut);
  assert.equal(formatearRut("123456785"), "12.345.678-5");
  assert.equal(emailInstitucional("ana@inacap.cl.evil.com"), false);
  assert.equal(emailInstitucional("Ana@INACAPMAIL.CL"), true);
  assert.equal(
    reglasPassword("12345678901").every((r) => r.cumple),
    false,
  );
  assert.equal(
    reglasPassword("PerezSeguro!2026", { nombre: "Ana Pérez" }).every(
      (r) => r.cumple,
    ),
    false,
  );
  assert.equal(
    reglasPassword("NubeSegura!2026", {
      nombre: "Ana Pérez",
      email: "ana@inacapmail.cl",
    }).every((r) => r.cumple),
    true,
  );
  const casos = require("./fixtures/resumen_casos.json");
  assert.strictEqual(casos.length, 10);
  for (const { id, entrada, esperado } of casos)
    assert.strictEqual(normalizarResumen(entrada), esperado, id);
  assert.strictEqual(normalizarResumen(null), "");
  console.log(
    "PASS utilidades: RUT, contraseñas y los 10 casos oficiales del resumen.",
  );
};
