# Etapa 2 (pedidos en el sitio): puesta en marcha (10/11/2026)

Estado: TODO está programado y probado EN LOCAL, en la rama `etapa-2-pedidos` (no está en `main`, así que el sitio publicado no cambió). Falta crear las piezas en la cuenta de Cloudflare de Lian y conectar el Mercado Pago. Mientras no se haga, NO se une a `main` (la configuración pide un identificador real de base de datos).

## Qué hay en la rama
- `pedidos/` el Worker (programa en Cloudflare): `src/index.mjs` (rutas /api/*), `cliente.mjs` (pedir, estado, pagar, descargar, aviso del Mercado Pago), `admin.mjs` (panel de Lian), `access.mjs` (verifica Cloudflare Access), `mp.mjs` (Mercado Pago), `util.mjs`, `schema.sql` (base de datos).
- Páginas: `/pedir-formatacao/` (formulario), `/pedido/#código` (página del cliente), `/painel/` (panel de Lian). Las tres son `noindex` y no están en el sitemap.
- `wrangler.jsonc`: el mismo Worker `estudasimples` sirve el sitio y, SOLO para `/api/*`, corre el código.
- Pruebas: `pruebas/probar-pedidos.mjs` (66 comprobaciones del servidor) y `pruebas/probar-pedidos-ui.mjs` (25 comprobaciones en Chrome). Se corren desde la carpeta `pruebas/`. En este PC, con poca memoria libre, a veces Wrangler falla al arrancar sin culpa del código: se repite.
- Textos legales ya preparados en la rama: Política de Privacidad, Términos, FAQ y página del servicio.

## Qué NO está verificado (y no se puede verificar sin las cuentas reales)
- El Mercado Pago REAL: las pruebas usan un Mercado Pago de mentira. Hay que hacer un pago de prueba (modo de pruebas del Mercado Pago, o un pago real de R$ 5 a uno mismo) antes de abrir al público.
- Cloudflare Access real: la firma se probó con una llave de prueba, no con la de Cloudflare.
- Que la ruta `/api/*` del Worker funcione en el dominio real junto con los archivos estáticos (debería, es la forma recomendada por Cloudflare).
- El aviso (webhook) del Mercado Pago llegando de verdad. El sistema tiene una segunda vía: la página del cliente consulta al Mercado Pago al volver del pago.

## Pasos de Lian (los clave los escribe él; Claude nunca ve claves)
1. En el PC, abrir una terminal en la carpeta del proyecto y entrar a Cloudflare: `npx.cmd wrangler login` (se abre el navegador; Lian acepta).
2. Crear la base de datos: `npx.cmd wrangler d1 create estudasimples-pedidos` → copiar el `database_id` que muestra y pasárselo a Claude (no es secreto), o pegarlo en `wrangler.jsonc` en lugar de `REEMPLAZAR-CON-EL-ID-REAL`.
3. Crear las tablas: `npx.cmd wrangler d1 execute estudasimples-pedidos --remote --file=pedidos/schema.sql`
4. Crear el almacén de archivos: `npx.cmd wrangler r2 bucket create estudasimples-pedidos` (Cloudflare puede pedir una tarjeta para activar R2: la escribe Lian; hay un nivel gratis de 10 GB).
5. Mercado Pago: en su cuenta, crear una aplicación (Tus integraciones) y copiar la CLAVE DE ACCESO de producción (Access Token). Guardarla en Cloudflare con: `npx.cmd wrangler secret put MP_ACCESS_TOKEN` (la escribe él cuando lo pida la terminal). Nunca en el chat ni en el repositorio.
6. Cloudflare Access (protege el panel): en el panel de Cloudflare → Zero Trust → Access → Applications → Add → Self-hosted. Dominio `estudasimples.com.br`, rutas `/painel*` y `/api/admin*` (dos entradas). Política: permitir solo el correo de Lian (código por correo). Al terminar, copiar el «Application Audience (AUD) tag» y el nombre del equipo (`algo.cloudflareaccess.com`) y ponerlos en `wrangler.jsonc` (`ACCESS_AUD`, `ACCESS_TEAM_DOMAIN`, `ADMIN_EMAIL`). Sin esto el panel queda CERRADO (por diseño).
7. Anti-spam opcional (Turnstile): si se activa, se crea un widget gratis en Cloudflare y se pone `TURNSTILE_SECRET` como secreto; el formulario necesita también la «site key» (pendiente de añadir al formulario).
8. Con todo lo anterior, Claude une la rama a `main`, hace pruebas en vivo (pedido de prueba de principio a fin con un pago real pequeño), pasa un revisor independiente, avisa a los buscadores y anota en la Bitácora.
9. Opcional para más adelante (2c): aviso automático por WhatsApp con la API oficial (hoy el aviso lo manda Lian con un toque, desde su propio WhatsApp: el panel arma el mensaje).

## Cómo funciona el trabajo diario de Lian
1. Entra a `/painel/` (código al correo). Ve los pedidos nuevos.
2. Baja el original, lo formatea con Claude, y en el panel sube: prévia (PDF), trabajo en Word, trabajo en PDF, y escribe el valor final.
3. «Marcar como pronto» → aparece el botón «Abrir WhatsApp con a mensagem» (un toque) que le manda el enlace al cliente.
4. El cliente ve la prévia, paga por Pix en el Mercado Pago, y la descarga se abre sola.
5. A los 15 días todo se borra solo (limpieza diaria). Si hay reembolso: en el panel «Marcar como reembolsado» y se devuelve el dinero en el Mercado Pago.
