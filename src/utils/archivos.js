const configurado = Number(import.meta.env.VITE_MAX_PDF_MB);
export const MAX_PDF_MB =
  Number.isFinite(configurado) && configurado > 0 ? configurado : 30;
export const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;
