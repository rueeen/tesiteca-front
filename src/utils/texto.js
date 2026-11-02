export const pluralizar = (cantidad, singular, plural) =>
  Number(cantidad) === 1 ? singular : plural;
