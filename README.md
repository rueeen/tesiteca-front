# Biblioteca de Tesis · INACAP Arica

Frontend React + Vite para una API Django REST con JWT. CSS propio, catálogos dinámicos y visor PDF sin controles de descarga o impresión.

## Desarrollo

Requiere Node.js 22.12+ (validado con Node 24) y npm.

```sh
npm install
cp .env.example .env
npm run dev
```

`VITE_API_URL=/api` define la raíz de la API, sin barra final. Vite mantiene el mismo origen mediante el proxy `/api` al backend del puerto 8000. No se incluyen backend, usuarios ni datos ficticios en la aplicación. Nunca guardes secretos en variables `VITE_*`: se incorporan al código público.

Para una instalación reproducible usa `npm ci`. El servidor de desarrollo escucha en `0.0.0.0`. Las peticiones de API se hacen desde el navegador; en despliegue configura una URL HTTPS accesible para los usuarios.

## Rutas

| Ruta                | Función                                              |
| ------------------- | ---------------------------------------------------- |
| `/login`            | Correo institucional y código de 6 dígitos           |
| `/`                 | Biblioteca, búsqueda, filtros y paginación en la URL |
| `/tesis/:id`        | Detalle, materiales y acciones por estado            |
| `/tesis/:id/leer`   | Visor PDF con páginas perezosas                      |
| `/subir`            | Carga por pasos                                      |
| `/tesis/:id/editar` | Edición de autor o revisor                           |
| `/mis-tesis`        | Trabajos propios                                     |
| `/revision`         | Pendientes: coordinador, director, admin             |
| `/autorizados`      | Lista blanca e importación: mismos roles             |

## Contrato de API usado

Las páginas consumen el contrato de la corrección `fix/contrato-api`; `src/api.js` centraliza Axios y una sola promesa de renovación JWT.

- Usuario de `/auth/me/` y login: `nombre_completo`, `email`, `rol`, `carrera: CarreraMini|null`, `area: Mini|null`, `sede: Mini|null`.
- Catálogos: carreras y tipos son arrays de objetos; el tipo usa un código como `TESIS` o `PROYECTO_TITULO` en `id`. Profesores guía es un array de strings; el formulario sugiere nombres pero permite escribir uno nuevo.
- Listado de tesis: paginación DRF `{count, next, previous, results}`, autores como strings, `tipo` y `carrera` como objetos, `profesor_guia` string y `palabras_clave` lista de strings.
- Detalle y listas privadas: autores `[{nombre_completo, email}]`, `sede`, `observacion_revision`, `estado_nombre`, `num_paginas`, `creado`, `actualizado`, `subido_por.nombre_completo`. Los flags `puede_editar`, `puede_revisar` y `puede_reenviar` controlan las acciones visibles.
- Multipart de creación/edición: `titulo`, `resumen`, `profesor_guia` (texto), `tipo` (código), `carrera` (id), `anio`, `semestre`, `palabras_clave` como string separado por comas, `autores` como JSON con `nombre_completo`, `pdf`, `repositorio_url` solo si tiene valor y está permitido, `publicar` solo para revisores. No se envía `sede`: el backend usa la del usuario.
- Carrera bloqueada para estudiante/coordinador; director elige entre carreras de su área y administrador entre todas.
- Materiales: `titulo`, `descripcion`, `tipo`, `solo_carrera`, `restringido`, `creado`; `url` puede faltar cuando el material está restringido.
- Autorizados: `nombre_completo`, `carrera` anidada (o null), `area`, `sede`, `rol` y `activo`; las escrituras de relaciones usan IDs.
- Búsqueda: `search`, `en_contenido`, `carrera`, `tipo`, `anio_desde`, `anio_hasta`, `profesor_guia`, `palabra_clave`, `con_repositorio`, `ordering`, `page`, `page_size`.
- Acciones: `POST /tesis/:id/reenviar/`, `aprobar/`, `rechazar/` (con `{observacion}`); `DELETE /tesis/:id/`. Importar: `POST /admin/autorizados/importar/`, multipart `archivo`.

Los permisos del frontend son una ayuda visual: el backend debe validar identidad, roles, propiedad y acceso a materiales. El PDF se pide autenticado como blob. La marca de agua y el registro de lectura corresponden al backend; ocultar descarga y desactivar el menú contextual solo disuade. El access se mantiene en memoria y el refresh en cookie httpOnly del backend.

## Validación

```sh
npm run build
# En otra terminal, con npm run dev ejecutándose:
node tests/smoke.cjs
```

La prueba requiere `playwright` disponible en Node y Chromium en `/usr/bin/chromium` (o `CHROMIUM_PATH`). En una máquina local puedes instalar Playwright con `npm install --no-save --package-lock=false playwright` y configurar la ruta de Chromium. La prueba usa una API interceptada en el navegador: valida login, renovación concurrente, búsqueda y URL, controles por rol, detalle con material restringido, payload multipart exacto, profesores nuevos, edición, reenvío, catálogos con fallos parciales, límite de errores y ancho móvil. No sustituye las pruebas contra Django. Para validar el flujo real, usa el backend en su rama `fix/contrato-api` y sus datos `seed_demo --con-ejemplos --reset-ejemplos`: sube como estudiante, comprueba Mis tesis, aprueba como coordinador y verifica biblioteca, detalle y visor. Este repositorio no contiene el backend ni ejecuta su seed. No se verificó correo real, autorización real, marca de agua o importación real sin backend.

## Producción y Netlify

```sh
npm run build
npm run preview
```

En Netlify: comando `npm run build`, directorio publicado `dist`, y variable `VITE_API_URL=/api` usando el proxy. `public/_redirects` mantiene las rutas de BrowserRouter. El worker pdf.js se empaqueta localmente con Vite y coincide con la versión de `react-pdf`. El visor se carga por separado para no incluir pdf.js en la carga inicial. Para otros archivos, extender la selección del visor en `VisorPage`; hoy solo se solicita PDF.

## Sesión por cookie httpOnly y JWT en memoria

El frontend requiere el nuevo contrato de autenticación: `POST /auth/verificar-codigo/` y `POST /auth/refresh/` devuelven `{access, usuario}`. El backend crea y renueva la cookie de refresh **httpOnly**, `Secure` en producción, `SameSite=Strict` y con path que incluya `/api/auth/`. El frontend nunca lee ni escribe esa cookie desde JavaScript. El access vive solo en una variable de módulo; las antiguas claves `access` y `refresh` se eliminan de localStorage al iniciar.

Axios usa credenciales y `X-Requested-With: XMLHttpRequest`. El backend debe validar esta cabecera en refresh/logout, controlar Origin y borrar la cookie al cerrar sesión. El encabezado no sustituye la validación de origen del servidor. Se restaura la sesión antes de mostrar las rutas y se renueva el access una sola vez ante peticiones 401 concurrentes. El refresh proactivo usa `exp` y actividad reciente (cinco minutos) con la pestaña visible. `BroadcastChannel('tesiteca-auth')` transmite solo eventos de login/logout, nunca tokens. El destino `next` admite únicamente rutas del mismo origen.

En desarrollo usa `VITE_API_URL=/api`: Vite envía `/api` a `http://localhost:8000`, con el mismo origen desde el punto de vista del navegador. Inicia Django por separado; no se incluye en este repositorio.

## Notificaciones

`VITE_WS_URL` vacío activa polling cada 30 segundos, únicamente con la pestaña visible, y una recarga al volver a ella. El contexto consulta `/notificaciones/resumen/` y `/notificaciones/` con `desde_id` cuando cambia `ultima_id`. Marca lecturas con `/notificaciones/:id/leer/` y `/notificaciones/leer-todas/`.

Con una URL WS, pide un ticket nuevo a `/notificaciones/ticket/` en cada intento y conecta a `/ws/notificaciones/?ticket=…`. Envía ping cada 25 segundos y acepta mensajes `resumen`, `notificacion` y `pong`. Reconecta con espera exponencial y jitter hasta 30 segundos; después de tres fallos activa polling y prueba el WS cada cinco minutos. La sesión y sus transportes se limpian al salir. Los enlaces de notificaciones se validan como rutas internas. El contador y los últimos diez elementos aparecen en la campana; `/notificaciones` ofrece el historial paginado.

## Marca y accesibilidad

Agrega únicamente los archivos oficiales en `src/assets/marca/`: `logo-inacap.svg`, `logo-inacap-blanco.svg` e `isotipo-inacap.png`. `LogoInacap` descubre los archivos sin impedir el build cuando faltan; mientras tanto usa el texto INACAP. No se han recreado logotipos. Si aparece el isotipo, se configura como favicon; sin él se conserva el favicon que ya tenga la página. Los archivos oficiales aún no están incluidos.

Los colores están centralizados en `src/styles/tokens.css`; el rojo requiere confirmación con el manual de marca. Inter se sirve desde los assets del proyecto, sin Google Fonts. Iconos lucide, avisos sonner, foco visible, movimiento reducido y controles móviles de al menos 44 px. Los formularios muestran sus validaciones inline.

## Configuración de Netlify antes de publicar

- Sustituye `USUARIO` por la cuenta real de PythonAnywhere en `public/_redirects`, `public/_headers` y, si hay WS, en `VITE_WS_URL` (ver `.env.production.example`). El marcador es intencional y **no sirve como destino real de despliegue**.
- Mantén el proxy `/api/*` antes de la regla SPA. Configura `VITE_API_URL=/api`. La cookie debe ser host-only (sin Domain de PythonAnywhere) para que el navegador la acepte a través del dominio de Netlify.
- CSP permite recursos locales, Inter local, el worker PDF local/blob y el destino WSS configurado. Se añadió `blob:` a `connect-src` porque pdf.js lee el object URL descargado por Axios; la prueba CSP detectó que esa lectura se bloqueaba con solo `self`. `style-src 'unsafe-inline'` es necesario para estilos dinámicos de sonner y las dimensiones del visor; no se habilitó eval ni scripts inline. Actualiza solo el destino WSS cuando confirmes su host.
- Vite preview **no interpreta** los archivos `_headers` ni `_redirects` de Netlify. La prueba CSP de abajo inicia preview y añade las mismas cabeceras a las respuestas HTML desde Playwright para verificar font, PDF y toasts. La aplicación real de esas cabeceras debe comprobarse también después del deploy.

## Pruebas de esta corrección

Con Vite ejecutándose en 5173:

```sh
npm run build
node tests/smoke.cjs
node tests/notificaciones.cjs
node tests/responsive.cjs
node tests/contraste.cjs
node tests/csp.cjs
```

Playwright ≥ 1.48 y Chromium son requisitos del ejecutor de pruebas (ver arriba). `notificaciones.cjs` inicia un Vite adicional en 5180 con WS de prueba; `csp.cjs` inicia preview en 5181. Ambos cierran los procesos que crean. El smoke comprueba memoria/cookie, recarga de sesión, single-flight, cierre entre pestañas, `next`, multipart, PDF y un toast al aprobar. La prueba de notificaciones cubre WS, tickets, deduplicación, lectura, backoff y fallback a polling visible. La responsive visita las rutas a 360, 390, 768, 1024 y 1440 px, comprueba menú y filtros, y guarda imágenes ignoradas por Git en `tests/capturas/`. La de contraste calcula nueve pares principales con umbral WCAG AA 4.5:1.

Estas pruebas interceptan la API. La emisión real de cookies, el correo, los tickets reales, el WS desplegado y la política de Netlify requieren el backend y un despliegue reales para su validación final.
