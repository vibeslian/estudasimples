# Espacios para anuncios (AdSense)

## Etapa 18: AdSense preparado y APAGADO (21/10/2026)
Todo está listo, pero **no se carga nada del Google** hasta que se encienda. Qué existe hoy, con `anuncios.adsenseAtivo = false`:
- **`/ads.txt`** (lo genera `build.mjs` desde `anuncios.adsense.cliente`): una línea, `google.com, pub-…, DIRECT, f08c47fec0942fa0`. El ID del editor es el mismo de la cuenta que usa feriasclaras.com.br; es público (está en cualquier `ads.txt`).
- **`<meta name="google-adsense-account">`** en el `<head>` de todas las páginas: la etiqueta de verificación del AdSense. No carga scripts ni usa cookies.
- Nada más: ni script del Google, ni aviso de cookies, ni `<ins>`, ni `localStorage`. Las páginas quedan idénticas a las de antes salvo esa etiqueta, el `id="anuncios"` de la sección 4 de la Política y el CSS nuevo (comprobado comparando todo el HTML con el commit anterior).

### Cómo se enciende (cuando AdSense apruebe el sitio)
1. En adsense.google.com → **Sites** → añadir `estudasimples.com.br` y verificarlo (la etiqueta ya está). Esperar la aprobación.
2. En **Anúncios → Por bloco de anúncios** crear un bloque *Anúncio de display* **responsivo** (texto) y uno **300×600** (lateral). Copiar el ID de cada uno (10 números).
3. En `site.config.json` → `anuncios.adsense.blocos`: pegar `conteudo` y `lateral`; `legalAtualizadoEm`: la fecha de ese día; `anuncios.adsenseAtivo`: `true`. `node build.mjs`.
4. En el panel desactivar los **anuncios automáticos** (y *anchor* / *vignette*): solo bloques manuales.
El build se **detiene** con un mensaje claro si falta un ID de bloque o la fecha.

### Qué cambia al encender
- **Aviso de cookies** (`src/partials/footer.html`, `assets/js/anuncios.js`; CSS `.aviso-anuncios` en `components.css`): fijo abajo (no mueve la página, CLS 0), dos botones del mismo tamaño: *Recusar personalizados* / *Aceitar anúncios personalizados*. **Nada del Google se carga antes de elegir.** Recusar → `requestNonPersonalizedAds = 1` (los anuncios siguen, sin personalización; el Google aún puede usar cookies de medición y antifraude, y el aviso y la Política lo dicen). La elección va en `localStorage` (clave `es-anuncios`, valor `<elección>@<fecha de legalAtualizadoEm>`; no es cookie). Si cambia `legalAtualizadoEm` (la Política cambió), el aviso **vuelve a preguntar**. Sin `localStorage` (modo privado) el aviso vuelve en cada página: nunca se asume el consentimiento.
- **Rodapé:** enlace *Preferências de anúncios* en todas las páginas: reabre el aviso (Esc lo cierra si ya hay elección; el foco del teclado vuelve al enlace). Si la persona cambia de idea, la página se recarga con la nueva elección.
- **Espacios:** cada `div.anuncio` recibe su `<ins class="adsbygoogle">` (el espacio con oferta propia no lo recibe). El rótulo "Anúncio" aparece solo si el Google llenó el bloque; el espacio sigue reservando su altura (sin saltos). Los espacios ocultos (lateral en celular) no piden anuncio.
- **Política y Termos:** los trozos entre `<!--ADS:OFF-->…<!--/ADS:OFF-->` / `<!--ADS:ON-->…<!--/ADS:ON-->` cambian a presente (el aviso, el `localStorage`, "Preferências de anúncios", sección 4 con ancla `#anuncios`). "Última atualização" = la fecha más reciente entre afiliados y AdSense. Esas marcas sirven para cualquier página.
- Para un texto que cambie según el AdSense en otra página, usar las mismas marcas (el build las resuelve y no dejan rastro).

### Pruebas
`node probar-adsense.mjs` (desde `pruebas/`; no necesita el servidor :3000): apagado (nada del Google), encendido con IDs de ejemplo, errores del build y navegador con el Google **interceptado** (nunca se contacta). 128 comprobaciones. **No prueba que el Google sirva anuncios de verdad**: eso solo se ve en el sitio publicado, ya aprobado.
- Limitaciones conocidas: el aviso es propio, no un CMP certificado por Google (TCF); para visitas de la UE/Reino Unido Google podría limitar anuncios (el sitio es solo para Brasil). Con anuncios que no llenan o con bloqueador de anuncios el espacio reservado queda vacío (se decidió reservar la altura para CLS 0; si se prefiere colapsar, `.anuncio:has(ins[data-ad-status="unfilled"]) { display: none; }`, sabiendo que mueve el contenido de abajo).
- Lo que sigue sin verificar hasta encender: que los bloques se llenen, el rendimiento real con anuncios (volver a medir con Lighthouse; bajará, es normal) y el comportamiento del aviso en un iPhone/Android reales.

---

## Ofertas propias y AdSense (Etapa 8.5)
Mientras no haya AdSense, algunos espacios reservados muestran una **oferta propia** (hoy solo el servicio de formatação; después, el Kit TCC). Todo se decide en `site.config.json` → `anuncios`:
- `espacos`: para cada espacio, `"adsense"` (queda libre, como antes) u `"oferta:formatacao"`.
- `ofertas.formatacao.ativa`: `true/false`. Si se apaga, **todos sus espacios vuelven al AdSense** sin tocar nada más.
- Textos de la oferta por página (`capa`, `folha`, `sumario`), sello ("Serviço do Estuda Simples") y botón.
Reglas que el build comprueba y detiene si se rompen (con un mensaje en portugués): **máximo una oferta propia por página** y solo en `meio-1`, `meio-2`, `lateral` o `entre-secoes` (nunca `abaixo-da-ferramenta`, que queda al lado de la herramienta). Hoy: `capa-meio-1`, `folha-meio-1` y `sumario-meio-1`. La portada y los demás espacios (`abaixo-da-ferramenta`, `meio-2`, `lateral`) quedan libres para el AdSense.
- La oferta se ve distinta de un anuncio de Google: tarjeta con los colores del sitio y el sello "Serviço do Estuda Simples"; **no usa la clase `.anuncio`** (por eso no cuenta como espacio de anuncio ni se ve como caja punteada con `?ads=preview`).
- Siempre queda lejos de los botones de descarga y de la lista del sumário (están en el texto de explicación; la prueba exige > 300 px).
- **Cómo convivirán con AdSense:** (1) Hoy: 3 ofertas propias + 10 espacios libres. (2) Al activar AdSense: poner `"ativa": false` en la oferta para devolverle todos sus espacios, o dejarla en un espacio por página y ceder los demás (cambiar `"oferta:formatacao"` por `"adsense"` donde se quiera). (3) Una oferta propia no necesita el aviso de cookies; el AdSense sí (ver la lista de abajo). (4) Los espacios con oferta no deben tener el script de AdSense: el HTML de cada espacio lo decide el build.

## Cómo están ahora
Los espacios existen en las páginas, pero **no hay ningún anuncio activo ni ningún script de publicidad**. Son bloques vacíos que reservan altura para que, cuando lleguen los anuncios reales, el contenido no se mueva.

- Para ver dónde están, agrega `?ads=preview` al final de la dirección (por ejemplo `http://localhost:3000/gerador-de-capa-abnt/?ads=preview`). Aparecen como cajas con borde punteado y el texto "Anúncio". Con esa opción la altura de la página no cambia (comprobado en las pruebas).
- El script que lee `?ads=preview` está en `src/partials/head-common.html`; los estilos, en `src/assets/css/components.css` (sección "Espaços para anúncios").

## Dónde están
| Página | Espacio (`data-slot`) | Dónde |
|---|---|---|
| Generador de capa | `capa-abaixo-da-ferramenta` | Debajo del aviso "Importante", con 64 px de margen. Los botones de descarga quedan a más de 300 px de distancia. |
| Generador de capa | `capa-meio-1`, `capa-meio-2` | Entre las secciones de la explicación. |
| Generador de capa | `capa-lateral` | Columna lateral de 300×600 que sigue al hacer scroll, solo en pantallas de 1180 px o más. Oculta en celular. |
| Generador de folha de rosto | `folha-abaixo-da-ferramenta`, `folha-meio-1`, `folha-meio-2`, `folha-lateral` | Mismas reglas y mismos tamaños que la capa. |
| Generador de sumário | `sumario-abaixo-da-ferramenta`, `sumario-meio-1`, `sumario-meio-2`, `sumario-lateral` | Mismas reglas y mismos tamaños. Esta herramienta tiene una lista editable larga: los anuncios van siempre después del aviso "Importante", nunca entre los ítems ni junto a los botones. |
| Inicio | `inicio-entre-secoes` | Entre "Como funciona" y "Vem aí". |
| Formatação ABNT de TCC | (ninguno) | Es una página comercial con botón de WhatsApp: sin anuncios. |

Reglas que se cumplen en las tres herramientas (y que verifica `pruebas/probar-contenido.mjs`): ningún anuncio encima del formulario, ninguno junto a los botones de descarga (mínimo 150 px; hoy más de 300 px) ni dentro de la herramienta, ninguno en la portada. Las páginas legales, Sobre y Contacto no tienen anuncios.

## Alturas reservadas
280 px en los espacios de contenido (cabe 300×250, 336×280 y 728×90) y 600 px en la columna lateral (300×600). Si el anuncio real es más bajo, quedará aire; si es más alto, el contenido se moverá: por eso conviene no usar tamaños mayores a estos.

## Antes de activar AdSense (lista original; los puntos 2, 3 y parte del 4 ya están hechos en la Etapa 18, ver arriba)
1. **Cuenta y aprobación** en Google AdSense con el dominio `estudasimples.com.br`. AdSense revisa que haya contenido propio, Política de Privacidade, Sobre y Contato (ya existen).
2. **Aviso de cookies con opción de recusar anúncios personalizados.** La Política de Privacidade ya promete que se mostrará antes de los anuncios personalizados (sección 4). Hay que implementarlo (por ejemplo con la herramienta de consentimiento de Google, o una propia) **antes** de poner el script de AdSense.
3. **Archivo `ads.txt`**: lo genera `build.mjs` desde `anuncios.adsense.cliente` (no crear `src/ads.txt`: el build lo sobrescribiría).
4. **Script de AdSense** en `head-common.html` y, dentro de cada `<div class="anuncio" data-slot="...">`, el bloque `<ins class="adsbygoogle" ...>` con su propio ID de bloque. Quita `aria-hidden="true"` de esos `div` cuando tengan un anuncio real.
5. Actualizar la Política de Privacidade (fecha y, si usas una herramienta de consentimiento, su nombre).
6. Volver a medir con Lighthouse: los anuncios bajarán el Performance (es normal).

Políticas de AdSense a tener presentes: no colocar anuncios cerca de botones que puedan inducir a clics accidentales (por eso están lejos de "Baixar PDF/Word"), no pedir ni insinuar clics, y no hacer clic en tus propios anuncios.

## Observaciones para AdSense (anotadas al terminar la Etapa 6; no se hizo nada de esto todavía)
Cosas de la estructura actual que conviene decidir o ajustar al activar AdSense:

1. **Anuncios automáticos.** En el panel de AdSense, desactiva los *auto ads* (o excluye las dos páginas de herramientas) y usa solo los bloques manuales de arriba. Los automáticos pueden insertar un anuncio entre el formulario y la vista previa o junto a "Baixar PDF/Word", y eso rompe nuestra regla de distancia y la política de AdSense contra clics accidentales. Lo mismo para los formatos *anchor* (barra fija abajo) y *vignette* (pantalla completa): en una herramienta que se usa en el celular molestan y pueden tapar los botones.
2. **Huecos si no hay anuncio.** Los espacios reservan 280 px (600 px en la columna lateral) aunque AdSense no llene el bloque, y un hueco vacío de 280 px se ve raro. Al activar, decide: dejar el hueco (sin saltos de diseño) o colapsarlo solo cuando AdSense marque `data-ad-status="unfilled"` (por ejemplo con `.anuncio:has(ins[data-ad-status="unfilled"]) { display: none; }`). Colapsar mueve una vez el contenido de abajo, pero solo a quien no recibe anuncio.
3. **Alturas.** Para que no haya saltos, usa tamaños fijos que quepan en 280 px de alto (300×250, 336×280, 728×90) o bloques adaptables con `min-height` igual al reservado. Nada más alto, salvo la columna lateral (300×600).
4. **Columna lateral "pegada" (`position: sticky`).** Es un recurso de CSS de la página, no un formato de AdSense. Antes de activarla, revisa en el Centro de políticas de AdSense que los anuncios que acompañan el scroll estén permitidos; si hay duda, quita el `sticky` de `.anuncio--lateral` en `components.css` (la columna queda igual, pero fija en su lugar).
5. **`aria-hidden="true"`.** Los `div.anuncio` lo llevan mientras están vacíos. Quítalo de cada bloque que tenga un anuncio real y deja la etiqueta "Anúncio" visible encima (AdSense lo pide en varios formatos).
6. **Contenido para el rastreador de AdSense.** La explicación de cada herramienta está en el HTML estático (no depende de JavaScript) y la herramienta se dibuja con JavaScript: es lo correcto para la política de "contenido propio y suficiente". Las páginas legales, Sobre, Contacto y la 404 siguen sin anuncios y así deben quedar (poco texto).
7. **`robots.txt` y el rastreador de AdSense.** El `robots.txt` administrado por Cloudflare bloquea solo rastreadores de IA y deja `User-agent: *` con `Allow: /`, así que `Mediapartners-Google` (el rastreador de AdSense) y Googlebot pasan (verificado el 13/10/2026). Si cambias la política de bots de IA en Cloudflare, vuelve a mirar `https://estudasimples.com.br/robots.txt`.
8. **`ads.txt`.** Lo genera `build.mjs` (no hace falta `src/ads.txt`). Tras publicar, comprueba que `https://estudasimples.com.br/ads.txt` devuelva 200 con la línea de AdSense.
9. **Consentimiento y política.** El aviso de cookies sigue pendiente (ver arriba). La Política de Privacidade ya declara las estadísticas de Cloudflare y el `sessionStorage` de las herramientas; al activar AdSense hay que añadir el nombre de la herramienta de consentimiento y actualizar la fecha.
10. **Carga y rendimiento.** Carga el script de AdSense con `async`, solo después del consentimiento, y considera cargar los bloques de más abajo cuando el visitante se acerque (IntersectionObserver) para no tocar el LCP de las herramientas. Vuelve a medir con Lighthouse después de activar.
11. **Cabecera `X-Frame-Options: DENY`** (en `_headers`). No afecta a los anuncios (ellos van dentro de nuestra página, no al revés). Si una herramienta de AdSense necesitara mostrar tu página dentro de un marco, habría que relajarla solo para eso.
12. **Content-Security-Policy.** Hoy no hay. Si algún día se agrega, hay que incluir los dominios de AdSense.
13. **Interacción de la lista del sumário.** La lista de ítems tiene botones pequeños (subir, bajar, nivel, quitar) que se usan muchas veces seguidas. Por eso ningún anuncio puede ir cerca de ellos ni dentro del formulario; los anuncios automáticos (punto 1) deben quedar excluidos de esta página.
14. **Páginas nuevas.** Cada herramienta nueva debe copiar las cuatro posiciones de anuncio (debajo de la herramienta, dos en el texto y una lateral) y añadirse a la lista de herramientas de la sección de anuncios de `probar-contenido.mjs`.
15. **Bloque del servicio.** En las tres herramientas, el texto "Prefere receber o trabalho inteiro formatado? Conheça nosso serviço" va dentro del formulario, después de la nota sobre los datos guardados (que separa el bloque de los botones de descarga). No es un anuncio y no debe confundirse con uno: nunca pegarlo a un espacio de anuncio (la prueba exige ≥ 150 px).
16. **Guías (Etapa 10).** Las 14 páginas de `/guias/` usan tres espacios (`guia-meio-1`, `guia-meio-2`, `guia-lateral`) con las mismas reglas: reservados, lejos de botones, sin hueco visible si no hay anuncio. Las ofertas propias no se muestran en ellos.
17. **Interruptor general (Etapa 10).** `site.config.json` → `anuncios.adsenseAtivo`. Con `false` (hoy) los espacios existen en el HTML pero no ocupan lugar (clase `anuncio--desligado`, `display: none`): ningún hueco en blanco; la columna lateral desaparece y el texto queda en una columna. Con `true` reservan su altura (280 px en el texto, 600 px en la lateral, la de `?ads=preview` se ve igual). Al activar AdSense: cambiar a `true`, quitar `aria-hidden` de los bloques con anuncio real y volver a correr `probar-contenido.mjs`. `?ads=preview` sigue mostrando dónde irán, también apagado.
