# Desplegar Tesiteca en Netlify

Frontend: https://tesiteca-inacap.netlify.app. Backend: https://rvavalencia.pythonanywhere.com. La cuenta gratuita usa notificaciones por polling; no se activan WebSockets.

## 1. Preparar el backend

El backend debe estar desplegado y su endpoint `https://rvavalencia.pythonanywhere.com/api/salud/` debe responder con `estado: ok`. El proxy firmado de Netlify debe estar admitido por el backend, incluida la validación de `x-nf-sign` con `NETLIFY_PROXY_SECRET`. Si salud exige la firma para informar `via_proxy`, comprueba esa parte después de configurar Netlify.

La cookie de refresh debe ser httpOnly, Secure, SameSite=Strict y host-only (sin Domain de PythonAnywhere), para que el navegador la acepte por el dominio de Netlify. En producción el backend debe usar `MAX_PDF_MB=20`, como el frontend.

## 2. Importar el proyecto

En Netlify selecciona **Add new site → Import an existing project → GitHub → rueeen/tesiteca-front**. La configuración se lee desde `netlify.toml`: Node 22, comando `npm run build` y directorio publicado `dist`.

Elimina cualquier configuración antigua o duplicada de redirects en el proyecto de Netlify. El repositorio usa exclusivamente `netlify.toml` para redirects; no debe existir un archivo `_redirects` que anteponga un proxy sin firma.

## 3. Nombrar el sitio

En **Site configuration → Change site name**, usa `tesiteca-inacap`.

## 4. Configurar el secreto de firma

En **Environment variables**, agrega `TESITECA_PROXY_SECRET`, con **exactamente el mismo valor** que `NETLIFY_PROXY_SECRET` del `.env` del backend. Si Netlify ofrece scopes, incluye **Runtime** y márcala como secreta. Introduce el valor únicamente en esa configuración segura, nunca en Git ni en variables con prefijo `VITE_`.

`netlify.toml` contiene solo el nombre de la variable en `signed`. Netlify añade la cabecera `x-nf-sign`; el navegador no firma peticiones ni conoce el secreto.

La configuración pública de build está versionada en `.env.production`: `/api`, WebSocket vacío y PDF máximo de 20 MB. Elimina overrides antiguos de `VITE_WS_URL` en la configuración de Netlify. Netlify proporciona `COMMIT_REF`; el build muestra sus primeros siete caracteres en `/estado` (en local, `dev`).

## 5. Generar el deploy

En **Deploys → Trigger deploy → Clear cache and deploy site**, vuelve a desplegar después de guardar el secreto y las variables. La regla `/api/*` debe aparecer antes de la regla SPA, con `force = true` y la firma configurada.

## 6. Verificar el resultado

- Abre https://tesiteca-inacap.netlify.app/estado sin iniciar sesión: debe mostrar estado `ok`, la versión del backend, proxy firmado **Verificado**, actualización periódica y el hash corto del frontend.
- Ejecuta `curl -I https://tesiteca-inacap.netlify.app/`: deben aparecer `Content-Security-Policy`, `X-Frame-Options` y `Referrer-Policy`.
- Inicia sesión con `rvalencia@inacap.cl` y revisa spam si no llega el código. Sube una tesis de prueba, apruébala y abre el visor. Comprueba la consola del navegador: no debe haber violaciones CSP.
- Prueba login, recarga (debe conservar la sesión) y visor en un teléfono real con Safari y Chrome.
- Comprueba que las notificaciones llegan por polling. Un 502, 503 o 504 aplica esperas de 60 y hasta 120 segundos, sin toast; después de recuperarse vuelve a 30 segundos.

Las pruebas automatizadas interceptan la API y simulan las cabeceras de Netlify. No validan la firma real ni publican el sitio: estas comprobaciones del deploy siguen siendo necesarias.

## Problemas comunes

- **403 en `/estado`:** el secreto puede no coincidir o faltar el scope Runtime. Corrige la configuración y vuelve a desplegar. El frontend muestra un mensaje genérico, sin detalles internos.
- **502/503:** revisa la pestaña Web de PythonAnywhere y renueva la aplicación si expiró; también puede estar reiniciándose.
- **504 al subir:** revisa **Mis tesis** antes de reintentar, porque el backend podría haber guardado el PDF aunque el proxy agotara el tiempo. Un reintento puede responder que el PDF ya fue subido.
- **Pantalla en blanco al entrar directo a `/tesis/5`:** revisa la regla SPA en `netlify.toml`.
- **Fuente o PDF bloqueados:** revisa `public/_headers`. pdf.js necesita `blob:` en `connect-src` además del worker local/blob; Inter se sirve desde el propio sitio.

Si en el futuro un plan pagado permite WebSocket, configura el destino real en `VITE_WS_URL` y añade ese origen seguro a `connect-src` en `_headers` antes de desplegar. No habilites un comodín ni cambies la configuración actual de polling mientras siga el plan gratuito.
