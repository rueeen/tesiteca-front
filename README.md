# Biblioteca de Tesis · INACAP Arica

Frontend React + Vite para Django REST: cuentas institucionales con contraseña, biblioteca, carga y revisión de tesis, visor PDF y notificaciones.

## Desarrollo

Requiere Node 22.12+ y npm. Netlify usa Node 22.

```sh
npm ci
cp .env.example .env
npm run dev
```

No sobrescribas un `.env` existente. El backend se ejecuta por separado en el puerto 8000; Vite envía `/api` a ese servidor. `VITE_API_URL=/api` mantiene el mismo origen para la cookie. `VITE_WS_URL` vacío usa polling. `VITE_MAX_PDF_MB` configura el límite del PDF (30 MB por defecto en desarrollo, 20 MB en producción).

```sh
npm test
npm run build
npm run preview
```

Playwright está declarado como dependencia de desarrollo. Para Chromium se usa `CHROMIUM_PATH`, `/usr/bin/chromium` si existe, o el navegador instalado por Playwright. Si falta, ejecuta `npx playwright install chromium` y las dependencias del sistema indicadas. Las pruebas arrancan y cierran sus servidores en los puertos 5180–5184; no necesitan un dev server ni un `dist` previo. CSP construye un build nuevo antes de iniciar preview. Las capturas responsive se guardan en `tests/capturas/` y no se versionan.

## Despliegue

La guía paso a paso está en [DEPLOY.md](DEPLOY.md). Sitio: https://tesiteca.netlify.app; backend: https://rvavalencia.pythonanywhere.com.

`netlify.toml` es la fuente única del build y los redirects. Primero envía `/api/*` al backend con proxy firmado mediante `TESITECA_PROXY_SECRET`; después aplica la regla SPA. El valor del secreto se introduce solo en Netlify, con scope Runtime, y debe coincidir con `NETLIFY_PROXY_SECRET` del backend. Nunca lo agregues al repo ni a una variable `VITE_`.

`.env.production` está versionado porque solo contiene configuración pública: API `/api`, WebSocket desactivado y PDF máximo de 20 MB. `public/_headers` define CSP y las demás cabeceras. `connect-src` permite el mismo origen y `blob:` para el PDF. Para activar WS en un plan pagado, añade su origen seguro a esa directiva y configura `VITE_WS_URL`; en la cuenta gratuita actual se mantiene polling.

`/estado` es público y muestra salud, versión del backend, comprobación `via_proxy`, modo periódico y hash corto del frontend. Netlify inyecta `COMMIT_REF` durante el build; en local se muestra `dev`. Está enlazado discretamente desde el footer.

## Rutas

| Ruta                         | Función                                                |
| ---------------------------- | ------------------------------------------------------ |
| `/login`                     | Correo institucional y contraseña                      |
| `/solicitar-acceso`          | Solicitud de cuenta y verificación de RUT              |
| `/verificar-correo`          | Validación de correo (token retirado de la URL)        |
| `/recuperar`, `/restablecer` | Recuperación de contraseña                             |
| `/perfil`                    | Datos de la cuenta y cambio de contraseña              |
| `/solicitudes`               | Solicitudes para coordinador, director y administrador |
| `/admin/sedes`               | Administración de sedes (ADMIN)                        |
| `/`                          | Biblioteca, búsqueda, filtros y paginación en URL      |
| `/tesis/:id`                 | Detalle y materiales                                   |
| `/tesis/:id/leer`            | Visor PDF perezoso, sin descarga ni impresión          |
| `/subir`                     | Carga por pasos                                        |
| `/tesis/:id/editar`          | Edición según permiso de la API                        |
| `/mis-tesis`                 | Trabajos propios y reenvío                             |
| `/revision`                  | Pendientes para coordinador, director y administrador  |
| `/autorizados`               | Lista blanca e importación para revisores              |
| `/notificaciones`            | Historial paginado                                     |
| `/estado`                    | Comprobación pública del servicio                      |

## Contrato de la API

Las llamadas se hacen en las páginas y los contextos correspondientes. `src/api.js` centraliza Axios. Catálogos de carreras y tipos: objetos `{id, nombre}`; el tipo usa un código como `TESIS`. Profesores guía: array de strings; se permite escribir un nombre nuevo.

El usuario tiene `estado_cuenta`, `nombre_completo`, `email`, `rol` y relaciones anidadas `carrera`, `area` y `sede` (pueden ser null). Los listados de tesis tienen autores como strings. El detalle y las listas privadas usan `autores: [{nombre_completo, email}]`, `observacion_revision`, `estado_nombre`, `num_paginas`, `creado`, `actualizado` y `subido_por.nombre_completo`. Los flags `puede_editar`, `puede_revisar` y `puede_reenviar` controlan las acciones visibles.

La escritura multipart usa `periodo` (1 o 2, junto con `anio`), `tipo` (código), `carrera` (id), `profesor_guia` (texto), `palabras_clave` separadas por comas, `autores` como JSON, `pdf`, `repositorio_url` si está permitido y tiene valor, y `publicar` solo para revisores. No envía `sede`: el backend usa la del usuario. Los materiales usan `titulo`, `descripcion`, `solo_carrera`, `restringido`; `url` puede faltar si están restringidos. La autorización, la marca de agua y el registro de lectura corresponden al backend.

## Sesión y notificaciones

El access JWT vive únicamente en memoria; el backend guarda el refresh en cookie httpOnly, Secure y SameSite=Strict. Se borran las antiguas claves persistidas. El refresh inicial puede responder 204 sin sesión; la misma respuesta al renovar dentro del interceptor significa expiración. Refresh y logout envían `X-Requested-With: XMLHttpRequest` y el backend valida además el origen.

La renovación comparte una sola promesa ante 401 concurrentes y se programa 60 segundos antes del vencimiento con actividad reciente y pestaña visible. BroadcastChannel transmite solo eventos de login/logout. El logout voluntario termina en `/login`; una expiración conserva `next`, validado como ruta interna.

Las carreras incluyen `nivel_formacion` y `duracion_semestres`; las sedes incluyen ciudad y región. La biblioteca conserva nivel, región y sede en la URL. Los selects de sede agrupan por región en el orden geográfico del catálogo. El período se lee como `{id, nombre}` y `periodo_texto`.

El polling consulta el resumen cada 30 segundos solo con la pestaña visible; usa `desde_id` cuando hay novedades, deduplica y conserva las diez más recientes. Un 502/503/504 no muestra toast: reintenta con backoff hasta 120 segundos y vuelve a 30 tras recuperarse. Para aprobadores, el mismo ciclo actualiza `/solicitudes/resumen/` y su badge; las notificaciones `SOLICITUD_ACCESO` abren `/solicitudes`. El transporte WS por ticket se conserva para desarrollo y futuros planes que lo soporten, pero está desactivado en el build de producción.

## Marca y accesibilidad

El logo oficial está en `src/assets/marca/logo-inacap.webp`, sin alterar sus trazos ni sus colores. `LogoInacap` prioriza SVG, WebP y PNG, tanto para color como para la variante blanca; si falta la blanca, usa la de color sobre fondo claro. El isotipo de 64 × 64 se recorta del cuadrado rojo original con `node scripts/generar-isotipo.mjs` (sharp) y está versionado; no se redibuja. Las imágenes declaran su proporción intrínseca para evitar saltos de layout.

Los colores se centralizan en `src/styles/tokens.css`: el rojo oficial se usa en superficies de marca y el rojo oscuro de la escala en enlaces, etiquetas y otros textos pequeños sobre blanco o gris para mantener WCAG AA. Inter es local, los iconos son lucide y los avisos son sonner. Hay foco visible, movimiento reducido, controles móviles de 44 px y errores de formulario inline.

## Validación

`npm test` ejecuta smoke (incluidos los flujos de cuentas, solicitudes, sedes y utilidades), notificaciones, responsive, CSP, contraste y configuración Netlify. Valida la sesión, el contrato multipart, límites de tamaño, errores de proxy/timeout, backoff, controles con toasts, cinco anchos, el worker PDF, Inter local y pares de contraste WCAG AA. Netlify se valida con un parser TOML, incluidos orden, firma y ausencia de reglas heredadas.

La API se simula y las cabeceras CSP se aplican desde Playwright: Vite preview no interpreta la configuración de Netlify. Las pruebas no publican, no validan la firma real y no sustituyen las comprobaciones de [DEPLOY.md](DEPLOY.md).

El resumen se presenta como párrafos de texto, con expansión según desborde real y vista previa en la carga. **Pendiente de cotejo:** `normalizarResumen` tiene casos locales de texto con cortes de línea, pero la equivalencia exacta y el caso real de PDF requieren la función `normalizar_resumen` y los fixtures del backend, que no están incluidos en este repositorio.
