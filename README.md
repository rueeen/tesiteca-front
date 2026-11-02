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

Las llamadas están directamente en las páginas; `src/api.js` centraliza Axios y una sola promesa de renovación JWT. El contexto carga `GET /auth/me/`. Se usan los endpoints del encargo; dado que no se proporcionó un esquema OpenAPI ni un backend ejecutable, los siguientes nombres de campos y acciones son supuestos explícitos que deben contrastarse con Django:

- Login: `{email}`, verificación `{email, codigo}`; respuesta `{access, refresh, usuario}` o `{tokens: {access, refresh}, usuario}`. Usuario: `id`, `nombre`, `email`, `rol`, `carrera`.
- Catálogos: `/catalogos/carreras/`, `/catalogos/tipos/`, `/catalogos/profesores-guia/`: arrays o `{results}` de `{id, nombre}`. Carrera incluye `permite_repositorio`.
- Tesis: listas DRF `{count, results}`; identificadores en escritura, objetos `{id, nombre}` en lectura para `carrera`, `tipo`, `profesor_guia`. Campos: `titulo`, `anio`, `semestre`, `resumen`, `palabras_clave`, `autores`, `estado`, `observacion`, `fecha_creacion`, `fecha_publicacion`, `numero_paginas`, `sede`, `es_autor`, `subido_por`, `tiene_repositorio`, `materiales`.
- Búsqueda: `search`, `en_contenido`, `carrera`, `tipo`, `anio_desde`, `anio_hasta`, `profesor_guia` (nombre), `palabra_clave`, `con_repositorio`, `ordering`, `page`, `page_size`.
- Multipart: `pdf`, `autores` y `palabras_clave` serializados como JSON, `repositorio`, `publicar_directamente`. Crear `POST /tesis/`, editar `PATCH /tesis/:id/`.
- Acciones: `POST /tesis/:id/reenviar/`, `aprobar/`, `rechazar/` (con `{observacion}`); `DELETE /tesis/:id/`.
- Materiales: `tipo` (`REPOSITORIO`, `ARCHIVO`, `ENLACE`), `nombre`, `url`, `restringido`, `carrera`. Acceso devuelve `{url}`.
- Lista blanca: `GET /admin/autorizados/`, `PATCH /admin/autorizados/:id/` con `{activo}`, `POST /admin/autorizados/importar/` con campo multipart `archivo`; respuesta `{total, creados, actualizados, errores: [{fila, motivo}]}`.

Los permisos del frontend son una ayuda visual: el backend debe validar identidad, roles, propiedad y acceso a materiales. El PDF se pide autenticado como blob. La marca de agua y el registro de lectura corresponden al backend; ocultar descarga y desactivar el menú contextual solo disuade. Los tokens se guardan en localStorage según el encargo; protege el despliegue frente a XSS con cabeceras apropiadas.

## Validación

```sh
npm run build
# En otra terminal, con npm run dev ejecutándose:
node tests/smoke.cjs
```

La prueba requiere `playwright` disponible en Node y Chromium en `/usr/bin/chromium` (o `CHROMIUM_PATH`). En una máquina local puedes instalar Playwright con `npm install --no-save --package-lock=false playwright` y configurar la ruta de Chromium. La prueba usa una API interceptada en el navegador: valida login, renovación concurrente, búsqueda y URL, controles de rol, detalle, envío multipart y ancho móvil. No sustituye las pruebas contra Django. No se verificó correo real, autorización real, marca de agua o importación real sin backend.

## Producción y Netlify

```sh
npm run build
npm run preview
```

En Netlify: comando `npm run build`, directorio publicado `dist`, y variable `VITE_API_URL` apuntando al backend HTTPS. `public/_redirects` mantiene las rutas de BrowserRouter. El worker pdf.js se empaqueta localmente con Vite y coincide con la versión de `react-pdf`. El visor se carga por separado para no incluir pdf.js en la carga inicial. Para otros archivos, extender la selección del visor en `VisorPage`; hoy solo se solicita PDF.
