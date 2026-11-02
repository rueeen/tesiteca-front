const roles = {
  ESTUDIANTE: "Estudiante",
  COORDINADOR: "Coordinador",
  DIRECTOR: "Director académico",
  ADMIN: "Administrador",
};
export const nombreRol = (rol) => roles[rol] || rol;
