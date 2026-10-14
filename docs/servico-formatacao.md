# Servicio pago "Formatação ABNT de TCC" (Etapa 8)

Página: `/formatacao-abnt-tcc/` (`src/formatacao-abnt-tcc/index.html`, estilos en `src/assets/css/servico.css`, preguntas en `conteudo/faq-servico.json`). No hay pago en el sitio: todos los botones abren WhatsApp con el mensaje escrito.

## Dónde se cambia cada cosa
Todo en `site.config.json`, bloque `servico`, y luego `npm run build`:

| Quiero cambiar... | Clave | Dónde aparece |
|---|---|---|
| Número de WhatsApp | `whatsapp` (solo dígitos, con 55) | Los 3 botones y el enlace `wa.me` |
| Cómo se ve el número | `whatsappExibicao` | Sección final de la página |
| Mensaje que llega escrito, **uno por página de origen** | `mensagens` (`servico`, `inicio`, `capa`, `folha`, `sumario`) | Se codifica solo en la URL `wa.me/...?text=`; cada mensaje identifica el sitio y la página ("Olá! Vim pelo site Estuda Simples (gerador de capa) e quero formatar…") |
| Plazo | `prazo` ("48 a 72 horas") | Portada, "Como funciona", "Prazo e preços", FAQ, meta description, datos estructurados |
| Precio hasta 30 páginas | `precos.ate30` (número) | Portada, tarjetas, FAQ, title, datos estructurados (`Offer.price`) |
| Precio de 31 a 60 páginas | `precos.de31a60` | Igual |

"Más de 60 páginas: a consultar" es texto fijo de la página (no es un precio). Las franjas ("hasta 30", "31 a 60") están en el HTML: si cambian, hay que editar también `index.html` y `faq-servico.json`.

`build.mjs` convierte la configuración en marcadores `{{WHATSAPP_URL}}`, `{{WHATSAPP_EXIBICAO}}`, `{{PRAZO}}`, `{{PRECO_ATE30}}`, `{{PRECO_31A60}}` y las versiones numéricas `{{PRECO_ATE30_NUM}}` / `{{PRECO_31A60_NUM}}` (para el JSON-LD). Ningún precio, plazo ni número está escrito a mano en el código fuente (lo comprueba `pruebas/probar-servico.mjs`). El "R$ 80" lleva espacio sin quebra para no partirse en dos líneas.

## De dónde viene cada cliente
Las herramientas y la portada enlazan a la página del servicio con `?origem=capa` (o `folha`, `sumario`, `inicio`). `assets/js/servico.js` lee ese parámetro y cambia el enlace de todos los botones de WhatsApp (los que llevan `data-whatsapp`) por el mensaje de esa página; el build deja los enlaces en `<script type="application/json" id="whatsapp-origens">`. Reglas:
- Sin `?origem`, con un valor desconocido o sin JavaScript, vale el mensaje de la página del servicio (`servico`).
- Desde el menú y el pie (sin origen) llega el mensaje `servico`.
- La página de origen de cada bloque sale de `ORIGEM_POR_PAGINA` en `build.mjs` (`{{ORIGEM}}` en el partial). Para una herramienta nueva: agregar su carpeta ahí y su mensaje en `site.config.json`.
- No se guarda nada: la información viaja solo en el texto del mensaje, que el visitante puede editar (la Política de Privacidade lo explica).

## Contenido
Secciones, en orden: portada con resumen de precios, "O que está incluído", "O que não está incluído", "O que enviar", "Como funciona" (5 pasos), "Prazo e preços", "Cancelamento e reembolso", "Privacidade", FAQ (14 preguntas, con `FAQPage`) y cierre con botón. Datos estructurados: `Service` (con las dos ofertas con precio), `FAQPage` y `BreadcrumbList`. No hay reseñas ni calificaciones.

La página **no tiene espacios de anuncio** (es una página comercial; así se evita mezclar el botón de WhatsApp con publicidad).

## Texto de apoyo que no es de la norma
Se verificó en manuales de bibliotecas que las versiones vigentes son ABNT NBR 10520:2023 (citaciones) y NBR 6023:2018 (referencias, versión corregida 2:2020). Las demás (14724:2024, 6024:2012, 6027:2012) ya estaban documentadas en `docs/norma-abnt-*.md`.

## "Antes e depois" (después de la portada)
Sección `#antes-e-depois`: dos páginas hechas **solo con HTML y CSS** (0 imágenes, casi no pesan), con contenido inventado (Silva, Souza, Editora Exemplo). A la izquierda una página desordenada (márgenes estrechos y desiguales, letras de tipos, tamaños y colores mezclados, título en minúsculas y sin número, referencia fuera de la norma); a la derecha la misma página en ABNT (márgenes 3/3/2/2 cm, Arial 12, espaciado 1,5, justificado, "2 METODOLOGIA", referencia "SOBRENOME, Nome. Título. Cidade: Editora, ano."). Cada hoja es `role="img"` con `aria-label`, y debajo hay una lista de 4 observaciones numeradas igual que las marcas de la hoja. Las medidas de la hoja usan `cqw` (12 pt = 2,016 cqw), así que todo escala con el ancho. Muestra la mitad de arriba de una A4 y, para caber, junta un trecho del texto con la lista de referencias (la página lo avisa: en un trabajo real las referencias empiezan en página nueva). Los estilos están en `servico.css` ("Antes e depois").

## Barra fija del WhatsApp (solo celular, solo esta página)
`#barraWhatsapp` (en el HTML de la página, antes del pie) es `position: fixed` solo con `max-width: 767px`; en tablet y computador es `display: none`. `servico.js` la muestra (`.visivel`) solo cuando **ningún otro** botón de WhatsApp (`a[data-whatsapp]` sin `data-barra`) está en pantalla (IntersectionObserver). Sin JavaScript queda oculta. Usa el mismo mensaje según el origen. Para no tapar el pie, `body.com-barra .site-footer` tiene `padding-bottom` extra solo en celular. `prefers-reduced-motion` quita la animación.

## Bloque en las herramientas
`src/partials/convite-servico.html` ("Prefere receber o trabalho inteiro formatado? Conheça nosso serviço.") se incluye con `{{include:convite-servico}}` en las páginas de capa, folha de rosto y sumário, dentro del formulario, **después de los botones de descarga y de la nota sobre los datos guardados** (separado de ellos por esa nota y por una línea). Está lejos de los espacios de anuncio (mínimo 150 px, hoy 200–400 px; lo comprueba la prueba). Si se agrega una herramienta nueva, copiar el include.

## Menú y pie
`header.html`: enlace "Formatação de TCC" (en pantallas de hasta 400 px dice solo "Formatação" y desaparecen "Ferramentas"/"Sobre" para que quepa; en ≤ 760 px se oculta "Ferramentas"). `footer.html`: "Formatação ABNT de TCC". El sitemap lo genera `build.mjs` solo (cualquier carpeta con `index.html`).

## Privacidad y términos
- **Política de Privacidade:** sección nueva 2.4 "Serviço pago de formatação de trabalhos" (ancla `#servico-formatacao`): qué se trata (WhatsApp, archivo, manual, comprobante del Pix), para qué, IA, borrado al terminar, base legal; actualizadas las secciones 5 (terceros: WhatsApp/Meta, proveedores de IA, banco), 6 (conservación), 8 (menores) y 10, el resumen y la fecha. La antigua 2.4 (publicidad) pasó a 2.5.
- **Termos de Uso:** sección 5 nueva (servicio pago: alcance, solo la forma, sin garantía de aprobación); las siguientes se renumeraron.
- **Sobre** y **Contato** mencionan el servicio (Contato ya no dice que no se hacen trabajos por encargo).

## Reglas del servicio (decididas por el dueño, 13/10/2026)
1. Entrega en **Word y PDF**.
2. El plazo (48 a 72 horas) **empieza al confirmar el pago por Pix y recibir todos los archivos necesarios**.
3. **1 ronda de ajustes** incluida. Un error de formatación del dueño se corrige gratis siempre. Si el estudiante cambia el contenido después de la entrega: nuevo presupuesto.
4. Los archivos se **borran 15 días después de la entrega**. La conversación de WhatsApp y el comprobante del Pix: "el tiempo necesario y el que exija la ley".
5. IA: la Política dice que se usan herramientas de IA y que los proveedores pueden estar fuera de Brasil; **no afirma** que no guarden ni entrenen con los archivos.
6. **Reembolso integral** (por Pix) si el estudiante cancela antes de que se empiece a formatear o si no se cumple el plazo del presupuesto. La devolución se hace por Pix **en hasta 7 días**. Después de la entrega no hay reembolso, pero sí la ronda de ajustes. Todo "sin perjuicio" de los derechos del Código de Defesa do Consumidor.
7. Primera persona del singular en todo el sitio (la prueba busca "nosso/nós/vocês/tratamos/usamos…").

## Advertencia legal sobre el reembolso (leer)
"Después de la entrega no hay reembolso" no puede anular el **art. 49 del CDC**: en contrataciones hechas fuera del establecimiento (internet, WhatsApp) el consumidor puede arrepentirse dentro de 7 días y pedir la devolución; que se aplique o no a un servicio ya entregado y personalizado se discute y depende del caso. Tampoco el **art. 20** (servicio con vicio: reejecución, devolución o descuento proporcional). Por eso los Termos de Uso dicen que la regla no aparta esos derechos. Recomendación: que un abogado o un contador revise esa sección antes de que haya muchos clientes.

## Pendiente
- Reembolso: desde cuándo cuentan los 7 días (hoy el texto dice solo "em até 7 dias") y cómo se avisa que ya se empezó a formatear (hoy: "antes de eu começar").
- Datos de la empresa (CNPJ/CPF) en los Termos, si algún día se necesita para facturar.
