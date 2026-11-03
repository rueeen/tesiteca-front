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
  const casos = [
    [null, ""],
    ["  Un texto corto.  ", "Un texto corto."],
    [
      "Primer párrafo.\r\n\r\nSegundo párrafo.",
      "Primer párrafo.\n\nSegundo párrafo.",
    ],
    [
      "La investiga-\nción analiza el aprendizaje\ncolaborativo y sus resultados.\n\nSe aplicaron métodos\ncuantitativos.",
      "La investigación analiza el aprendizaje colaborativo y sus resultados.\n\nSe aplicaron métodos cuantitativos.",
    ],
    ["Texto\t con   espacios\n  y un salto.", "Texto con espacios y un salto."],
    ["conoci\u00admiento", "conocimiento"],
  ];
  for (const [entrada, esperado] of casos) {
    assert.equal(normalizarResumen(entrada), esperado);
    assert.equal(
      normalizarResumen(esperado),
      esperado,
      "normalización idempotente",
    );
  }
  console.log(
    "PASS utilidades: RUT módulo 11, contraseñas y normalización de párrafos (casos locales).",
  );
};
