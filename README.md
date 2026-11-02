# Biblioteca de Tesis · INACAP Arica

Frontend React + Vite para una API Django REST con JWT. CSS propio, catálogos dinámicos y visor PDF sin controles de descarga o impresión.

## Desarrollo

Requiere Node.js 22.12+ (validado con Node 24) y npm.

```sh
npm install
cp .env.example .env
npm run dev
```

`VITE_API_URL=http://localhost:8000/api` define la raíz de la API, sin barra final. El backend debe autorizar por CORS el origen del frontend (por defecto, puerto 5173), incluido `Authorization`. No se incluyen backend, usuarios ni datos ficticios en la aplicación. Nunca guardes secretos en variables `VITE_*`: se incorporan al código público.

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

Los permisos del frontend son una ayuda visual: el backend debe validar identidad, roles, propiedad y acceso a materiales. El PDF se pide autenticado como blob. La marca de agua y el registro de lectura corresponden al backend; ocultar descarga y desactivar el menú contextual solo disuade. Los tokens se guardan en localStorage según el encargo; protege el despliegue frente a XSS con cabeceras apropiadas.

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

En Netlify: comando `npm run build`, directorio publicado `dist`, y variable `VITE_API_URL` apuntando al backend HTTPS. `public/_redirects` mantiene las rutas de BrowserRouter. El worker pdf.js se empaqueta localmente con Vite y coincide con la versión de `react-pdf`. El visor se carga por separado para no incluir pdf.js en la carga inicial. Para otros archivos, extender la selección del visor en `VisorPage`; hoy solo se solicita PDF.
