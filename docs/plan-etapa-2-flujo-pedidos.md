# Plan técnico de la etapa 2: pedidos dentro del sitio (10/11/2026)

Propuesta de Claude, aprobada en general por Lian el 9/11/2026 («estoy de acuerdo con todo»). NADA de esto está construido. Cada sub-etapa se explica y se aprueba antes de empezar. Complementa `docs/propuesta-flujo-servicio-en-sitio.md`.

## El recorrido completo (cómo quedaría)
1. **El cliente pide** (página nueva, p. ej. `/pedir-formatacao/`): elige el tamaño (hasta 30, 31 a 60 páginas, más de 60 «a consultar»), pone su WhatsApp, sube el archivo (Word o PDF, tope de tamaño), marca la casilla de privacidad y envía. Ve el cartel: «Pronto, seu documento estará pronto em até 72 horas. Você receberá uma mensagem no WhatsApp.» Arriba del formulario va la tarjeta «Quem vai te escrever no WhatsApp» (ya publicada en la página del servicio).
2. **El pedido llega a Lian:** queda guardado y aparece en su panel; además un aviso a Lian (correo o WhatsApp, a decidir).
3. **Lian (con Claude) hace el trabajo** en su computador. Sube al panel: la prévia (capa + una página, en PDF), el trabajo final (Word y PDF) y el valor final.
4. **Lian marca «pronto».** Al cliente le llega un mensaje de WhatsApp con un enlace `estudasimples.com.br/pedido/<código largo y secreto>`.
5. **El cliente abre el enlace:** ve la prévia y el valor. Paga con Pix (Mercado Pago). Solo cuando el pago está confirmado se habilita la descarga.
6. **Borrado automático** 15 días después de la entrega (ya prometido en la página y en los Términos).

## Piezas técnicas (todo en Cloudflare, donde ya está el sitio)
| Pieza | Para qué | Costo (a verificar al momento de contratar) |
|---|---|---|
| Worker (programa pequeño) | recibe pedidos, crea el pago, recibe el aviso de pago, entrega la descarga | gratis hasta 100.000 pedidos/día |
| R2 (almacén privado) | archivos del cliente y trabajos terminados | gratis hasta 10 GB; puede pedir tarjeta para activarlo |
| D1 (base de datos pequeña) | lista de pedidos, estado, valor, fechas | gratis a este volumen |
| Cloudflare Access | proteger el panel de Lian (entra con un código a su correo, sin contraseñas nuestras) | gratis hasta 50 usuarios (verificar) |
| Turnstile | anti-spam del formulario, sin captcha molesto | gratis |
| Cron del Worker | borrar archivos a los 15 días | incluido |
| Mercado Pago (Pix) | cobro; 0,99 % por venta confirmado por Lian | solo la comisión |
| WhatsApp Business Platform (API oficial) | mensaje «tu trabajo está listo» | centavos por mensaje + posible mensualidad del intermediario (cotizar) |

## Sub-etapas (cada una se aprueba antes)
- **2a. Formulario + guardado + panel:** página de pedido, R2, D1, Turnstile, panel protegido para Lian (ver pedidos, bajar el original, subir resultado, marcar «pronto»). El aviso al cliente lo manda Lian a mano desde su WhatsApp con el enlace (gratis). Cambios en Política de Privacidad y Términos (ya no es «todo en el navegador» para el servicio).
- **2b. Cobro con Mercado Pago:** botón de pago Pix en la página del pedido, confirmación automática y descarga habilitada solo tras el pago. Las claves van como Secrets de Cloudflare (las escribe Lian con `npx.cmd wrangler secret put`, nunca en el repo ni en el chat).
- **2c. Aviso automático por WhatsApp (API oficial):** plantilla aprobada por Meta, enviada al marcar «pronto».

## Cosas que Lian debe saber / decidir
- **WhatsApp API y su número actual:** un número registrado en la API oficial normalmente deja de usarse en la app normal de WhatsApp, salvo la función de «coexistencia» de Meta (verificar si está disponible para su cuenta). Puede hacer falta otro número para los avisos. Decisión pendiente antes de la 2c.
- Verificación de empresa en Meta con los datos del CNPJ (documentos que él sube; Claude nunca los escribe).
- Crear o usar su cuenta de Mercado Pago (credenciales de producción como Secrets).
- Si Cloudflare pide una tarjeta para activar R2, la escribe él.
- Notificación a Lian de pedido nuevo: ¿correo, WhatsApp o solo mirar el panel?
- Tope de tamaño de archivo y tipos permitidos.

## Seguridad (obligatorio al construir)
- Enlace del cliente con código aleatorio largo (no adivinable), sin datos personales en la URL.
- Validar tipo y tamaño del archivo en el servidor; no ejecutar nada de lo subido; nombres de archivo sanitizados.
- Descarga con enlace firmado de corta duración; solo después de confirmar el pago EN el servidor (no confiar en lo que diga el navegador).
- Aviso de pago de Mercado Pago: comprobar la firma y volver a consultar el pago a su API antes de habilitar nada.
- Límite de pedidos por teléfono/IP; Turnstile; cabeceras de seguridad en las rutas nuevas.
- Panel solo detrás de Cloudflare Access; nunca rutas de panel públicas.
- Revisión de seguridad por un agente revisor antes de publicar cada sub-etapa.

## Legal y textos
- Política de Privacidad y Términos: qué datos se recogen (WhatsApp, archivo, pedido), para qué, cuánto tiempo (15 días tras la entrega), con quién se comparte (Cloudflare, Mercado Pago, Meta/WhatsApp, Anthropic al usar Claude para formatear), base legal y contacto.
- La página del servicio deja de decir que todo es solo por WhatsApp.
- Derecho de arrepentimiento de 7 días ya publicado; mantener coherencia con el cobro automático.
- No se publica nada de esto sin pruebas, capturas y revisor independiente.
